// Shared exam-PDF generator built on html2canvas + jsPDF.
//
// The PDF is produced by rasterizing real HTML "pages" (one source of truth),
// which renders rich-text content, tables, MathML and images reliably — unlike
// the older pure-jsPDF text walker (see pdfGenerator.ts) which dropped images
// and cropped long content. Both the admin PDF generator and the public
// category/exam "Download PDF" buttons use this module.

import { type PdfOptions } from '@/lib/utils/pdfGenerator';

// Render rich-text HTML, normalised the same way the exam attempt page displays
// it. The attempt page CSS forces every descendant to the inherited font size
// and black colour, so pasted inline font-size / font-family / font-weight /
// colour spans never show there. The PDF has no such CSS, which made fragments
// of a question render at wildly different sizes. Strip that styling noise here;
// keep semantic formatting (b/strong/i/u/sub/sup, line breaks, lists, tables)
// and images.
function renderHtmlForPreview(raw: string | undefined): string {
  if (!raw) return '';

  const tmp = document.createElement('div');
  tmp.innerHTML = raw;

  tmp.querySelectorAll('script, style, meta, link, xml').forEach((node) => node.remove());

  tmp.querySelectorAll('*').forEach((element) => {
    const el = element as HTMLElement;
    if (el.namespaceURI === 'http://www.w3.org/1998/Math/MathML') return;
    const tag = el.tagName.toLowerCase();
    if (tag === 'img') return; // images handled below

    if (el.style) {
      [
        'font-size', 'font-family', 'font-weight', 'line-height', 'letter-spacing',
        'color', 'background', 'background-color',
        'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
        'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
        'text-indent', 'width', 'height', 'min-height', 'white-space',
      ].forEach((prop) => el.style.removeProperty(prop));
      if (!el.style.cssText.trim()) el.removeAttribute('style');
    }
    // <font size/face/color> and stray presentational attributes
    ['class', 'id', 'color', 'face', 'size', 'dir', 'align'].forEach((attr) => {
      if (el.hasAttribute(attr)) el.removeAttribute(attr);
    });
  });

  // The attempt page flattens headings to inherited size with semi-bold weight —
  // mirror that so an <h2> pasted into a question doesn't explode the layout.
  tmp.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    const div = document.createElement('div');
    div.setAttribute('style', 'font-weight:600');
    while (heading.firstChild) div.appendChild(heading.firstChild);
    heading.replaceWith(div);
  });

  // Constrain every <img> to fit within its container.
  tmp.querySelectorAll('img').forEach((img) => {
    img.removeAttribute('width');
    img.removeAttribute('height');
    img.setAttribute('style', 'max-width:100%;width:auto;max-height:150px;display:block;margin:4px 0;border-radius:3px;border:1px solid #e5e7eb;box-sizing:border-box;');
  });

  return tmp.innerHTML;
}

// Route remote images through the same-origin proxy so html2canvas can rasterize
// them (the media CDN sends no CORS headers, which would taint the canvas and
// silently blank every image in the PDF).
function toProxiedImageUrl(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin === window.location.origin) return url;
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return `/api/proxy-image?url=${encodeURIComponent(parsed.toString())}`;
    }
  } catch { /* relative/malformed — use as-is */ }
  return url;
}

// Generate the PDF by rasterizing the page divs that buildPreviewHtml emits —
// one source of truth, so the downloaded PDF matches the live preview exactly.
export async function generatePdfFromPreview(previewHtml: string, title: string): Promise<void> {
  const host = document.createElement('div');
  // Render off-screen at natural size (display:none would give zero-size pages).
  host.style.cssText = 'position:fixed;left:-100000px;top:0;width:760px;background:#fff;pointer-events:none;';
  host.innerHTML = previewHtml;
  document.body.appendChild(host);

  try {
    // Preview-only chrome must not appear in the PDF.
    host.querySelectorAll('[data-preview-only]').forEach((node) => node.remove());

    // Swap every image to a same-origin/proxied URL and wait for them to load.
    const images = Array.from(host.querySelectorAll('img'));
    images.forEach((img) => {
      const src = img.getAttribute('src') || '';
      const proxied = toProxiedImageUrl(src);
      if (proxied !== src) img.setAttribute('src', proxied);
    });
    await Promise.all(
      images.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
      )
    );

    const pages = Array.from(host.querySelectorAll<HTMLElement>('[data-pdf-page]'));
    if (pages.length === 0) throw new Error('No preview pages to render');

    // Strip the on-screen page chrome (border, shadow, rounding, gap) so the
    // rasterized page is clean paper.
    pages.forEach((page) => {
      page.style.border = 'none';
      page.style.borderRadius = '0';
      page.style.boxShadow = 'none';
      page.style.margin = '0';
    });

    const html2canvas = (await import('html2canvas')).default;
    const { default: JsPDF } = await import('jspdf');
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const A4_W = 210;
    const A4_H = 297;

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      if (i > 0) doc.addPage();
      // Fit to A4 preserving aspect ratio (pages taller than A4 are scaled down).
      let w = A4_W;
      let h = (canvas.height / canvas.width) * A4_W;
      if (h > A4_H) {
        w = (A4_H / h) * A4_W;
        h = A4_H;
      }
      doc.addImage(imgData, 'JPEG', (A4_W - w) / 2, 0, w, h, undefined, 'FAST');
    }

    const safeTitle = title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'exam';
    doc.save(`${safeTitle}.pdf`);
  } finally {
    host.remove();
  }
}

export function buildPreviewHtml(examData: any, options: PdfOptions): string {
  const { exam, sections, questions } = examData;
  const sectionMap = new Map(sections.map((s: any) => [s.id, s]));

  // A4 aspect ratio: 210:297. We render each page as a fixed-width block.
  const PAGE_W = 680; // px
  const PAGE_H = Math.round(PAGE_W * (297 / 210)); // ~962px
  const MARGIN = 32; // px

  const pageStyle = `
    position:relative;
    width:${PAGE_W}px;
    min-height:${PAGE_H}px;
    background:#fff;
    border:1px solid #d1d5db;
    border-radius:4px;
    margin:0 auto 24px;
    box-shadow:0 2px 8px rgba(0,0,0,0.08);
    overflow:hidden;
    font-family:Arial,Helvetica,sans-serif;
    font-size:12px;
    color:#141414;
    box-sizing:border-box;
  `;

  const contentStyle = `
    padding:${MARGIN}px ${MARGIN}px ${options.footerBanner ? '15%' : `${MARGIN}px`};
    box-sizing:border-box;
  `;

  // ── Helper to emit a page label badge ──────────────────────────────────────
  const pageBadge = (label: string) =>
    `<div data-preview-only="true" style="position:absolute;top:8px;right:8px;background:rgba(59,130,246,0.85);color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;z-index:10">${label}</div>`;

  // ── Footer strip overlay — height derived from image aspect ratio ──────────
  const footerOverlay = options.footerBanner
    ? `<div style="position:absolute;bottom:0;left:0;right:0;overflow:hidden">
        <img src="${options.footerBanner}" style="width:100%;display:block;object-fit:fill" />
        <div data-preview-only="true" style="position:absolute;top:3px;left:6px;background:rgba(0,0,0,0.5);color:#fff;font-size:8px;padding:1px 5px;border-radius:3px">Footer Strip</div>
       </div>`
    : '';

  // ── Watermark overlay — faint diagonal logo behind the page content ─────────
  // Rendered as a low-opacity overlay (pointer-events:none) so it sits across the
  // whole page, including over the question cards, without hurting readability.
  const watermarkOverlay = options.showWatermark
    ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;overflow:hidden;z-index:1">
        <img src="/logo.png" style="width:62%;max-width:430px;height:auto;opacity:0.08;transform:rotate(-28deg)" />
       </div>`
    : '';

  let html = `<div style="background:#f3f4f6;padding:16px;">`;

  // ── Page 1: Cover banner ────────────────────────────────────────────────────
  if (options.coverBanner) {
    html += `<div data-pdf-page="true" style="${pageStyle}">`;
    html += pageBadge('Cover Page');
    html += `<img src="${options.coverBanner}" style="width:100%;height:${PAGE_H}px;object-fit:cover;display:block" />`;
    html += `</div>`;
  }

  // Cover info page
  if (options.showCoverPage) {
    html += `<div data-pdf-page="true" style="${pageStyle}">`;
    html += pageBadge('Cover Info');
    html += `<div style="${contentStyle}">`;
    if (options.headerText) {
      html += `<div style="text-align:center;font-size:10px;color:#6b7280;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb">${options.headerText}</div>`;
    }
    html += `<div style="font-size:18px;font-weight:700;margin-bottom:14px;color:#1e3a8a">${exam.title}</div>`;
    html += `<table style="width:100%;border-collapse:collapse;font-size:11px">`;
    const rows: [string, string | number][] = [
      ['Duration', `${exam.duration} minutes`],
      ['Total Questions', exam.total_questions],
      ['Total Marks', exam.total_marks],
      ['Exam UID', exam.exam_uid || '-'],
    ];
    for (const [k, v] of rows) {
      html += `<tr>
        <td style="padding:6px 10px;border:1px solid #d1d5db;font-weight:700;width:38%;background:#f9fafb">${k}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db">${v}</td>
      </tr>`;
    }
    html += `</table>`;
    html += `</div>`;
    html += watermarkOverlay;
    html += footerOverlay;
    html += `</div>`;
  }

  // Questions — build each as a self-contained block, then pack the blocks into
  // A4 pages by their MEASURED rendered height. This replaces the old fixed
  // "4 questions per page" rule, which left big blank gaps after short questions
  // and let long questions overflow the page. Now each page is filled as tightly
  // as the content allows without crossing the page boundary.
  type ContentBlock = { html: string; kind: 'section' | 'question' };
  const blocks: ContentBlock[] = [];
  let qNum = 1;
  let lastSectionId: string | null = null;

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];

    // Skip questions that don't have content in the selected language
    const hasEnglish = q.text || q.question_text;
    const hasHindi = q.text_hi;

    if (options.language === 'en' && !hasEnglish) continue;
    if (options.language === 'hi' && !hasHindi) continue;

    if (q.section_id !== lastSectionId) {
      const sec = sectionMap.get(q.section_id) as any;
      if (sec) {
        const sectionName = (options.language === 'hi' && sec.name_hi) ? sec.name_hi : sec.name;
        blocks.push({
          kind: 'section',
          // html2canvas (1.4.1) draws text lower than the browser does (its baseline
          // sits below the browser's), so the title rendered too low in the PDF. A
          // tight line-height plus top-weighted vertical padding (less above, more
          // below) lifts the text back to centre in the blue bar.
          html: `<div style="background:#dbeafe;border:1px solid #bfdbfe;padding:4px 10px 8px;border-radius:4px;font-weight:700;font-size:11px;line-height:1;color:#1e3a8a;margin-bottom:10px">${sectionName}</div>`,
        });
        lastSectionId = q.section_id;
      }
    }

    const qRaw = (options.language === 'hi' && q.text_hi)
      ? q.text_hi
      : (q.text || q.question_text || '');
    let qb = `<div style="margin-bottom:10px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:5px;background:#fafafa">`;
    qb += `<div style="display:flex;align-items:flex-start;gap:5px;margin-bottom:6px">`;
    qb += `<span style="font-weight:700;flex-shrink:0;font-size:11px">${qNum}.</span>`;
    qb += `<div style="font-weight:700;line-height:1.5;font-size:11px;flex:1;min-width:0">${renderHtmlForPreview(qRaw)}</div>`;
    qb += `</div>`;

    if (q.image_url) {
      qb += `<img src="${q.image_url}" style="max-width:200px;max-height:110px;margin:2px 0 6px 20px;border-radius:3px;border:1px solid #e5e7eb;display:block" />`;
    }

    const sortedOpts = [...(q.options || [])].sort((a: any, b: any) =>
      (a.display_order ?? a.option_order ?? 0) - (b.display_order ?? b.option_order ?? 0)
    ).filter((o: any) => o.option_text || o.text || o.option_text_hi);

    qb += `<div style="margin-left:20px">`;
    for (let i = 0; i < sortedOpts.length; i++) {
      const o = sortedOpts[i] as any;
      const label = String.fromCharCode(65 + i);
      const oRaw = (options.language === 'hi' && o.option_text_hi)
        ? o.option_text_hi
        : (o.option_text || o.text || '');
      const isCorrect = options.showAnswers && o.is_correct;
      const color = isCorrect ? '#166534' : '#374151';
      const weight = isCorrect ? '700' : '400';
      qb += `<div style="padding:2px 6px;margin-bottom:2px;font-size:10.5px;color:${color};font-weight:${weight}">`;
      qb += `<span style="font-weight:700;margin-right:3px;color:${isCorrect ? '#16a34a' : 'inherit'}">${label}.</span><span>${renderHtmlForPreview(oRaw)}</span>`;
      if (o.image_url) {
        qb += `<img src="${o.image_url}" style="max-width:160px;max-height:80px;margin:3px 0 2px;border-radius:3px;border:1px solid #e5e7eb;display:block" />`;
      }
      qb += `</div>`;
    }
    qb += `</div>`;

    if (options.showExplanations && (q.explanation || q.explanation_hi)) {
      const expRaw = (options.language === 'hi' && q.explanation_hi) ? q.explanation_hi : q.explanation;
      qb += `<div style="margin-top:6px;margin-left:20px;margin-right:12px;padding:5px 10px 5px 8px;background:#f0fdf4;border-left:3px solid #22c55e;border-radius:0 3px 3px 0;color:#166534;font-size:10px;font-style:italic;overflow:hidden;box-sizing:border-box">`;
      qb += `<strong style="font-style:normal">Explanation:</strong> ${renderHtmlForPreview(expRaw)}`;
      qb += `</div>`;
    }

    qb += `</div>`;
    blocks.push({ kind: 'question', html: qb });
    qNum++;
  }

  // ── Measure every block's real rendered height (one off-screen reflow) ──────
  // Width matches the page content column (page width minus left/right padding).
  // Images are forced to their max-height so the packer reserves space for them
  // even before they finish loading during rasterization.
  const blockHeights: number[] = blocks.map(() => 0);
  if (blocks.length > 0 && typeof document !== 'undefined') {
    const measureHost = document.createElement('div');
    measureHost.style.cssText =
      `position:fixed;left:-100000px;top:0;width:${PAGE_W}px;background:#fff;` +
      `font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#141414;box-sizing:border-box;`;
    const measureInner = document.createElement('div');
    measureInner.style.cssText = `padding:0 ${MARGIN}px;box-sizing:border-box;`;
    measureInner.innerHTML = blocks.map((b) => b.html).join('');
    measureHost.appendChild(measureInner);
    document.body.appendChild(measureHost);
    measureInner.querySelectorAll('img').forEach((img) => {
      const mh = (img as HTMLElement).style.maxHeight;
      if (mh) (img as HTMLElement).style.height = mh;
    });
    const children = Array.from(measureInner.children) as HTMLElement[];
    for (let i = 0; i < children.length && i < blockHeights.length; i++) {
      blockHeights[i] = children[i].getBoundingClientRect().height;
    }
    document.body.removeChild(measureHost);
  }

  // ── Pack blocks into pages by available content height ──────────────────────
  const GAP = 10; // px between blocks (matches each block's margin-bottom)
  const footerReservePx = options.footerBanner ? Math.round(PAGE_H * 0.15) + 6 : 0;
  // Usable height = page height − top padding − bottom padding − footer strip −
  // a little slack for the page-number line at the bottom.
  const availableHeight = PAGE_H - MARGIN * 2 - footerReservePx - 14;

  const pageContents: string[] = [];
  let cur = '';
  let curH = 0;
  const pushPage = () => {
    if (cur) {
      pageContents.push(cur);
      cur = '';
      curH = 0;
    }
  };

  for (let i = 0; i < blocks.length; i++) {
    const blockH = blockHeights[i] + GAP;
    if (blocks[i].kind === 'section') {
      // Keep a section header with at least its first question (avoid an orphan
      // header stranded at the bottom of a page).
      const nextH = i + 1 < blocks.length ? blockHeights[i + 1] + GAP : 0;
      if (curH > 0 && curH + blockH + nextH > availableHeight) pushPage();
    } else if (curH > 0 && curH + blockH > availableHeight) {
      pushPage();
    }
    cur += blocks[i].html;
    curH += blockH;
  }
  pushPage();

  // ── Emit one A4 page per packed chunk ───────────────────────────────────────
  for (let p = 0; p < pageContents.length; p++) {
    const isLast = p === pageContents.length - 1;
    html += `<div data-pdf-page="true" style="${pageStyle}">`;
    html += pageBadge(`Page ${p + 1}`);
    html += `<div style="${contentStyle}">`;
    if (options.headerText) {
      html += `<div style="text-align:center;font-size:9px;color:#9ca3af;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">${options.headerText}</div>`;
    }
    html += pageContents[p];
    if (isLast && options.footerText) {
      html += `<div style="text-align:center;color:#9ca3af;font-size:10px;margin-top:12px;padding-top:6px;border-top:1px solid #e5e7eb">${options.footerText}</div>`;
    }
    html += `<div style="position:absolute;bottom:${options.footerBanner ? '15%' : '8px'};left:0;right:0;text-align:center;font-size:8px;color:#d1d5db;z-index:2">Page ${p + 1}</div>`;
    html += `</div>`;
    html += watermarkOverlay;
    html += footerOverlay;
    html += `</div>`;
  }

  // ── Back cover banner ───────────────────────────────────────────────────────
  if (options.backCoverBanner) {
    html += `<div data-pdf-page="true" style="${pageStyle}">`;
    html += pageBadge('Back Cover');
    html += `<img src="${options.backCoverBanner}" style="width:100%;height:${PAGE_H}px;object-fit:cover;display:block" />`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// Default options for the public "Download PDF" buttons (no banners; answers and
// explanations included, watermark on, cover page on).
const DEFAULT_HTML_OPTIONS: PdfOptions = {
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

// One-call convenience used by the category/exam pages: build the page HTML from
// the exam data and rasterize it to a downloaded PDF.
export async function downloadExamPdf(examData: any, options: Partial<PdfOptions> = {}): Promise<void> {
  const opts: PdfOptions = { ...DEFAULT_HTML_OPTIONS, ...options };
  const previewHtml = buildPreviewHtml(examData, opts);
  await generatePdfFromPreview(previewHtml, examData?.exam?.title || 'exam');
}
