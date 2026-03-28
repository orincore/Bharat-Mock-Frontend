// jsPDF and autoTable are loaded dynamically at call-time so they never
// land in the initial JS bundle (saves ~500 KB on every page load).
let _jsPDF: any = null;
let _autoTable: any = null;

async function getJsPDF() {
  if (!_jsPDF) {
    _jsPDF = (await import('jspdf')).default;
    _autoTable = (await import('jspdf-autotable')).default;
  }
  return { jsPDF: _jsPDF, autoTable: _autoTable };
}

interface ExamData {
  exam: {
    id: string;
    title: string;
    description?: string;
    duration?: number;
    total_questions?: number;
    total_marks?: number;
    exam_categories?: { name: string; slug: string };
    exam_subcategories?: { name: string; slug: string };
    exam_difficulties?: { name: string };
  };
  sections: Array<{
    id: string;
    name: string;
    description?: string;
    display_order?: number;
    section_order?: number;
  }>;
  questions: Array<{
    id: string;
    section_id: string;
    question_text?: string;
    text?: string;
    question_type?: string;
    type?: string;
    marks?: number;
    negative_marks?: number;
    correct_answer?: string;
    explanation?: string;
    image_url?: string;
    display_order?: number;
    question_order?: number;
    options?: Array<{
      id: string;
      option_text?: string;
      text?: string;
      is_correct: boolean;
      display_order?: number;
      option_order?: number;
      image_url?: string;
    }>;
  }>;
}

export interface PdfOptions {
  showAnswers: boolean;
  showExplanations: boolean;
  language: 'en' | 'hi';
  showWatermark: boolean;
  showCoverPage: boolean;
  headerText: string;
  footerText: string;
  /** Full A4 first page banner — rendered as page 1 before all content */
  coverBanner: string | null;
  /** 20% height strip overlaid at the bottom of every content page */
  footerBanner: string | null;
  /** Full A4 last page banner — appended as the final page */
  backCoverBanner: string | null;
}

interface ImageAsset {
  dataUrl: string;
  width: number;
  height: number;
}

let brandLogoAsset: ImageAsset | null = null;
let watermarkLogoAsset: ImageAsset | null = null;

const convertBlobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const createAssetFromDataUrl = (dataUrl: string): Promise<ImageAsset> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ dataUrl, width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });

const loadLocalAsset = async (path: string): Promise<ImageAsset> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error('Failed to load asset');
  }
  const dataUrl = await convertBlobToDataUrl(await response.blob());
  return createAssetFromDataUrl(dataUrl);
};

const createWatermarkAsset = (asset: ImageAsset): Promise<ImageAsset> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const targetWidth = 420;
      const ratio = targetWidth / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.08;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
    };
    img.onerror = reject;
    img.src = asset.dataUrl;
  });

const getBrandAssets = async () => {
  if (!brandLogoAsset) {
    try {
      brandLogoAsset = await loadLocalAsset('/logo.png');
    } catch (error) {
      console.error('Failed to load brand logo:', error);
    }
  }

  if (!watermarkLogoAsset && brandLogoAsset) {
    try {
      watermarkLogoAsset = await createWatermarkAsset(brandLogoAsset);
    } catch (error) {
      console.error('Failed to create watermark:', error);
    }
  }

  return {
    brandLogo: brandLogoAsset,
    watermarkLogo: watermarkLogoAsset
  };
};

const stripHtml = (value?: string) => {
  if (!value) return '';
  const temp = document.createElement('div');
  temp.innerHTML = value;
  return temp.textContent || '';
};

const normalizeText = (value?: string) =>
  stripHtml(value)
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const formatOptionText = (value?: string) =>
  normalizeText(value)
    .replace(/^['"`•·\-]+/, '')
    .replace(/^\.+/, '')
    .trim();

const pxToMm = (px: number) => px * 0.264583;

const DEFAULT_PDF_OPTIONS: PdfOptions = {
  showAnswers: true,
  showExplanations: true,
  language: 'en',
  showWatermark: true,
  showCoverPage: true,
  headerText: '',
  footerText: '',
  coverBanner: null,
  footerBanner: null,
  backCoverBanner: null,
};

export async function generateExamPDF(examData: ExamData, pdfOptions: Partial<PdfOptions> = {}): Promise<void> {
  const opts: PdfOptions = { ...DEFAULT_PDF_OPTIONS, ...pdfOptions };
  const { exam, sections, questions } = examData;
  
  const { jsPDF, autoTable } = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;
  const { brandLogo, watermarkLogo } = await getBrandAssets();

  const addWatermark = () => {
    if (!opts.showWatermark) return;
    if (watermarkLogo) {
      const baseWidth = pxToMm(watermarkLogo.width);
      const baseHeight = pxToMm(watermarkLogo.height);
      const maxWidth = pageWidth * 0.92;
      const maxHeight = pageHeight * 0.92;
      const scale = Math.min(maxWidth / baseWidth, maxHeight / baseHeight, 2.2);
      const watermarkWidth = baseWidth * scale;
      const watermarkHeight = baseHeight * scale;
      const x = (pageWidth - watermarkWidth) / 2 + pageWidth * 0.08;
      const y = (pageHeight - watermarkHeight) / 2 + pageHeight * 0.05;
      doc.addImage(
        watermarkLogo.dataUrl,
        'PNG',
        x,
        y,
        watermarkWidth,
        watermarkHeight,
        undefined,
        'FAST',
        45
      );
    } else {
      const originalFontSize = doc.getFontSize();
      const originalColor = doc.getTextColor();
      doc.setFontSize(58);
      doc.setTextColor(200, 200, 200);
      doc.text('Bharat Mock', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45
      });
      doc.setFontSize(originalFontSize);
      doc.setTextColor(originalColor as any);
    }
  };

  const addHeader = () => {
    const logoHeight = 16;
    if (brandLogo) {
      const originalHeightMm = pxToMm(brandLogo.height);
      const originalWidthMm = pxToMm(brandLogo.width);
      const ratio = logoHeight / originalHeightMm;
      const logoWidth = originalWidthMm * ratio;
      doc.addImage(
        brandLogo.dataUrl,
        'PNG',
        margin,
        yPosition,
        logoWidth,
        logoHeight,
        undefined,
        'FAST'
      );
      yPosition += logoHeight + 6;
    } else {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Bharat Mock', margin, yPosition + 10);
      yPosition += 16;
    }
  };

  const addExamInfoTable = () => {
    const examDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const examTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: [
        ['Exam Date', examDate],
        ['Exam Time', examTime],
        ['Exam Name', exam.title || 'N/A'],
        ['Duration', exam.duration ? `${exam.duration} minutes` : 'N/A'],
        ['Total Questions', exam.total_questions?.toString() || 'N/A'],
        ['Total Marks', exam.total_marks?.toString() || 'N/A']
      ],
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  };

  // ── Pre-load footer banner to get its natural aspect ratio ────────────────
  interface LoadedImage {
    dataUrl: string;
    format: 'JPEG' | 'PNG' | 'WEBP';
    naturalWidth: number;
    naturalHeight: number;
  }

  const loadImage = async (url: string): Promise<LoadedImage> => {
    // Strategy 1: fetch → blob → FileReader (no canvas, no CORS taint)
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const mime = blob.type || '';
      const format: LoadedImage['format'] =
        mime.includes('png') ? 'PNG' :
        mime.includes('webp') ? 'WEBP' :
        'JPEG';
      const dataUrl = await convertBlobToDataUrl(blob);
      const dims = await new Promise<{ w: number; h: number }>((res, rej) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = rej;
        img.src = dataUrl;
      });
      return { dataUrl, format, naturalWidth: dims.w, naturalHeight: dims.h };
    } catch (fetchErr) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('No canvas context')); return; }
            ctx.drawImage(img, 0, 0);
            const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
            const format: LoadedImage['format'] = ext === 'png' ? 'PNG' : ext === 'webp' ? 'WEBP' : 'JPEG';
            resolve({
              dataUrl: canvas.toDataURL(format === 'PNG' ? 'image/png' : 'image/jpeg'),
              format,
              naturalWidth: canvas.width,
              naturalHeight: canvas.height,
            });
          } catch (e) { reject(e); }
        };
        img.onerror = reject;
        img.src = url;
      });
    }
  };

  // Fit image into a max bounding box preserving aspect ratio, returns mm dimensions.
  // Uses pure aspect ratio — no DPI assumption, just scales to fit within maxW × maxH mm.
  const fitImage = (naturalWidth: number, naturalHeight: number, maxWmm: number, maxHmm: number) => {
    if (!naturalWidth || !naturalHeight) return { w: maxWmm, h: maxHmm };
    const aspect = naturalHeight / naturalWidth;
    // Start by fitting to max width
    let w = maxWmm;
    let h = w * aspect;
    // If too tall, fit to max height instead
    if (h > maxHmm) {
      h = maxHmm;
      w = h / aspect;
    }
    return { w, h };
  };

  let footerStripHMm = 0;
  let footerBannerLoaded: LoadedImage | null = null;

  if (opts.footerBanner) {
    try {
      const raw = await loadImage(opts.footerBanner);
      // Compute strip height from image's natural aspect ratio at full page width
      const imgAspect = raw.naturalHeight / raw.naturalWidth;
      footerStripHMm = pageWidth * imgAspect;
      // Cap at 30% of page height
      footerStripHMm = Math.min(footerStripHMm, pageHeight * 0.30);

      // Re-render the image onto a canvas at the exact output pixel size
      // (300 DPI equivalent: pageWidth mm → pageWidth/25.4*300 px)
      const DPI = 300;
      const targetW = Math.round((pageWidth / 25.4) * DPI);
      const targetH = Math.round((footerStripHMm / 25.4) * DPI);
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        await new Promise<void>((res, rej) => {
          img.onload = () => { ctx.drawImage(img, 0, 0, targetW, targetH); res(); };
          img.onerror = rej;
          img.src = raw.dataUrl;
        });
        footerBannerLoaded = {
          dataUrl: canvas.toDataURL('image/jpeg', 0.95),
          format: 'JPEG',
          naturalWidth: targetW,
          naturalHeight: targetH,
        };
      } else {
        footerBannerLoaded = raw;
      }
    } catch (e) {
      console.error('Failed to pre-load footer banner', e);
    }
  }

  const checkPageBreak = (requiredSpace: number) => {
    const bottomBoundary = footerStripHMm > 0
      ? pageHeight - footerStripHMm - 2
      : pageHeight - margin;
    if (yPosition + requiredSpace > bottomBoundary) {
      doc.addPage();
      yPosition = margin;
      addWatermark();
      return true;
    }
    return false;
  };

  const addSection = (section: any) => {
    checkPageBreak(20);

    doc.setFillColor(230, 240, 255);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 9, 'F');
    doc.setDrawColor(180, 200, 240);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 9, 'S');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 60, 120);
    doc.text(section.name, margin + 3, yPosition + 6);

    yPosition += 13;
  };

  const addQuestion = async (question: any, questionNumber: number) => {
    checkPageBreak(35);

    // Question text with plain number
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);

    const questionText = normalizeText(question.question_text || question.text || 'Question');
    const questionLines = doc.splitTextToSize(questionText, pageWidth - 2 * margin - 12);

    doc.text(`${questionNumber}.`, margin, yPosition + 4);
    doc.text(questionLines, margin + 10, yPosition + 4);
    yPosition += questionLines.length * 5.5 + 5;

    if (question.image_url) {
      try {
        const imgData = await loadImage(question.image_url);
        const maxW = pageWidth - 2 * margin - 12;
        const { w, h } = fitImage(imgData.naturalWidth, imgData.naturalHeight, maxW, 60);
        checkPageBreak(h + 6);
        doc.addImage(imgData.dataUrl, imgData.format, margin + 10, yPosition, w, h, undefined, 'FAST');
        yPosition += h + 4;
      } catch (error) {
        console.error('Failed to load question image:', error);
        // skip — no black box left behind
      }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Sort options by order so A/B/C/D are always sequential
    const optionList = [...(question.options || [])].sort((a, b) => {
      const aOrder = a.display_order ?? a.option_order ?? 0;
      const bOrder = b.display_order ?? b.option_order ?? 0;
      return aOrder - bOrder;
    });

    for (let optionIndex = 0; optionIndex < optionList.length; optionIndex++) {
      const option = optionList[optionIndex];
      checkPageBreak(12);

      // Always use sequential index for label (A, B, C, D...)
      const optionLabel = String.fromCharCode(65 + optionIndex);
      const isCorrect = option.is_correct;
      const optionText = formatOptionText(option.option_text || option.text || '');

      if (opts.showAnswers && isCorrect) {
        doc.setTextColor(0, 150, 0);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'normal');
      }

      const prefix = `${optionLabel}. `;

      const optionLines = doc.splitTextToSize(
        prefix + optionText,
        pageWidth - 2 * margin - 12
      );

      doc.text(optionLines[0], margin + 8, yPosition);
      if (optionLines.length > 1) {
        for (let i = 1; i < optionLines.length; i++) {
          yPosition += 5;
          doc.text(optionLines[i], margin + 14, yPosition);
        }
      }
      yPosition += 6;

      if (option.image_url) {
        try {
          const imgData = await loadImage(option.image_url);
          const maxW = pageWidth - 2 * margin - 16;
          const { w, h } = fitImage(imgData.naturalWidth, imgData.naturalHeight, maxW, 45);
          checkPageBreak(h + 4);
          doc.addImage(imgData.dataUrl, imgData.format, margin + 10, yPosition, w, h, undefined, 'FAST');
          yPosition += h + 3;
        } catch (error) {
          console.error('Failed to load option image:', error);
          // skip — no black box left behind
        }
      }
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    yPosition += 2;

    if (question.explanation) {
      if (opts.showExplanations) {
        checkPageBreak(15);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(22, 101, 52);
        doc.setFillColor(240, 253, 244);
        const expText = `Explanation: ${normalizeText(question.explanation)}`;
        const expLines = doc.splitTextToSize(expText, pageWidth - 2 * margin - 14);
        const expHeight = expLines.length * 4.5 + 4;
        doc.roundedRect(margin + 6, yPosition - 1, pageWidth - 2 * margin - 6, expHeight, 1, 1, 'F');
        doc.text(expLines, margin + 9, yPosition + 3);
        yPosition += expHeight + 3;
      }
    }

    yPosition += 4;
  };

  // Helper: resize image to exact mm output size at 300 DPI to prevent jsPDF clipping
  const resizeForPdf = async (dataUrl: string, wMm: number, hMm: number): Promise<{ dataUrl: string; format: 'JPEG' }> => {
    const DPI = 300;
    const targetW = Math.round((wMm / 25.4) * DPI);
    const targetH = Math.round((hMm / 25.4) * DPI);
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;
    await new Promise<void>((res, rej) => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, targetW, targetH); res(); };
      img.onerror = rej;
      img.src = dataUrl;
    });
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.95), format: 'JPEG' };
  };

  addWatermark();

  // ── Cover banner: full A4 first page ──────────────────────────────────────
  if (opts.coverBanner) {
    try {
      const raw = await loadImage(opts.coverBanner);
      const resized = await resizeForPdf(raw.dataUrl, pageWidth, pageHeight);
      doc.addImage(resized.dataUrl, resized.format, 0, 0, pageWidth, pageHeight);
      doc.addPage();
      yPosition = margin;
      addWatermark();
    } catch (e) {
      console.error('Failed to render cover banner', e);
    }
  }

  if (opts.showCoverPage) {
    addHeader();
    addExamInfoTable();
  }

  let questionNumber = 1;
  const sectionMap = new Map(sections.map(s => [s.id, s]));

  let currentSectionId: string | null = null;

  for (const question of questions) {
    if (question.section_id !== currentSectionId) {
      const section = sectionMap.get(question.section_id);
      if (section) {
        addSection(section);
        currentSectionId = question.section_id;
      }
    }

    await addQuestion(question, questionNumber);
    questionNumber++;
  }

  // ── Footer banner: auto-height strip at bottom of every content page ──────
  if (opts.footerBanner && footerBannerLoaded && footerStripHMm > 0) {
    try {
      const totalPagesNow = doc.getNumberOfPages();
      const startPage = opts.coverBanner ? 2 : 1;
      for (let p = startPage; p <= totalPagesNow; p++) {
        doc.setPage(p);
        doc.addImage(
          footerBannerLoaded.dataUrl,
          footerBannerLoaded.format,
          0,
          pageHeight - footerStripHMm,
          pageWidth,
          footerStripHMm
        );
      }
    } catch (e) {
      console.error('Failed to render footer banner', e);
    }
  }

  // ── Back cover banner: full A4 last page ──────────────────────────────────
  if (opts.backCoverBanner) {
    try {
      const raw = await loadImage(opts.backCoverBanner);
      const resized = await resizeForPdf(raw.dataUrl, pageWidth, pageHeight);
      doc.addPage();
      doc.addImage(resized.dataUrl, resized.format, 0, 0, pageWidth, pageHeight);
    } catch (e) {
      console.error('Failed to render back cover banner', e);
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);

    if (opts.headerText) {
      doc.text(opts.headerText, pageWidth / 2, 8, { align: 'center' });
    }

    // Place page numbers above the footer strip if active
    const pageNumY = footerStripHMm > 0
      ? pageHeight - footerStripHMm - 3
      : pageHeight - 10;
    const footerTextY = footerStripHMm > 0
      ? pageHeight - footerStripHMm - 8
      : pageHeight - 5;

    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageNumY, { align: 'center' });
    doc.text(
      opts.footerText || 'Generated by Bharat Mock - www.bharatmock.com',
      pageWidth / 2,
      footerTextY,
      { align: 'center' }
    );
  }

  const fileName = `${exam.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}
