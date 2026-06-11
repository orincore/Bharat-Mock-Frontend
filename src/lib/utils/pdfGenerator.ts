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

// Render Hindi text to a canvas image using the browser's text shaping engine.
// Returns { dataUrl, widthMm, heightMm } at the given font size (pt).
function renderHindiTextToImage(
  text: string,
  fontSizePt: number,
  maxWidthMm: number,
  color = '#141414',
  bold = false
): { dataUrl: string; widthMm: number; heightMm: number } {
  const DPI = 150;
  const PT_TO_PX = DPI / 72;
  const MM_TO_PX = DPI / 25.4;
  const maxWidthPx = Math.round(maxWidthMm * MM_TO_PX);
  const fontSizePx = Math.round(fontSizePt * PT_TO_PX);
  const fontWeight = bold ? '700' : '400';
  const fontFamily = "'Noto Sans Devanagari', 'Noto Sans', Arial, sans-serif";

  // Measure and wrap text
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;

  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!word) continue;
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width <= maxWidthPx) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length === 0) lines.push(text);

  const lineHeightPx = Math.round(fontSizePx * 1.5);
  const paddingPx = Math.round(fontSizePx * 0.2);
  const totalHeightPx = lines.length * lineHeightPx + paddingPx * 2;
  const totalWidthPx = Math.min(
    maxWidthPx,
    Math.max(...lines.map(l => Math.ceil(ctx.measureText(l).width))) + paddingPx * 2
  );

  canvas.width = totalWidthPx;
  canvas.height = totalHeightPx;

  // Transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], paddingPx, paddingPx + i * lineHeightPx);
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    widthMm: totalWidthPx / MM_TO_PX,
    heightMm: totalHeightPx / MM_TO_PX,
  };
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
  // Preserve line structure: <br> and closing block tags become newlines so the
  // PDF keeps the same paragraph/line breaks as the exam attempt page (plain
  // textContent glues "…end.Start…" together across block boundaries).
  temp.innerHTML = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|ul|ol|table)>/gi, '\n');
  return temp.textContent || '';
};

// Extract absolute src URLs from <img> tags embedded in rich-text HTML so we
// can render them in the PDF separately (jsPDF cannot parse HTML directly).
const extractImgUrls = (html?: string): string[] => {
  if (!html) return [];
  const div = document.createElement('div');
  div.innerHTML = html;
  return Array.from(div.querySelectorAll('img'))
    .map((img) => img.getAttribute('src') || '')
    .filter(Boolean);
};

const normalizeText = (value?: string) =>
  stripHtml(value)
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Collapse runs of spaces/tabs but KEEP newlines (paragraph structure),
    // then tidy spaces around them and drop blank lines.
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
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

  const useHindiFont = opts.language === 'hi';

  // Helper: add Hindi text as a canvas-rendered image (proper shaping via browser engine)
  const addHindiText = (
    text: string,
    x: number,
    y: number,
    maxWidthMm: number,
    fontSizePt = 10,
    color = '#141414',
    bold = false
  ): number => {
    if (!text.trim()) return 0;
    const { dataUrl, widthMm, heightMm } = renderHindiTextToImage(text, fontSizePt, maxWidthMm, color, bold);
    doc.addImage(dataUrl, 'PNG', x, y, widthMm, heightMm);
    return heightMm;
  };

  const setFont = (style: 'normal' | 'bold' | 'italic') => {
    doc.setFont('helvetica', style);
  };

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
      const originalFont = doc.getFont();
      doc.setFontSize(58);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      doc.text('Bharat Mock', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45
      });
      doc.setFontSize(originalFontSize);
      doc.setTextColor(originalColor as any);
      doc.setFont(originalFont.fontName, originalFont.fontStyle);
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

  // The media CDN serves images without CORS headers, which taints the canvas and
  // makes toDataURL() throw — silently dropping every question/option image from
  // the PDF. Route remote http(s) images through our same-origin proxy so canvas
  // extraction is never blocked. Data URLs and same-origin paths pass through.
  const toLoadableUrl = (url: string): string => {
    if (!url) return url;
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin === window.location.origin) return url; // same-origin already
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return `/api/proxy-image?url=${encodeURIComponent(parsed.toString())}`;
      }
    } catch {
      /* relative or malformed — fall through and use as-is */
    }
    return url;
  };

  const loadImage = async (rawUrl: string): Promise<LoadedImage> => {
    const url = toLoadableUrl(rawUrl);
    // Strategy: Try fetching first (best for CORS), then fallback to Image object.
    // Always convert to JPEG/PNG as jsPDF support for WebP is unreliable.
    const convertToSupportedFormat = async (blobOrImg: Blob | HTMLImageElement): Promise<LoadedImage> => {
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
            
            // Check original extension/mime to decide format
            const isPng = url.toLowerCase().includes('.png') || (blobOrImg instanceof Blob && blobOrImg.type.includes('png'));
            const outputFormat = isPng ? 'PNG' : 'JPEG';
            
            resolve({
              dataUrl: canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.92),
              format: outputFormat,
              naturalWidth: canvas.width,
              naturalHeight: canvas.height,
            });
          } catch (e) { reject(e); }
        };
        img.onerror = reject;
        if (blobOrImg instanceof Blob) {
          img.src = URL.createObjectURL(blobOrImg);
        } else {
          img.src = blobOrImg.src;
        }
      });
    };

    try {
      // Try fetch first — if it works, it's the safest way to avoid canvas taints
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return await convertToSupportedFormat(blob);
    } catch (fetchErr) {
      // Fallback: Direct image loading
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Important for CORS
        img.onload = async () => {
          try {
            const result = await convertToSupportedFormat(img);
            resolve(result);
          } catch (e) { reject(e); }
        };
        img.onerror = () => {
          // If anonymous fails, try without it (might be a local/same-origin asset)
          const img2 = new Image();
          img2.onload = async () => {
            try {
              const result = await convertToSupportedFormat(img2);
              resolve(result);
            } catch (e) { reject(e); }
          };
          img2.onerror = reject;
          img2.src = url;
        };
        img.src = url;
      });
    }
  };

  // Fit image into a max bounding box preserving aspect ratio, returns mm dimensions.
  // Never upscale: an image is rendered at most at its natural size (CSS px → mm at
  // 96 DPI, same size it appears on the attempt page), then shrunk if it exceeds the
  // box. Previously every image was stretched to the full box width, which blew
  // small diagrams up to page width.
  const fitImage = (naturalWidth: number, naturalHeight: number, maxWmm: number, maxHmm: number) => {
    if (!naturalWidth || !naturalHeight) return { w: Math.min(maxWmm, 60), h: Math.min(maxHmm, 40) };
    const aspect = naturalHeight / naturalWidth;
    let w = Math.min(maxWmm, pxToMm(naturalWidth));
    let h = w * aspect;
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

    const sectionName = (opts.language === 'hi' && section.name_hi) ? section.name_hi : section.name;
    if (useHindiFont) {
      addHindiText(sectionName, margin + 3, yPosition + 1, pageWidth - 2 * margin - 6, 11, '#1e3a8a', true);
    } else {
      doc.setFontSize(11);
      setFont('bold');
      doc.setTextColor(30, 60, 120);
      doc.text(sectionName, margin + 3, yPosition + 6);
    }

    yPosition += 13;
  };

  const addQuestion = async (question: any, questionNumber: number) => {
    const questionText = normalizeText(
      (opts.language === 'hi' && (question as any).text_hi)
        ? (question as any).text_hi
        : (question.question_text || question.text || 'Question')
    );

    // Reserve the REAL height of the question block (capped at one page) so long
    // questions move to a fresh page instead of overflowing into the footer strip.
    doc.setFontSize(10);
    if (useHindiFont) {
      checkPageBreak(35);
    } else {
      setFont('bold');
      const measuredLines = doc.splitTextToSize(questionText, pageWidth - 2 * margin - 12);
      checkPageBreak(Math.min(measuredLines.length * 5.5 + 12, pageHeight - 2 * margin));
    }

    // Question number always in helvetica
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(`${questionNumber}.`, margin, yPosition + 4);

    if (useHindiFont) {
      const h = addHindiText(questionText, margin + 10, yPosition, pageWidth - 2 * margin - 12, 10, '#141414', true);
      yPosition += Math.max(h, 6) + 3;
    } else {
      setFont('bold');
      const questionLines = doc.splitTextToSize(questionText, pageWidth - 2 * margin - 12);
      doc.text(questionLines, margin + 10, yPosition + 4);
      yPosition += questionLines.length * 5.5 + 5;
    }
    // Images embedded in the rich-text HTML of the question (editor <img> tags)
    const questionHtmlRaw = (opts.language === 'hi' && (question as any).text_hi)
      ? (question as any).text_hi
      : (question.question_text || question.text || '');
    for (const imgSrc of extractImgUrls(questionHtmlRaw)) {
      try {
        const imgData = await loadImage(imgSrc);
        const maxW = pageWidth - 2 * margin - 12;
        const { w, h } = fitImage(imgData.naturalWidth, imgData.naturalHeight, maxW, 60);
        checkPageBreak(h + 6);
        doc.addImage(imgData.dataUrl, imgData.format, margin + 10, yPosition, w, h, undefined, 'FAST');
        yPosition += h + 4;
      } catch (error) {
        console.error('Failed to load embedded question image:', error);
      }
    }

    // Standalone question image (separate upload field)
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
      }
    }

    setFont('normal');
    doc.setFontSize(10);

    // Sort options by order so A/B/C/D are always sequential
    const optionList = [...(question.options || [])].sort((a, b) => {
      const aOrder = a.display_order ?? a.option_order ?? 0;
      const bOrder = b.display_order ?? b.option_order ?? 0;
      return aOrder - bOrder;
    }).filter((option) => {
      // Only filter out options that have no text at all in any language
      return option.option_text || option.text || (option as any).option_text_hi;
    });

    for (let optionIndex = 0; optionIndex < optionList.length; optionIndex++) {
      const option = optionList[optionIndex];

      // Always use sequential index for label (A, B, C, D...)
      const optionLabel = String.fromCharCode(65 + optionIndex);
      const isCorrect = option.is_correct;
      const optionText = formatOptionText(
        (opts.language === 'hi' && (option as any).option_text_hi)
          ? (option as any).option_text_hi
          : (option.option_text || option.text || '')
      );

      // Reset to known good state before rendering
      doc.setFontSize(10);
      setFont('normal');

      // Reserve the real height of this option so multi-line options never
      // overflow past the bottom boundary / footer strip.
      if (useHindiFont) {
        checkPageBreak(12);
      } else {
        const measured = doc.splitTextToSize(`${optionLabel}. ${optionText}`, pageWidth - 2 * margin - 12);
        checkPageBreak(Math.min(measured.length * 5 + 6, pageHeight - 2 * margin));
      }
      if (opts.showAnswers && isCorrect) {
        doc.setTextColor(0, 150, 0);
      } else {
        doc.setTextColor(40, 40, 40);
      }

      const prefix = `${optionLabel}. `;
      const fullText = prefix + optionText;

      try {
        if (useHindiFont) {
          const color = (opts.showAnswers && isCorrect) ? '#16a34a' : '#374151';
          // Label in helvetica
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(opts.showAnswers && isCorrect ? 0 : 40, opts.showAnswers && isCorrect ? 150 : 40, opts.showAnswers && isCorrect ? 0 : 40);
          doc.text(prefix, margin + 8, yPosition + 3.5);
          // Hindi text as canvas image
          const h = addHindiText(optionText, margin + 8 + 7, yPosition, pageWidth - 2 * margin - 20, 10, color, false);
          yPosition += Math.max(h, 5) + 2;
        } else {
          const optionLines = doc.splitTextToSize(fullText, pageWidth - 2 * margin - 12);
          doc.text(optionLines, margin + 8, yPosition);
          yPosition += (optionLines.length - 1) * 5 + 6;
        }
      } catch (err) {
        console.error('[PDF] option render failed:', err);
        yPosition += 6;
      }

      // Images embedded in the rich-text HTML of the option
      const optionHtmlRaw = (opts.language === 'hi' && (option as any).option_text_hi)
        ? (option as any).option_text_hi
        : (option.option_text || option.text || '');
      for (const imgSrc of extractImgUrls(optionHtmlRaw)) {
        try {
          const imgData = await loadImage(imgSrc);
          const maxW = pageWidth - 2 * margin - 16;
          const { w, h } = fitImage(imgData.naturalWidth, imgData.naturalHeight, maxW, 45);
          checkPageBreak(h + 4);
          doc.addImage(imgData.dataUrl, imgData.format, margin + 10, yPosition, w, h, undefined, 'FAST');
          yPosition += h + 3;
        } catch (error) {
          console.error('Failed to load embedded option image:', error);
        }
      }

      // Standalone option image (separate upload field)
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
        }
      }
    }

    doc.setTextColor(0, 0, 0);
    setFont('normal');
    yPosition += 2;

    if (question.explanation || question.explanation_hi) {
      if (opts.showExplanations) {
        const expRaw = (opts.language === 'hi' && question.explanation_hi)
          ? question.explanation_hi
          : question.explanation;
        const explanationText = normalizeText(expRaw);

        doc.setFontSize(8.5);
        setFont('italic');
        // Reserve the real height of the explanation box (capped at one page).
        if (useHindiFont) {
          checkPageBreak(15);
        } else {
          const measured = doc.splitTextToSize(`Explanation: ${explanationText}`, pageWidth - 2 * margin - 14);
          checkPageBreak(Math.min(measured.length * 4.5 + 10, pageHeight - 2 * margin));
        }
        doc.setTextColor(22, 101, 52);
        doc.setFillColor(240, 253, 244);

        if (useHindiFont) {
          doc.setFillColor(240, 253, 244);
          const expH = addHindiText('Explanation: ' + explanationText, margin + 9, yPosition, pageWidth - 2 * margin - 15, 8.5, '#166534', false);
          const boxH = Math.max(expH, 8) + 4;
          doc.setFillColor(240, 253, 244);
          doc.roundedRect(margin + 6, yPosition - 1, pageWidth - 2 * margin - 6, boxH, 1, 1, 'F');
          addHindiText('Explanation: ' + explanationText, margin + 9, yPosition, pageWidth - 2 * margin - 15, 8.5, '#166534', false);
          yPosition += boxH + 3;
        } else {
          const expText = `Explanation: ${explanationText}`;
          const expLines = doc.splitTextToSize(expText, pageWidth - 2 * margin - 14);
          const expHeight = expLines.length * 4.5 + 4;
          doc.roundedRect(margin + 6, yPosition - 1, pageWidth - 2 * margin - 6, expHeight, 1, 1, 'F');
          doc.text(expLines, margin + 9, yPosition + 3);
          yPosition += expHeight + 3;
        }

        // Images embedded in the explanation rich-text HTML
        for (const imgSrc of extractImgUrls(expRaw)) {
          try {
            const imgData = await loadImage(imgSrc);
            const maxW = pageWidth - 2 * margin - 16;
            const { w, h } = fitImage(imgData.naturalWidth, imgData.naturalHeight, maxW, 50);
            checkPageBreak(h + 6);
            // Green tinted background strip for explanation images
            doc.setFillColor(240, 253, 244);
            doc.roundedRect(margin + 6, yPosition - 1, pageWidth - 2 * margin - 6, h + 6, 1, 1, 'F');
            doc.addImage(imgData.dataUrl, imgData.format, margin + 10, yPosition + 2, w, h, undefined, 'FAST');
            yPosition += h + 8;
          } catch (error) {
            console.error('Failed to load explanation image:', error);
          }
        }
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
    // Skip questions that don't have content in the selected language
    const hasEnglish = question.question_text || question.text;
    const hasHindi = (question as any).text_hi;
    
    if (opts.language === 'en' && !hasEnglish) continue;
    if (opts.language === 'hi' && !hasHindi) continue;

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

  // Stable filename based on exam name (+ language) so re-generating the PDF after
  // updating the banner produces the same name instead of a new timestamped file.
  const safeTitle = exam.title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const fileName = `${safeTitle}_${opts.language}.pdf`;
  doc.save(fileName);
}
