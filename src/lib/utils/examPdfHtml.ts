// Shared exam-PDF generator built on html2canvas + jsPDF.
//
// The PDF is produced by rasterizing real HTML "pages" (one source of truth),
// which renders rich-text content, tables, MathML and images reliably — unlike
// the older pure-jsPDF text walker (see pdfGenerator.ts) which dropped images
// and cropped long content. Both the admin PDF generator and the public
// category/exam "Download PDF" buttons use this module.

import { type PdfOptions } from '@/lib/utils/pdfGenerator';
import { buildDefaultInstructions, formatDuration, hasCustomInstructions } from '@/lib/examInstructions';

// Exam schedule is stored as a timestamptz; render it in IST so the printed
// date/time match what candidates expect (kept in sync with the backend
// src/utils/examPdfHtml.js).
function formatExamDate(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatExamTime(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
  }).toLowerCase();
}

function escHtml(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Order questions so sections stay grouped (in section_order) and every
// comprehension passage's questions stay together, so the passage prints once,
// right before them. Kept in sync with the backend orderQuestionsForPrint.
function orderQuestionsForPrint(questions: any[], sections: any[]): any[] {
  const list = Array.isArray(questions) ? questions : [];

  // Give every distinct section a UNIQUE rank so its questions stay contiguous
  // (otherwise the section header re-emits on each question). Ordered by
  // section_order, then first appearance — the latter breaks ties when
  // section_order is missing OR duplicated (e.g. every section at 0).
  const sectionMeta = new Map<string, number>(
    (sections || []).map((s: any, i: number) => [s.id, typeof s.section_order === 'number' ? s.section_order : Number.MAX_SAFE_INTEGER])
  );
  const firstSeen = new Map<string, number>();
  list.forEach((q, i) => { if (!firstSeen.has(q.section_id)) firstSeen.set(q.section_id, i); });
  const distinctSids = [...firstSeen.keys()].sort((a, b) => {
    const oa = sectionMeta.has(a) ? (sectionMeta.get(a) as number) : Number.MAX_SAFE_INTEGER;
    const ob = sectionMeta.has(b) ? (sectionMeta.get(b) as number) : Number.MAX_SAFE_INTEGER;
    return (oa - ob) || ((firstSeen.get(a) as number) - (firstSeen.get(b) as number));
  });
  const sectionRank = new Map<string, number>(distinctSids.map((sid, i) => [sid, i]));

  const rankSection = (q: any) =>
    sectionRank.has(q.section_id) ? (sectionRank.get(q.section_id) as number) : Number.MAX_SAFE_INTEGER;
  const rankQuestion = (q: any) => q.question_order ?? q.question_number ?? Number.MAX_SAFE_INTEGER;

  const sorted = list
    .map((q, i) => ({ q, i }))
    .sort((a, b) =>
      (rankSection(a.q) - rankSection(b.q)) ||
      (rankQuestion(a.q) - rankQuestion(b.q)) ||
      (a.i - b.i)
    )
    .map((x) => x.q);

  const ordered: any[] = [];
  const used = new Array(sorted.length).fill(false);
  for (let i = 0; i < sorted.length; i++) {
    if (used[i]) continue;
    const pid = sorted[i].passage_id || null;
    if (pid) {
      const sid = sorted[i].section_id;
      for (let j = i; j < sorted.length; j++) {
        if (!used[j] && (sorted[j].passage_id || null) === pid && sorted[j].section_id === sid) {
          ordered.push(sorted[j]);
          used[j] = true;
        }
      }
    } else {
      ordered.push(sorted[i]);
      used[i] = true;
    }
  }
  return ordered;
}

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
    img.setAttribute('style', 'max-width:100%;width:auto;max-height:340px;display:block;margin:4px 0;border-radius:3px;border:1px solid #e5e7eb;box-sizing:border-box;');
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
    // Each wait is time-bounded. A proxied CDN image whose request STALLS (backend
    // slow/unreachable, or a dead URL that hangs instead of 404ing) fires neither
    // load nor error — without this cap the whole export hangs on "Generating
    // PDF..." forever. On timeout we give up on that one image and render the rest.
    const IMAGE_LOAD_TIMEOUT_MS = 12000;
    await Promise.all(
      images.map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              let settled = false;
              const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve();
              };
              const timer = setTimeout(finish, IMAGE_LOAD_TIMEOUT_MS);
              img.onload = finish;
              img.onerror = finish;
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

    // ── Batch pages into chunks, one html2canvas call per chunk ────────────────
    // A 200-question paper is ~40 pages, and the old code called html2canvas once
    // per page. Each call re-clones the DOM into a sandbox and re-parses the whole
    // app stylesheet — a large FIXED cost paid per call, which dominated for big
    // papers. Rendering several pages per call amortises that cost; the chunk
    // canvas is then sliced back into individual A4 pages with a cheap drawImage.
    const SCALE = 2;
    // Stay well under the browser canvas-height cap (~32,767px; Safari lower). At
    // SCALE 2 a 5000px CSS chunk => 10,000px tall canvas — safe on every engine.
    const MAX_CHUNK_CSS_PX = 5000;

    const pageWidth = pages[0].getBoundingClientRect().width;

    // Relocate each group of pages into its own wrapper so a single html2canvas
    // call captures the whole group. Page nodes (and their absolutely-positioned
    // watermark/footer children) move intact.
    const chunks: HTMLElement[][] = [];
    let curChunk: HTMLElement[] = [];
    let curHeight = 0;
    for (const page of pages) {
      const h = page.getBoundingClientRect().height;
      if (curChunk.length && curHeight + h > MAX_CHUNK_CSS_PX) {
        chunks.push(curChunk);
        curChunk = [];
        curHeight = 0;
      }
      curChunk.push(page);
      curHeight += h;
    }
    if (curChunk.length) chunks.push(curChunk);

    const chunkWrappers = chunks.map((chunkPages) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = `width:${pageWidth}px;background:#fff;`;
      chunkPages.forEach((p) => wrap.appendChild(p));
      host.appendChild(wrap);
      return wrap;
    });

    const html2canvas = (await import('html2canvas')).default;
    const { default: JsPDF } = await import('jspdf');
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const A4_W = 210;
    const A4_H = 297;

    // One reusable canvas for slicing, resized per page.
    const slice = document.createElement('canvas');
    const sctx = slice.getContext('2d');
    let pageAdded = false;

    // Reject rather than hang if a single html2canvas call gets stuck, so the
    // caller's spinner clears and the error is visible instead of a dead UI.
    const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
      ]);

    for (let c = 0; c < chunkWrappers.length; c++) {
      const wrap = chunkWrappers[c];
      // Yield to the event loop between chunks: lets the browser paint the
      // "Generating…" state, stay responsive, and reclaim the previous chunk's
      // canvas memory before allocating the next (important for big papers).
      if (c > 0) await new Promise<void>((r) => setTimeout(r, 0));
      const canvas = await withTimeout(
        html2canvas(wrap, {
          scale: SCALE,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 12000,
        }),
        60000,
        `PDF page render (chunk ${c + 1}/${chunkWrappers.length})`
      );

      // Slice this chunk canvas back into its constituent A4 pages using each
      // page's exact offset within the wrapper (robust against any sub-pixel gap).
      const wrapTop = wrap.getBoundingClientRect().top;
      for (const page of chunks[c]) {
        const r = page.getBoundingClientRect();
        const sy = Math.round((r.top - wrapTop) * SCALE);
        const sh = Math.round(r.height * SCALE);
        if (sh <= 0) continue;

        let imgData: string;
        if (sctx) {
          slice.width = canvas.width;
          slice.height = sh;
          sctx.clearRect(0, 0, slice.width, slice.height);
          sctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
          imgData = slice.toDataURL('image/jpeg', 0.92);
        } else {
          // 2D context unavailable (extremely rare) — fall back to the whole chunk.
          imgData = canvas.toDataURL('image/jpeg', 0.92);
        }

        if (pageAdded) doc.addPage();
        pageAdded = true;

        // Fit to A4 preserving aspect ratio (a page taller than A4 is scaled down).
        let w = A4_W;
        let h = (sh / canvas.width) * A4_W;
        if (h > A4_H) {
          w = (A4_H / h) * A4_W;
          h = A4_H;
        }
        doc.addImage(imgData, 'JPEG', (A4_W - w) / 2, 0, w, h, undefined, 'FAST');
      }
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

  // Cover info page — brand mark, then a bordered exam-info table (matches the
  // reference paper), then the candidate instructions.
  if (options.showCoverPage) {
    const durationMinutes = Number(exam.duration) || 0;
    const durationLabel = formatDuration(durationMinutes);

    html += `<div data-pdf-page="true" style="${pageStyle}">`;
    html += pageBadge('Cover Info');
    html += `<div style="${contentStyle}">`;
    if (options.headerText) {
      html += `<div style="text-align:center;font-size:10px;color:#6b7280;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb">${options.headerText}</div>`;
    }

    // Brand mark, top-left.
    html += `<div style="margin:0 0 14px"><img src="/logo.png" style="height:34px;width:auto;display:block" onerror="this.style.display='none'" /></div>`;

    // Exam-info table.
    const infoRows: Array<[string, string]> = [];
    const dateStr = formatExamDate(exam.exam_date || exam.start_date);
    const timeStr = formatExamTime(exam.exam_date || exam.start_date);
    if (dateStr) infoRows.push(['Exam Date', dateStr]);
    if (timeStr) infoRows.push(['Exam Time', timeStr]);
    infoRows.push(['Exam Name', escHtml(exam.title || '-')]);
    infoRows.push(['Duration', durationLabel]);
    infoRows.push(['Total Questions', escHtml(exam.total_questions ?? '-')]);
    infoRows.push(['Total Marks', escHtml(exam.total_marks ?? '-')]);
    html += `<table style="width:100%;border-collapse:collapse;margin:2px 0 18px;font-size:11.5px;color:#1a1a1a"><tbody>`;
    for (const [label, value] of infoRows) {
      html += `<tr>
        <td style="border:1px solid #c7ccd1;padding:6px 10px;width:30%;font-weight:700;background:#f4f6f9;white-space:nowrap">${label}</td>
        <td style="border:1px solid #c7ccd1;padding:6px 10px">${value}</td>
      </tr>`;
    }
    html += `</tbody></table>`;

    html += `<div style="margin-top:4px;font-size:13px;font-weight:700;color:#141414">Instructions</div>`;
    if (hasCustomInstructions(exam.instructions)) {
      // Admin-authored instructions for this exam — rendered through the same
      // sanitiser as question content so pasted styling can't distort the page.
      html += `<div style="margin:6px 0 0;font-size:10.5px;line-height:1.7;color:#141414">${renderHtmlForPreview(exam.instructions)}</div>`;
    } else {
      // Shared with the attempt screen so on-screen and printed copy can't drift.
      const defaults = buildDefaultInstructions({
        sectionCount: sections.length,
        totalQuestions: Number(exam.total_questions) || 0,
        durationMinutes,
        marksPerQuestion: sections[0]?.marks_per_question ?? null,
        negativeMarks: exam.negative_marking ? exam.negative_mark_value ?? null : null,
      });
      html += `<ol style="margin:6px 0 0;padding-left:18px;font-size:10.5px;line-height:1.7;color:#141414">`;
      for (const line of defaults) html += `<li>${line}</li>`;
      html += `</ol>`;
    }
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
  // Structure mirrors a printed question paper: the whole paper is presented first
  // with questions and options only, then the answer key and explanations follow in
  // their own section starting on a fresh page. Answers are deliberately NOT shown
  // beside the questions — that let a reader see the answer while attempting.
  type ContentBlock = {
    html: string;
    kind: 'section' | 'passage' | 'question' | 'heading' | 'answer';
    /** Start a new page before this block regardless of remaining space. */
    breakBefore?: boolean;
  };
  const blocks: ContentBlock[] = [];
  // Collected while walking the questions, emitted after every question is laid out.
  const answerEntries: { num: number; letter: string; explanation: string; explanationImage: string }[] = [];
  let qNum = 1;
  let lastSectionId: string | null = null;
  let firstSection = true;
  const shownPassages = new Set<string>();

  // Group sections + comprehension passages so passages print once, right before
  // their questions (kept in sync with the backend).
  const printQuestions = orderQuestionsForPrint(questions, sections);
  for (let qi = 0; qi < printQuestions.length; qi++) {
    const q = printQuestions[qi];

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
          // Every section starts on a fresh page. The first section breaks too when
          // a cover-info page precedes it; without one it stays on page 1 so the
          // paper doesn't open blank.
          breakBefore: !firstSection || options.showCoverPage,
          // Full-width blue banner so the start of a section is unmistakable.
          html: `<div style="font-size:13px;font-weight:700;color:#1d4ed8;background:#eaf1fb;border:1px solid #cdddf7;border-radius:4px;padding:8px 12px;margin:16px 0 12px">${sectionName}</div>`,
        });
        firstSection = false;
      }
      lastSectionId = q.section_id;
    }

    // Comprehension passage: shown once, before the first question that references
    // it (grouping guarantees the rest follow contiguously).
    const passageId = q.passage_id || null;
    if (passageId && q.passage && !shownPassages.has(passageId)) {
      const passageContent = (options.language === 'hi' && q.passage.content_hi)
        ? q.passage.content_hi
        : q.passage.content;
      blocks.push({
        kind: 'passage',
        html: `<div style="background:#f8fafc;border-left:3px solid #cdddf7;padding:8px 10px;margin-bottom:12px">
          <div style="font-weight:700;font-size:11px;color:#141414;margin-bottom:3px">${q.passage.title || 'Comprehension'}</div>
          <div style="font-size:11px;line-height:1.55;color:#141414">${renderHtmlForPreview(passageContent)}</div>
        </div>`,
      });
      shownPassages.add(passageId);
    }

    const qRaw = (options.language === 'hi' && q.text_hi)
      ? q.text_hi
      : (q.text || q.question_text || '');
    // Flat layout (no card chrome) to match a printed question paper. Question
    // text is large + semi-bold so a new question is easy to spot.
    let qb = `<div style="margin-bottom:15px">`;
    qb += `<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:6px">`;
    qb += `<span style="font-weight:700;flex-shrink:0;font-size:12.5px">${qNum}.</span>`;
    qb += `<div style="line-height:1.55;font-size:12.5px;font-weight:600;color:#111827;flex:1;min-width:0">${renderHtmlForPreview(qRaw)}</div>`;
    qb += `</div>`;

    if (q.image_url) {
      qb += `<img src="${q.image_url}" style="max-width:200px;max-height:110px;margin:2px 0 6px 20px;border-radius:3px;border:1px solid #e5e7eb;display:block" />`;
    }

    // Keep an option if it has ANY content — text OR an image. Image-only options
    // were being dropped by a text-only filter, so their images never showed.
    const sortedOpts = [...(q.options || [])].sort((a: any, b: any) =>
      (a.display_order ?? a.option_order ?? 0) - (b.display_order ?? b.option_order ?? 0)
    ).filter((o: any) => o.option_text || o.text || o.option_text_hi || o.image_url);

    qb += `<div style="margin-left:22px">`;
    for (let i = 0; i < sortedOpts.length; i++) {
      const o = sortedOpts[i] as any;
      // Lowercase a./b./c./d. as in the reference paper.
      const label = String.fromCharCode(97 + i);
      const oRaw = (options.language === 'hi' && o.option_text_hi)
        ? o.option_text_hi
        : (o.option_text || o.text || '');
      // Correct option is NOT highlighted inline — the reader should attempt the
      // paper first and check the answer key in the Answers section at the end.
      qb += `<div style="padding:2px 0;margin-bottom:2px;font-size:12px;color:#1f2937">`;
      qb += `<span style="margin-right:5px;font-weight:600">${label}.</span><span>${renderHtmlForPreview(oRaw)}</span>`;
      if (o.image_url) {
        qb += `<img src="${o.image_url}" style="max-width:170px;max-height:100px;margin:3px 0 2px;border-radius:3px;border:1px solid #e5e7eb;display:block" />`;
      }
      qb += `</div>`;
    }
    qb += `</div>`;

    // Per-question marking scheme, right-aligned, as in the reference paper.
    const marks = Number(q.marks);
    const negMarks = Number(q.negative_marks);
    if (Number.isFinite(marks) && marks > 0) {
      const scheme = Number.isFinite(negMarks) && negMarks > 0
        ? `(+${marks}, -${negMarks})`
        : `(+${marks})`;
      qb += `<div style="text-align:right;font-size:9px;color:#9ca3af;margin-top:2px">${scheme}</div>`;
    }

    qb += `</div>`;
    blocks.push({ kind: 'question', html: qb });

    // Stash the key + explanation for the Answers section built after this loop.
    const correctIdx = sortedOpts.findIndex((o: any) => o.is_correct);
    const expRaw = (options.language === 'hi' && q.explanation_hi) ? q.explanation_hi : q.explanation;
    answerEntries.push({
      num: qNum,
      letter: correctIdx >= 0 ? String.fromCharCode(97 + correctIdx) : '',
      explanation: options.showExplanations ? (expRaw || '') : '',
      // Some questions store the explanation figure in a dedicated field.
      explanationImage: options.showExplanations ? (q.explanation_image_url || '') : '',
    });

    qNum++;
  }

  // ── Answers & explanations section ──────────────────────────────────────────
  // The correct option is revealed only here (never beside the question), so the
  // paper can be attempted first. Always starts on a fresh page. Answer keys are
  // large + green; explanations small + grey.
  const answersToShow = answerEntries.filter(
    (a) => (options.showAnswers && a.letter) || (options.showExplanations && (a.explanation || a.explanationImage))
  );
  if ((options.showAnswers || options.showExplanations) && answersToShow.length > 0) {
    const heading = options.showExplanations ? 'Answers &amp; Explanations' : 'Answers';
    blocks.push({
      kind: 'heading',
      breakBefore: true,
      html: `<div style="font-size:16px;font-weight:700;color:#1d4ed8;text-align:center;background:#eaf1fb;border:1px solid #cdddf7;border-radius:4px;padding:8px 12px;margin-bottom:14px">${heading}</div>`,
    });

    for (const entry of answersToShow) {
      let ab = `<div style="margin-bottom:11px">`;
      ab += options.showAnswers && entry.letter
        ? `<div style="font-size:15px;font-weight:700;color:#15803d">${entry.num}. Answer: ${entry.letter.toUpperCase()}</div>`
        : `<div style="font-size:15px;font-weight:700;color:#15803d">${entry.num}.</div>`;
      if (options.showExplanations && (entry.explanation || entry.explanationImage)) {
        ab += `<div style="font-size:10px;font-weight:700;color:#6b7280;margin-top:3px">Explanation:</div>`;
        if (entry.explanation) ab += `<div style="font-size:10.5px;line-height:1.55;color:#374151">${renderHtmlForPreview(entry.explanation)}</div>`;
        if (entry.explanationImage) ab += `<img src="${entry.explanationImage}" style="max-width:100%;display:block;margin:4px 0;border-radius:3px;border:1px solid #e5e7eb" />`;
      }
      ab += `</div>`;
      blocks.push({ kind: 'answer', html: ab });
    }
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
    if (blocks[i].breakBefore) {
      // Hard break — the Answers section always opens a new page.
      pushPage();
    } else if (blocks[i].kind === 'section' || blocks[i].kind === 'passage' || blocks[i].kind === 'heading') {
      // Keep a section header or passage block with at least its first question
      // (avoid an orphan header/passage stranded at the bottom of a page).
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
