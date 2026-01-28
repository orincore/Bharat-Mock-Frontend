import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export async function generateExamPDF(examData: ExamData): Promise<void> {
  const { exam, sections, questions } = examData;
  
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

  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      addWatermark();
      return true;
    }
    return false;
  };

  const addSection = (section: any) => {
    checkPageBreak(20);
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Section: ${section.name}`, margin + 2, yPosition + 5);
    
    yPosition += 12;
  };

  const addQuestion = async (question: any, questionNumber: number) => {
    checkPageBreak(30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    const questionPrefix = `Q.${questionNumber}`;
    const questionText = normalizeText(question.question_text || question.text || 'Question');
    const questionLines = doc.splitTextToSize(
      questionText,
      pageWidth - 2 * margin - 10
    );
    
    doc.text(questionPrefix, margin, yPosition);
    doc.text(questionLines, margin + 10, yPosition);
    yPosition += questionLines.length * 5 + 3;

    if (question.image_url) {
      try {
        checkPageBreak(50);
        const imgData = await loadImage(question.image_url);
        doc.addImage(imgData, 'JPEG', margin + 10, yPosition, 60, 40);
        yPosition += 45;
      } catch (error) {
        console.error('Failed to load question image:', error);
      }
    }

    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    const originalCharSpace = (doc as any).getCharSpace?.() ?? 0;
    if ((doc as any).setCharSpace) {
      (doc as any).setCharSpace(0);
    }

    const optionList = question.options || [];
    for (let optionIndex = 0; optionIndex < optionList.length; optionIndex++) {
      const option = optionList[optionIndex];
      checkPageBreak(15);

      const optionLabel = String.fromCharCode(65 + (option.display_order ?? option.option_order ?? optionIndex));
      const isCorrect = option.is_correct;
      const optionText = formatOptionText(option.option_text || option.text || '');
      
      if (isCorrect) {
        doc.setTextColor(0, 128, 0);
        doc.setFont('courier', 'bold');
      } else {
        doc.setTextColor(255, 0, 0);
        doc.setFont('courier', 'normal');
      }

      const optionLines = doc.splitTextToSize(
        optionText,
        pageWidth - 2 * margin - 15
      );
      
      doc.text(`${optionLabel}. ${isCorrect ? '✓' : '✗'} ${optionLines[0]}`, margin + 5, yPosition);
      
      if (optionLines.length > 1) {
        for (let i = 1; i < optionLines.length; i++) {
          yPosition += 4;
          doc.text(optionLines[i], margin + 10, yPosition);
        }
      }
      
      yPosition += 5;

      if (option.image_url) {
        try {
          checkPageBreak(40);
          const imgData = await loadImage(option.image_url);
          doc.addImage(imgData, 'JPEG', margin + 10, yPosition, 50, 30);
          yPosition += 35;
        } catch (error) {
          console.error('Failed to load option image:', error);
        }
      }
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    yPosition += 3;

    if (question.explanation) {
      checkPageBreak(15);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      const explanationLines = doc.splitTextToSize(
        `Explanation: ${question.explanation}`,
        pageWidth - 2 * margin - 10
      );
      doc.text(explanationLines, margin + 5, yPosition);
      yPosition += explanationLines.length * 4 + 5;
    }

    yPosition += 5;
  };

  const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  addWatermark();
  addHeader();
  addExamInfoTable();

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

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'Generated by Bharat Mock - www.bharatmock.com',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  const fileName = `${exam.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}
