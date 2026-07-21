"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, FileDown, Eye, ChevronLeft, X, Upload, ImageIcon } from 'lucide-react';
import { adminService } from '@/lib/api/adminService';
import { type PdfOptions } from '@/lib/utils/pdfGenerator';
import { buildPreviewHtml } from '@/lib/utils/examPdfHtml';
import { generateExamPdfAdmin } from '@/lib/api/examPdfService';
import { Exam } from '@/types';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';
import { toast } from 'sonner';

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
      const result = await adminService.getExams({ search: searchQuery, limit: 20 });
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
    
    // Auto-select available language
    if (!exam.pdf_url_en && (exam.supports_hindi || exam.pdf_url_hi)) {
      setOptions(prev => ({ ...prev, language: 'hi' }));
    } else if (exam.pdf_url_en) {
      setOptions(prev => ({ ...prev, language: 'en' }));
    }
    
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

  // Auto-refresh preview when options or examData change
  useEffect(() => {
    if (!examData) return;
    setPreviewHtml(buildPreviewHtml(examData, options));
  }, [options, examData]);

  const handleGenerate = useCallback(async () => {
    if (!examData) return;
    const examId = examData.exam?.id;
    if (!examId) {
      toast.error('Missing exam id — reselect the exam and try again.');
      return;
    }
    setIsGenerating(true);
    try {
      // Rendered server-side with headless Chromium: true vector text, fast even
      // for 200-question papers, and no browser freeze. The live preview above is
      // an approximation of this output. Banners are sent as data URLs.
      const title = examData.exam?.title || 'exam';
      await generateExamPdfAdmin(
        examId,
        {
          showAnswers: options.showAnswers,
          showExplanations: options.showExplanations,
          language: options.language,
          showWatermark: options.showWatermark,
          showCoverPage: options.showCoverPage,
          headerText: options.headerText,
          footerText: options.footerText,
          coverBanner: options.coverBanner,
          footerBanner: options.footerBanner,
          backCoverBanner: options.backCoverBanner,
        },
        `${title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'exam'}.pdf`
      );
      toast.success('PDF downloaded successfully!');
    } catch (e) {
      console.error('PDF generation failed', e);
      toast.error(e instanceof Error ? `PDF generation failed: ${e.message}` : 'PDF generation failed.');
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
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{exam.title}</p>
                      <p className="text-xs text-gray-500">
                        {exam.exam_uid || exam.id} &middot; {exam.total_questions} Qs &middot; {exam.duration} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Language badges */}
                      <div className="flex gap-1">
                        {exam.pdf_url_en && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                            EN
                          </span>
                        )}
                        {(exam.supports_hindi || exam.pdf_url_hi) && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                            HI
                          </span>
                        )}
                      </div>
                      <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180" />
                    </div>
                  </div>
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
                <div className="flex gap-1 mt-1">
                  {selectedExam.pdf_url_en && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                      English PDF
                    </span>
                  )}
                  {(selectedExam.supports_hindi || selectedExam.pdf_url_hi) && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                      Hindi PDF
                    </span>
                  )}
                </div>
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
                  {(['en', 'hi'] as const)
                    .filter(lang =>
                      lang === 'en'
                        ? true // English always available — PDF generated from questions
                        : Boolean(selectedExam?.supports_hindi || selectedExam?.pdf_url_hi)
                    )
                    .map(lang => (
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
