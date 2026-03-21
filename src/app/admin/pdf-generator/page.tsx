"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, FileDown, Eye, ChevronLeft, X, Upload, ImageIcon } from 'lucide-react';
import { adminService } from '@/lib/api/adminService';
import { generateExamPDF, type PdfOptions } from '@/lib/utils/pdfGenerator';
import { Exam } from '@/types';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';

const DEFAULT_OPTIONS: PdfOptions = {
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

type BannerSlot = 'coverBanner' | 'footerBanner' | 'backCoverBanner';

const BANNER_CONFIG: { key: BannerSlot; label: string; desc: string; size: string }[] = [
  {
    key: 'coverBanner',
    label: 'Cover Banner',
    desc: 'Full A4 first page — replaces the default cover',
    size: '2480 × 3508 px  (A4 portrait, 300 DPI)',
  },
  {
    key: 'footerBanner',
    label: 'Footer Strip Banner',
    desc: 'Bottom strip on every content page — height auto-fits image aspect ratio',
    size: '2480 px wide  (height auto, max 25% of page)',
  },
  {
    key: 'backCoverBanner',
    label: 'Back Cover Banner',
    desc: 'Full A4 last page — appended after all questions',
    size: '2480 × 3508 px  (A4 portrait, 300 DPI)',
  },
];

export default function PdfGeneratorPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [options, setOptions] = useState<PdfOptions>(DEFAULT_OPTIONS);
  const [examData, setExamData] = useState<any>(null);
  const bannerInputRefs = useRef<Record<BannerSlot, HTMLInputElement | null>>({
    coverBanner: null,
    footerBanner: null,
    backCoverBanner: null,
  });

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await adminService.getExams({ search: searchQuery, limit: 10 });
      setSearchResults(result.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSelectExam = useCallback(async (exam: Exam) => {
    setSelectedExam(exam);
    setSearchResults([]);
    setSearchQuery('');
    setPreviewHtml(null);
    setExamData(null);
    try {
      const [fullExam, sectionsData] = await Promise.all([
        adminService.getExamById(exam.id),
        adminService.getExamSectionsAndQuestions(exam.id),
      ]);
      const questions = sectionsData.sections.flatMap((s: any) =>
        s.questions.map((q: any) => ({ ...q, section_id: s.id }))
      );
      setExamData({ exam: fullExam, sections: sectionsData.sections, questions });
    } catch (e) {
      console.error('Failed to load exam data', e);
    }
  }, []);

  const handleGeneratePreview = useCallback(async () => {
    if (!examData) return;
    setIsLoadingPreview(true);
    try {
      setPreviewHtml(buildPreviewHtml(examData, options));
    } finally {
      setIsLoadingPreview(false);
    }
  }, [examData, options]);

  const handleGenerate = useCallback(async () => {
    if (!examData) return;
    setIsGenerating(true);
    try {
      await generateExamPDF(examData, options);
    } catch (e) {
      console.error('PDF generation failed', e);
    } finally {
      setIsGenerating(false);
    }
  }, [examData, options]);

  const handleBannerUpload = useCallback((slot: BannerSlot, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOptions(prev => ({ ...prev, [slot]: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const removeBanner = useCallback((slot: BannerSlot) => {
    setOptions(prev => ({ ...prev, [slot]: null }));
  }, []);

  const previewWrapRef = useRef<HTMLDivElement>(null);
  const previewInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = previewWrapRef.current;
    const inner = previewInnerRef.current;
    if (!wrap || !inner || !previewHtml) return;
    const apply = () => {
      const scale = wrap.clientWidth / 680;
      inner.style.transform = `scale(${scale})`;
      inner.style.transformOrigin = 'top left';
      // After scaling, the layout height of inner is still unscaled.
      // Set a spacer height on the wrap so it doesn't collapse or overflow.
      const scaledH = inner.scrollHeight * scale;
      inner.style.marginBottom = `${scaledH - inner.scrollHeight}px`;
    };
    const t = setTimeout(apply, 20);
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [previewHtml]);

  const opt = (key: keyof PdfOptions, value: any) =>
    setOptions(prev => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumbs
            items={[AdminBreadcrumb(), { label: 'PDF Generator' }]}
            className="mb-3"
          />
          <h1 className="font-display text-3xl font-bold text-foreground">PDF Generator</h1>
          <p className="text-muted-foreground mt-1">Search an exam, customise the PDF, preview and download.</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Exam Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Select Exam</h2>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or exam UID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <ul className="mt-3 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {searchResults.map(exam => (
                <li
                  key={exam.id}
                  onClick={() => handleSelectExam(exam)}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{exam.title}</p>
                    <p className="text-xs text-gray-500">
                      {exam.exam_uid || exam.id} &middot; {exam.total_questions} Qs &middot; {exam.duration} min
                    </p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180" />
                </li>
              ))}
            </ul>
          )}

          {selectedExam && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">{selectedExam.title}</p>
                <p className="text-xs text-blue-600">
                  {selectedExam.exam_uid || selectedExam.id} &middot; {selectedExam.total_questions} questions &middot; {selectedExam.duration} min
                </p>
              </div>
              <button
                onClick={() => { setSelectedExam(null); setExamData(null); setPreviewHtml(null); }}
                className="text-blue-400 hover:text-blue-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {selectedExam && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Live Preview */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Live Preview</h2>
                <button
                  onClick={handleGeneratePreview}
                  disabled={!examData || isLoadingPreview}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  {isLoadingPreview ? 'Loading...' : 'Refresh Preview'}
                </button>
              </div>
              {!examData && (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                  Loading exam data...
                </div>
              )}
              {examData && !previewHtml && (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                  Click &quot;Refresh Preview&quot; to see the PDF layout
                </div>
              )}
              {previewHtml && (
                <div
                  ref={previewWrapRef}
                  className="border border-gray-200 rounded-lg bg-gray-100 relative overflow-x-hidden"
                  style={{ maxHeight: '800px', overflowY: 'auto' }}
                >
                  <div
                    ref={previewInnerRef}
                    style={{ width: '680px', transformOrigin: 'top left', overflow: 'visible' }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              )}
            </div>

            {/* Right: Options */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 overflow-y-auto max-h-[800px]">
              <h2 className="font-semibold text-gray-900">Customisation</h2>

              {/* Toggles */}
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                {([
                  ['showCoverPage', 'Cover Page'],
                  ['showAnswers', 'Show Answers'],
                  ['showExplanations', 'Explanations'],
                  ['showWatermark', 'Watermark'],
                ] as [keyof PdfOptions, string][]).map(([key, label]) => (
                  <div key={key as string} className="flex items-center justify-between px-4 py-3 bg-white">
                    <span className="text-sm text-gray-700">{label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!options[key]}
                      onClick={() => opt(key, !options[key])}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        options[key] ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          options[key] ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Language */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Language</p>
                <div className="flex gap-2">
                  {(['en', 'hi'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => opt('language', lang)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        options.language === lang
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {lang === 'en' ? 'English' : 'Hindi'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Header / Footer text */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Header Text</label>
                  <input
                    type="text"
                    value={options.headerText}
                    onChange={e => opt('headerText', e.target.value)}
                    placeholder="e.g. Confidential"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
                  <input
                    type="text"
                    value={options.footerText}
                    onChange={e => opt('footerText', e.target.value)}
                    placeholder="e.g. © 2026 Bharat Mock"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Banner Images */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Banner Images</p>
                <div className="space-y-3">
                  {BANNER_CONFIG.map(({ key, label, desc, size }) => (
                    <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                          <p className="text-xs font-mono text-blue-500 mt-0.5">{size}</p>
                        </div>
                        {options[key] ? (
                          <button
                            onClick={() => removeBanner(key)}
                            className="text-gray-400 hover:text-red-500 ml-2 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => bannerInputRefs.current[key]?.click()}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 ml-2 shrink-0"
                          >
                            <Upload className="w-3 h-3" /> Upload
                          </button>
                        )}
                        <input
                          ref={el => { bannerInputRefs.current[key] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleBannerUpload(key, e)}
                        />
                      </div>
                      {options[key] ? (
                        <div className="relative bg-gray-100">
                          <img
                            src={options[key]!}
                            alt={label}
                            className={`w-full object-cover ${key === 'footerBanner' ? 'max-h-16' : 'max-h-40'}`}
                          />
                          <button
                            onClick={() => bannerInputRefs.current[key]?.click()}
                            className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/50 text-white text-xs rounded hover:bg-black/70"
                          >
                            <Upload className="w-3 h-3" /> Replace
                          </button>
                          <input
                            ref={el => { bannerInputRefs.current[key] = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleBannerUpload(key, e)}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => bannerInputRefs.current[key]?.click()}
                          className={`w-full flex flex-col items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 ${
                            key === 'footerBanner' ? 'py-4' : 'py-8'
                          }`}
                        >
                          <ImageIcon className="w-5 h-5" />
                          <span className="text-xs">Click to upload {label}</span>
                          <span className="text-xs font-mono text-blue-400">{size}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!examData || isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <FileDown className="w-5 h-5" />
                {isGenerating ? 'Generating PDF...' : 'Generate & Download PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(v?: string) {
  if (!v) return '';
  const d = document.createElement('div');
  d.innerHTML = v;
  return d.textContent || '';
}

function buildPreviewHtml(examData: any, options: PdfOptions): string {
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
    `<div style="position:absolute;top:8px;right:8px;background:rgba(59,130,246,0.85);color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;z-index:10">${label}</div>`;

  // ── Footer strip overlay — height derived from image aspect ratio ──────────
  const footerOverlay = options.footerBanner
    ? `<div style="position:absolute;bottom:0;left:0;right:0;overflow:hidden">
        <img src="${options.footerBanner}" style="width:100%;display:block;object-fit:fill" />
        <div style="position:absolute;top:3px;left:6px;background:rgba(0,0,0,0.5);color:#fff;font-size:8px;padding:1px 5px;border-radius:3px">Footer Strip</div>
       </div>`
    : '';

  let html = `<div style="background:#f3f4f6;padding:16px;">`;

  // ── Page 1: Cover banner ────────────────────────────────────────────────────
  if (options.coverBanner) {
    html += `<div style="${pageStyle}">`;
    html += pageBadge('Cover Page');
    html += `<img src="${options.coverBanner}" style="width:100%;height:${PAGE_H}px;object-fit:cover;display:block" />`;
    html += `</div>`;
  }

  // ── Content pages ───────────────────────────────────────────────────────────
  // We'll simulate page breaks by splitting content into chunks.
  // Each "page" is a div with fixed height and overflow hidden.
  // We use a simple approach: one page for cover info, then questions grouped.

  // Cover info page
  if (options.showCoverPage) {
    html += `<div style="${pageStyle}">`;
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
    html += footerOverlay;
    html += `</div>`;
  }

  // Questions — each question in its own "page block" for clarity
  // Group into pages: ~4 questions per page (approximate)
  const QUESTIONS_PER_PAGE = 4;
  let qNum = 1;
  let lastSectionId: string | null = null;
  let pageBuffer = '';
  let pageQCount = 0;
  let pageIndex = 0;

  const flushPage = (isLast = false) => {
    if (!pageBuffer) return;
    pageIndex++;
    html += `<div style="${pageStyle}">`;
    html += pageBadge(`Page ${pageIndex}`);
    html += `<div style="${contentStyle}">`;
    if (options.headerText) {
      html += `<div style="text-align:center;font-size:9px;color:#9ca3af;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #f3f4f6">${options.headerText}</div>`;
    }
    html += pageBuffer;
    if (isLast && options.footerText) {
      html += `<div style="text-align:center;color:#9ca3af;font-size:10px;margin-top:12px;padding-top:6px;border-top:1px solid #e5e7eb">${options.footerText}</div>`;
    }
    html += `<div style="position:absolute;bottom:${options.footerBanner ? '15%' : '8px'};left:0;right:0;text-align:center;font-size:8px;color:#d1d5db">Page ${pageIndex}</div>`;
    html += `</div>`;
    html += footerOverlay;
    html += `</div>`;
    pageBuffer = '';
    pageQCount = 0;
  };

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];

    if (q.section_id !== lastSectionId) {
      const sec = sectionMap.get(q.section_id) as any;
      if (sec) {
        if (pageQCount >= QUESTIONS_PER_PAGE) flushPage();
        pageBuffer += `<div style="background:#dbeafe;border:1px solid #bfdbfe;padding:6px 10px;border-radius:4px;font-weight:700;font-size:11px;color:#1e3a8a;margin:12px 0 8px">${sec.name}</div>`;
        lastSectionId = q.section_id;
      }
    }

    if (pageQCount >= QUESTIONS_PER_PAGE) flushPage();

    const qText = stripHtml(q.text || q.question_text || '');
    pageBuffer += `<div style="margin-bottom:10px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:5px;background:#fafafa">`;
    pageBuffer += `<div style="display:flex;align-items:flex-start;gap:5px;margin-bottom:6px">`;
    pageBuffer += `<span style="font-weight:700;flex-shrink:0;font-size:11px">${qNum}.</span>`;
    pageBuffer += `<span style="font-weight:700;line-height:1.5;font-size:11px">${qText}</span>`;
    pageBuffer += `</div>`;

    if (q.image_url) {
      pageBuffer += `<img src="${q.image_url}" style="max-width:200px;max-height:110px;margin:2px 0 6px 20px;border-radius:3px;border:1px solid #e5e7eb;display:block" />`;
    }

    const sortedOpts = [...(q.options || [])].sort((a: any, b: any) =>
      (a.display_order ?? a.option_order ?? 0) - (b.display_order ?? b.option_order ?? 0)
    );

    pageBuffer += `<div style="margin-left:20px">`;
    for (let i = 0; i < sortedOpts.length; i++) {
      const o = sortedOpts[i] as any;
      const label = String.fromCharCode(65 + i);
      const oText = stripHtml(o.option_text || o.text || '');
      const isCorrect = options.showAnswers && o.is_correct;
      const color = isCorrect ? '#166534' : '#374151';
      const weight = isCorrect ? '700' : '400';
      pageBuffer += `<div style="padding:2px 6px;margin-bottom:2px;font-size:10.5px;color:${color};font-weight:${weight}">`;
      pageBuffer += `<span style="font-weight:700;margin-right:3px;color:${isCorrect ? '#16a34a' : 'inherit'}">${label}.</span>${oText}`;
      if (o.image_url) {
        pageBuffer += `<img src="${o.image_url}" style="max-width:160px;max-height:80px;margin:3px 0 2px;border-radius:3px;border:1px solid #e5e7eb;display:block" />`;
      }
      pageBuffer += `</div>`;
    }
    pageBuffer += `</div>`;

    if (options.showExplanations && q.explanation) {
      pageBuffer += `<div style="margin-top:6px;margin-left:20px;padding:5px 8px;background:#f0fdf4;border-left:3px solid #22c55e;border-radius:0 3px 3px 0;color:#166534;font-size:10px;font-style:italic">`;
      pageBuffer += `<strong style="font-style:normal">Explanation:</strong> ${stripHtml(q.explanation)}`;
      pageBuffer += `</div>`;
    }

    pageBuffer += `</div>`;
    qNum++;
    pageQCount++;
  }

  flushPage(true);

  // ── Back cover banner ───────────────────────────────────────────────────────
  if (options.backCoverBanner) {
    html += `<div style="${pageStyle}">`;
    html += pageBadge('Back Cover');
    html += `<img src="${options.backCoverBanner}" style="width:100%;height:${PAGE_H}px;object-fit:cover;display:block" />`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}
