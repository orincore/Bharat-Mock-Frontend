'use client';
// FIXME: evaluate replacing react-quill with TipTap for native SSR support

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Load editor fonts lazily — only when the block editor is mounted (admin only)
// This keeps them off the critical path for all public pages
const EDITOR_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Faustina:wght@400;500;600;700' +
  '&family=Inter:wght@400;500;600;700' +
  '&family=Roboto:wght@400;500;700' +
  '&family=Nunito:wght@400;600;700' +
  '&family=Source+Serif+Pro:wght@400;600;700' +
  '&family=Playfair+Display:wght@400;600;700' +
  '&family=Space+Mono:wght@400;700' +
  '&family=Open+Sans:wght@400;600;700' +
  '&family=Lato:wght@400;700' +
  '&family=Poppins:wght@400;600;700' +
  '&family=Merriweather:wght@400;700' +
  '&family=Lora:wght@400;700' +
  '&family=Montserrat:wght@400;600;700' +
  '&family=Work+Sans:wght@400;600;700' +
  '&family=Fira+Sans:wght@400;600' +
  '&family=Karla:wght@400;600' +
  '&family=DM+Sans:wght@400;600' +
  '&family=Raleway:wght@400;600' +
  '&family=Rubik:wght@400;600' +
  '&family=Barlow:wght@400;600' +
  '&family=Mulish:wght@400;600' +
  '&display=swap';

function useEditorFonts() {
  useEffect(() => {
    if (document.querySelector('link[data-editor-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = EDITOR_FONTS_URL;
    link.setAttribute('data-editor-fonts', 'true');
    document.head.appendChild(link);
  }, []);
}

import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Image as ImageIcon,
  Video,
  Columns,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Upload,
  UploadCloud,
  Trash,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Settings,
  Plus,
  Save,
  Play,
  Pause,
  Loader2,
  ExternalLink,
  Undo,
  Redo,
  Calendar,
  Tag,
  QuoteIcon,
  AlertTriangle,
  FileText,
  Sheet,
  MoveHorizontal,
  MoveVertical,
  Search,
  Link,
  Minimize2,
  Maximize2,
  Layout,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { BlockRenderer, getBlockIcon } from './BlockRenderer';
import { sanitizeTableCellHtml, TABLE_CELL_RESET } from './tableCellHtml';
import { adminService } from '@/lib/api/adminService';
import { examService } from '@/lib/api/examService';

interface Block {
  id: string;
  block_type: string;
  content: any;
  settings?: any;
  display_order: number;
  section_id?: string;
}

interface Section {
  id: string;
  section_key?: string;
  title: string;
  subtitle?: string;
  display_order: number;
  blocks: Block[];
  is_sidebar?: boolean;
  sidebar_tab_id?: string | null;
  text_color?: string;
  background_color?: string;
  settings?: Record<string, any>;
}

const HEADING_TAG_OPTIONS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
type HeadingTagOption = (typeof HEADING_TAG_OPTIONS)[number];

const normalizeHeadingTag = (value?: string | null, fallback: HeadingTagOption = 'h2'): HeadingTagOption =>
  HEADING_TAG_OPTIONS.includes((value || '').toLowerCase() as HeadingTagOption)
    ? ((value || '').toLowerCase() as HeadingTagOption)
    : fallback;

const TEXT_COLOR_OPTIONS = [
  { label: 'Default', value: '#111827' },
  { label: 'Blue', value: '#1d4ed8' },
  { label: 'Green', value: '#15803d' },
  { label: 'Orange', value: '#d97706' },
  { label: 'Red', value: '#b91c1c' },
  { label: 'Purple', value: '#7c3aed' }
];

const HIGHLIGHT_COLOR_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'Lemon', value: '#fef3c7' },
  { label: 'Sun', value: '#fde68a' },
  { label: 'Mint', value: '#d1fae5' },
  { label: 'Sky', value: '#bae6fd' },
  { label: 'Blush', value: '#fecdd3' }
];

const FONT_SIZE_OPTIONS = [
  { label: 'Default', value: 'inherit' },
  { label: '10', value: '10px' },
  { label: '11', value: '11px' },
  { label: '12', value: '12px' },
  { label: '13', value: '13px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '28', value: '28px' },
  { label: '32', value: '32px' },
  { label: '36', value: '36px' },
  { label: '48', value: '48px' },
];

const FONT_OPTIONS = [
  { label: 'Faustina', value: 'Faustina, serif' },
  { label: 'Default', value: 'inherit' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Nunito', value: 'Nunito, sans-serif' },
  { label: 'Source Serif Pro', value: '"Source Serif Pro", serif' },
  { label: 'Playfair Display', value: '"Playfair Display", serif' },
  { label: 'Space Mono', value: '"Space Mono", monospace' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Lora', value: 'Lora, serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Work Sans', value: '"Work Sans", sans-serif' },
  { label: 'Fira Sans', value: '"Fira Sans", sans-serif' },
  { label: 'Karla', value: 'Karla, sans-serif' },
  { label: 'DM Sans', value: '"DM Sans", sans-serif' },
  { label: 'DM Serif Text', value: '"DM Serif Text", serif' },
  { label: 'Crimson Text', value: '"Crimson Text", serif' },
  { label: 'IBM Plex Sans', value: '"IBM Plex Sans", sans-serif' },
  { label: 'IBM Plex Serif', value: '"IBM Plex Serif", serif' },
  { label: 'PT Sans', value: '"PT Sans", sans-serif' },
  { label: 'PT Serif', value: '"PT Serif", serif' },
  { label: 'Cabin', value: 'Cabin, sans-serif' },
  { label: 'Manrope', value: 'Manrope, sans-serif' },
  { label: 'Quicksand', value: 'Quicksand, sans-serif' },
  { label: 'Barlow', value: 'Barlow, sans-serif' },
  { label: 'Mulish', value: 'Mulish, sans-serif' },
  { label: 'Raleway', value: 'Raleway, sans-serif' },
  { label: 'Rubik', value: 'Rubik, sans-serif' },
  { label: 'Titillium Web', value: '"Titillium Web", sans-serif' },
  { label: 'Noto Serif', value: '"Noto Serif", serif' },
  { label: 'Noto Sans', value: '"Noto Sans", sans-serif' },
  { label: 'Catamaran', value: 'Catamaran, sans-serif' },
  { label: 'Hind', value: 'Hind, sans-serif' },
  { label: 'Heebo', value: 'Heebo, sans-serif' },
  { label: 'Josefin Sans', value: '"Josefin Sans", sans-serif' },
  { label: 'Archivo', value: 'Archivo, sans-serif' },
  { label: 'Bitter', value: 'Bitter, serif' },
  { label: 'Caladea', value: 'Caladea, serif' },
  { label: 'Cormorant Garamond', value: '"Cormorant Garamond", serif' },
  { label: 'EB Garamond', value: '"EB Garamond", serif' },
  { label: 'Spectral', value: 'Spectral, serif' },
  { label: 'Gentium Book Plus', value: '"Gentium Book Plus", serif' },
  { label: 'Tinos', value: 'Tinos, serif' },
  { label: 'Assistant', value: 'Assistant, sans-serif' },
  { label: 'Overpass', value: 'Overpass, sans-serif' },
  { label: 'Spartan', value: 'League Spartan, sans-serif' },
  { label: 'Urbanist', value: 'Urbanist, sans-serif' },
  { label: 'Sora', value: 'Sora, sans-serif' },
  { label: 'Lexend', value: 'Lexend, sans-serif' },
  { label: 'Newsreader', value: 'Newsreader, serif' },
  { label: 'Zilla Slab', value: '"Zilla Slab", serif' }
];

const deepClone = (value: any) => {
  if (!value || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
};

export interface BlockEditorMediaUploadResult {
  url: string;
  alt?: string;
  caption?: string;
}

export interface BlockEditorMediaUploadConfig {
  maxSizeMB?: number;
  onUpload: (file: File, context: { blockType: 'image' | 'video' }) => Promise<BlockEditorMediaUploadResult>;
  onUploadError?: (message: string) => void;
  onUploadSuccess?: (message?: string) => void;
}

const AdBannerContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Headline Tag</label>
        <select
          value={normalizeHeadingTag(content.headingTag, 'h3')}
          onChange={(e) => onChange({ ...content, headingTag: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          {HEADING_TAG_OPTIONS.map((tag) => (
            <option key={tag} value={tag}>{tag.toUpperCase()}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Image URL</label>
        <input
          type="text"
          value={content.imageUrl || ''}
          onChange={(e) => onChange({ ...content, imageUrl: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Destination Link</label>
        <input
          type="text"
          value={content.linkUrl || ''}
          onChange={(e) => onChange({ ...content, linkUrl: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => onChange({ ...content, headline: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={content.description || ''}
          onChange={(e) => onChange({ ...content, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">CTA Label</label>
          <input
            type="text"
            value={content.ctaLabel || ''}
            onChange={(e) => onChange({ ...content, ctaLabel: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">CTA Link</label>
          <input
            type="text"
            value={content.ctaUrl || ''}
            onChange={(e) => onChange({ ...content, ctaUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Background Color</label>
        <input
          type="text"
          value={content.backgroundColor || '#0f172a'}
          onChange={(e) => onChange({ ...content, backgroundColor: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Badge Text</label>
        <input
          type="text"
          value={content.badgeText || ''}
          onChange={(e) => onChange({ ...content, badgeText: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

const ExamCardsContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const examIds: string[] = content.examIds || [];
  const examNames: Record<string, string> = content.examNames || {};
  const examUids: Record<string, string> = content.examUids || {};
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<{ id: string; title: string; category?: string; status?: string; exam_uid?: string }[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const searchExams = React.useCallback(async (term: string) => {
    const q = term.trim();
    if (!q) { setResults([]); return; }
    try {
      setSearching(true);
      // Query both endpoints and merge, deduped by id. Neither alone is sufficient:
      //  - admin /admin/exams: searches title/slug/exam_uid + includes drafts, but is
      //    gated by checkPermission('exams','read') (403s for editor/author roles).
      //  - public /exams: no auth, but only is_published exams and search ignores exam_uid.
      // Merging means whichever endpoint can see the exam contributes it, so the
      // dropdown always populates regardless of role or publish state.
      const settled = await Promise.allSettled([
        adminService.getExams({ search: q, limit: 50 }),
        examService.getExams({ search: q, limit: 50 }),
      ]);
      const seen = new Set<string>();
      const merged: { id: string; title: string; category?: string; status?: string; exam_uid?: string }[] = [];
      for (const r of settled) {
        if (r.status !== 'fulfilled') continue;
        for (const e of ((r.value as any)?.data || [])) {
          if (!e?.id || seen.has(e.id)) continue;
          seen.add(e.id);
          merged.push({ id: e.id, title: e.title, category: e.category, status: e.status, exam_uid: e.exam_uid });
        }
      }
      setResults(merged);
      setShowDropdown(true);
    } catch (err) {
      console.error('[ExamCardsEditor] search failed', err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchExams(value), 300);
  };

  const addExam = (exam: { id: string; title: string; exam_uid?: string }) => {
    if (examIds.includes(exam.id)) return;
    onChange({
      ...content,
      examIds: [...examIds, exam.id],
      examNames: { ...examNames, [exam.id]: exam.title },
      examUids: { ...examUids, [exam.id]: exam.exam_uid || '' }
    });
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const removeExam = (id: string) => {
    const nextNames = { ...examNames };
    const nextUids = { ...examUids };
    delete nextNames[id];
    delete nextUids[id];
    onChange({
      ...content,
      examIds: examIds.filter((eid: string) => eid !== id),
      examNames: nextNames,
      examUids: nextUids
    });
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Section Title</label>
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          placeholder="Related Exams"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Title Tag</label>
        <select
          value={normalizeHeadingTag(content.headingTag, 'h3')}
          onChange={(e) => onChange({ ...content, headingTag: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          {HEADING_TAG_OPTIONS.map((tag) => (
            <option key={tag} value={tag}>{tag.toUpperCase()}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Layout</label>
          <select
            value={content.layout || 'grid'}
            onChange={(e) => onChange({ ...content, layout: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
            <option value="carousel">Carousel</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Columns</label>
          <select
            value={content.columns || 2}
            onChange={(e) => onChange({ ...content, columns: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Attach Exams ({examIds.length} added)</label>
        <div className="relative" ref={wrapperRef}>
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => { if (results.length) setShowDropdown(true); }}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Search exams by name..."
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
          {showDropdown && results.length > 0 && (
            // Rendered inline (not absolute) so the Configure panel's overflow-hidden
            // wrapper can't clip it — an absolute overlay was being cut off / invisible.
            <div className="relative z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto hide-scrollbar">
              {results.map((exam) => {
                const alreadyAdded = examIds.includes(exam.id);
                return (
                  <button
                    key={exam.id}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => addExam(exam)}
                    className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${alreadyAdded ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{exam.title}</p>
                      <p className="text-xs text-gray-500">
                        {[exam.category, exam.status].filter(Boolean).join(' · ')}
                        {exam.exam_uid && <span className="ml-1 font-mono text-gray-400">· {exam.exam_uid}</span>}
                      </p>
                    </div>
                    {alreadyAdded ? (
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">Added</span>
                    ) : (
                      <span className="text-xs text-blue-600 font-medium ml-2 flex-shrink-0">+ Add</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {showDropdown && !searching && query.trim() && results.length === 0 && (
            <div className="relative z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
              No exams found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
        {examIds.length > 0 && (
          <div className="mt-3 space-y-2">
            {examIds.map((id: string, index: number) => (
              <div key={id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700 truncate block">
                    {index + 1}. {examNames[id] || id}
                  </span>
                  {examUids[id] && (
                    <span className="text-xs font-mono text-gray-400">{examUids[id]}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeExam(id)}
                  className="ml-2 text-red-500 hover:text-red-700 text-sm font-medium flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const normalizeSections = (source: Section[]): Section[] =>
  source.map((section) => ({
    ...section,
    blocks: section.blocks || [],
    is_sidebar: section.is_sidebar ?? false,
    settings: section.settings || {}
  }));

const snapshotSections = (source: Section[]): Section[] =>
  normalizeSections(source).map((section) => ({
    ...section,
    blocks: section.blocks.map((block) => ({
      ...block,
      content: deepClone(block.content)
    }))
  }));

export const clearBlockEditorAutosave = (_key?: string) => {
  // Autosave removed — clear any legacy entries that may still exist
  if (typeof window === 'undefined') return;
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('block-editor-autosave:'))
      .forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
};

interface BlockEditorProps {
  sections: Section[];
  onSave: (sections: Section[]) => void;
  onSectionsChange?: (sections: Section[]) => void;
  tabLabel?: string;
  mediaUploadConfig?: BlockEditorMediaUploadConfig;
  reservedTabInfo?: {
    tabType: string;
    message: string;
    position?: number;
  };
  onReservedPositionChange?: (position: number) => void;
  availableTabs?: Array<{ id: string; label: string }>;
  onTocOrderClick?: () => void;
}

interface InlineRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  helperText?: string;
  variant?: 'full' | 'compact';
  onImagePaste?: (file: File) => void | Promise<void>;
  prefixControls?: React.ReactNode;
}

const EDITOR_MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

const isMeaningfulRichTextElement = (el: Element) =>
  Boolean(el.querySelector('img, table, iframe, hr, math, canvas, video, svg, audio'));

const isEmptyRichTextElement = (el: Element) => {
  const text = el.textContent?.replace(/\u00A0/g, ' ').replace(/\u200B/g, '').trim() || '';
  if (text.length > 0) return false;
  return !isMeaningfulRichTextElement(el);
};

const trimRichTextBoundaryNodes = (parent: HTMLElement) => {
  while (parent.firstChild) {
    const first = parent.firstChild;
    if (first.nodeType === Node.TEXT_NODE) {
      const text = first.textContent?.replace(/\u00a0/g, ' ') || '';
      if (!text.trim()) {
        parent.removeChild(first);
        continue;
      }
    } else if (first.nodeType === Node.ELEMENT_NODE && isEmptyRichTextElement(first as Element)) {
      parent.removeChild(first);
      continue;
    }
    break;
  }

  while (parent.lastChild) {
    const last = parent.lastChild;
    if (last.nodeType === Node.TEXT_NODE) {
      const text = last.textContent?.replace(/\u00a0/g, ' ') || '';
      if (!text.trim()) {
        parent.removeChild(last);
        continue;
      }
    } else if (last.nodeType === Node.ELEMENT_NODE && isEmptyRichTextElement(last as Element)) {
      parent.removeChild(last);
      continue;
    }
    break;
  }
};

const normalizeRichTextHtml = (html?: string | null) => {
  if (!html || typeof document === 'undefined') return (html || '').trim();

  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  tmp.querySelectorAll('meta, link, style, script, xml').forEach((node) => node.remove());

  tmp.querySelectorAll('*').forEach((element) => {
    const el = element as HTMLElement;
    if (el.namespaceURI === EDITOR_MATHML_NAMESPACE) return;

    const tagName = el.tagName.toLowerCase();
    const style = el.style;

    if (style) {
      [
        'margin',
        'margin-top',
        'margin-bottom',
        'padding-top',
        'padding-bottom',
        'text-indent',
        'line-height',
      ].forEach((property) => style.removeProperty(property));

      if (!style.cssText.trim()) {
        el.removeAttribute('style');
      }
    }

    ['class', 'id', 'dir', 'data-start', 'data-end', 'data-offset-key'].forEach((attr) => {
      if (el.hasAttribute(attr)) el.removeAttribute(attr);
    });

    if (tagName === 'a' && el.getAttribute('href')) {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }

    if ((tagName === 'p' || tagName === 'div') && isEmptyRichTextElement(el)) {
      el.remove();
      return;
    }

    if (tagName === 'span') {
      const hasUsefulAttributes = Array.from(el.attributes).some((attr) =>
        ['href', 'target', 'rel', 'src', 'alt', 'rowspan', 'colspan'].includes(attr.name)
      );
      if (!hasUsefulAttributes && !el.getAttribute('style')) {
        el.replaceWith(...Array.from(el.childNodes));
      }
    }
  });

  trimRichTextBoundaryNodes(tmp);

  let normalized = tmp.innerHTML
    .replace(/^(?:\s|&nbsp;|<br\s*\/?>|<p>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>|<div>(?:&nbsp;|\s|<br\s*\/?>)*<\/div>)+/gi, '')
    .replace(/(?:\s|&nbsp;|<br\s*\/?>|<p>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>|<div>(?:&nbsp;|\s|<br\s*\/?>)*<\/div>)+$/gi, '')
    .replace(/<p>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/<div>(?:&nbsp;|\s|<br\s*\/?>)*<\/div>/gi, '')
    .replace(/\u200B/g, '')
    .trim();

  if (normalized === '<br>' || normalized === '<br/>' || normalized === '<br />') {
    normalized = '';
  }

  return normalized;
};

const sanitizeHeadingEditorValue = (value?: string | null) =>
  (value || '')
    .replace(/<\/?h[1-6][^>]*>/gi, '')
    .trim();

export const InlineRichTextEditor: React.FC<InlineRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  rows = 4,
  className = '',
  label,
  helperText,
  variant = 'full',
  onImagePaste,
  prefixControls
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const linkInputRef = useRef<HTMLInputElement | null>(null);
  const [showMathPicker, setShowMathPicker] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    code: false,
    link: false,
    color: TEXT_COLOR_OPTIONS[0].value,
    highlight: '',
    font: FONT_OPTIONS[0].value,
    fontSize: 'inherit',
    bulletList: false,
    numberedList: false,
    alignment: 'left' as string
  });

  useEffect(() => {
    if (editorRef.current) {
      const sanitized = normalizeRichTextHtml(value || '');
      if (editorRef.current.innerHTML !== sanitized) {
        editorRef.current.innerHTML = sanitized;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    const nextValue = normalizeRichTextHtml(editorRef.current.innerHTML);
    if (editorRef.current.innerHTML !== nextValue) {
      editorRef.current.innerHTML = nextValue;
    }
    onChange(nextValue || '');
    updateActiveFormats();
  };

  const isSelectionInside = () => {
    if (typeof window === 'undefined' || !editorRef.current) return false;
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    if (!anchorNode) return false;
    return editorRef.current.contains(anchorNode);
  };

  const findAncestorTag = (node: Node | null, tagName: string) => {
    let current: Node | null = node;
    while (current && editorRef.current && current !== editorRef.current) {
      if ((current as HTMLElement).tagName === tagName) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  };

  const updateActiveFormats = React.useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!isSelectionInside()) {
      setActiveFormats({
        bold: false,
        italic: false,
        underline: false,
        code: false,
        link: false,
        color: TEXT_COLOR_OPTIONS[0].value,
        highlight: '',
        font: FONT_OPTIONS[0].value,
        fontSize: 'inherit',
        bulletList: false,
        numberedList: false,
        alignment: 'left'
      });
      return;
    }

    const bold = document.queryCommandState('bold');
    const italic = document.queryCommandState('italic');
    const underline = document.queryCommandState('underline');
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode || null;
    const code = findAncestorTag(anchorNode, 'CODE');
    const link = findAncestorTag(anchorNode, 'A');
    const bulletList = findAncestorTag(anchorNode, 'UL');
    const numberedList = findAncestorTag(anchorNode, 'OL');
    const anchorElement = (anchorNode as HTMLElement)?.nodeType === Node.ELEMENT_NODE
      ? (anchorNode as HTMLElement)
      : (anchorNode?.parentElement || null);
    const computedStyle = anchorElement ? window.getComputedStyle(anchorElement) : null;
    const color = computedStyle?.color || TEXT_COLOR_OPTIONS[0].value;
    const backgroundColor = computedStyle?.backgroundColor;
    const highlight = backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent'
      ? backgroundColor
      : '';
    const rawFontSize = computedStyle?.fontSize || '';
    const matchedSize = FONT_SIZE_OPTIONS.find(o => o.value === rawFontSize)?.value || 'inherit';

    const alignment = document.queryCommandState('justifyCenter') ? 'center'
      : document.queryCommandState('justifyRight') ? 'right'
        : document.queryCommandState('justifyFull') ? 'justify'
          : 'left';
    setActiveFormats({
      bold,
      italic,
      underline,
      code,
      link,
      color,
      highlight,
      font: computedStyle?.fontFamily || FONT_OPTIONS[0].value,
      fontSize: matchedSize,
      bulletList,
      numberedList,
      alignment
    });
  }, []);

  const exec = (command: string, arg?: string) => {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    handleInput();
    updateActiveFormats();
  };

  const insertLink = () => {
    if (typeof window === 'undefined') return;
    // Save current selection
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
    // Pre-fill URL if cursor is inside an existing link
    const anchorNode = sel?.anchorNode || null;
    let existingHref = '';
    let cur: Node | null = anchorNode;
    while (cur && editorRef.current && cur !== editorRef.current) {
      if ((cur as HTMLElement).tagName === 'A') {
        existingHref = (cur as HTMLAnchorElement).href || '';
        break;
      }
      cur = cur.parentNode;
    }
    setLinkUrl(existingHref);
    setShowLinkPopover(true);
    setTimeout(() => linkInputRef.current?.focus(), 50);
  };

  const applyLink = () => {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
    if (linkUrl.trim()) {
      const url = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
      document.execCommand('createLink', false, url);
      // Set target="_blank" on the newly created link
      const links = editorRef.current?.querySelectorAll('a');
      links?.forEach(a => { if (!a.target) a.target = '_blank'; });
    } else {
      document.execCommand('unlink', false);
    }
    handleInput();
    updateActiveFormats();
    setShowLinkPopover(false);
    setLinkUrl('');
  };

  const removeLink = () => {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
    document.execCommand('unlink', false);
    handleInput();
    updateActiveFormats();
    setShowLinkPopover(false);
    setLinkUrl('');
  };

  const insertCode = () => {
    if (typeof document === 'undefined') return;
    const selection = window.getSelection();
    const selectedText = selection?.toString() || 'code';
    document.execCommand('insertHTML', false, `<code>${selectedText}</code>`);
    handleInput();
    updateActiveFormats();
  };

  const insertLineBreak = () => {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    if (document.queryCommandSupported('insertLineBreak')) {
      document.execCommand('insertLineBreak');
    } else if (document.queryCommandSupported('insertParagraph')) {
      document.execCommand('insertParagraph');
    } else {
      document.execCommand('insertHTML', false, '<br /><span data-inline-break></span>');
    }
    handleInput();
    updateActiveFormats();
  };

  const saveCursorPosition = () => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const insertMathSymbol = (symbol: string) => {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    // Restore saved cursor position if selection was lost when picker opened
    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    document.execCommand('insertText', false, symbol);
    handleInput();
    setShowMathPicker(false);
  };

  const MATH_SYMBOLS: { label: string; symbols: string[] }[] = [
    { label: 'Operators', symbols: ['+', '−', '×', '÷', '±', '∓', '∗', '∝', '∞', '√', '∛', '∜'] },
    { label: 'Relations', symbols: ['=', '≠', '<', '>', '≤', '≥', '≈', '≡', '∼', '∝', '⊂', '⊃', '⊆', '⊇'] },
    { label: 'Greek', symbols: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'λ', 'μ', 'π', 'σ', 'τ', 'φ', 'ω', 'Δ', 'Σ', 'Π', 'Ω'] },
    { label: 'Fractions', symbols: ['½', '⅓', '⅔', '¼', '¾', '⅕', '⅖', '⅗', '⅘', '⅙', '⅚', '⅛', '⅜', '⅝', '⅞'] },
    { label: 'Superscript', symbols: ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', 'ⁿ'] },
    { label: 'Subscript', symbols: ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'] },
    { label: 'Geometry', symbols: ['°', '∠', '⊥', '∥', '△', '□', '○', '∴', '∵', '∫', '∂', '∇'] },
    { label: 'Sets', symbols: ['∈', '∉', '∪', '∩', '∅', '∀', '∃', '∄', '⊕', '⊗'] },
    { label: 'Arrows', symbols: ['→', '←', '↑', '↓', '↔', '⇒', '⇐', '⇔', '↦'] },
    { label: 'Misc', symbols: ['%', '‰', '′', '″', '|', '‖', '…', '·', '∙', '⋯', '⋮', '⋱'] },
  ];

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      const isListActive = activeFormats.bulletList || activeFormats.numberedList;
      if (!event.shiftKey && isListActive) {
        return; // allow normal list item behavior
      }
      event.preventDefault();
      if (event.shiftKey) {
        insertLineBreak();
      }
    }
  };

  const handleEditorPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.clipboardData?.items || []);
    const files = Array.from(event.clipboardData?.files || []);

    // Handle image paste
    let file = items.find(item => item.type.startsWith('image/'))?.getAsFile() || null;
    if (!file) file = files.find(f => f.type.startsWith('image/')) || null;
    if (file) {
      event.preventDefault();
      if (onImagePaste) onImagePaste(file);
      return;
    }

    const PASTE_MATHML_TAGS = [
      'math', 'mrow', 'mi', 'mn', 'mo', 'mfrac', 'msup', 'msub', 'msubsup',
      'msqrt', 'mroot', 'mtext', 'mspace', 'mtable', 'mtr', 'mtd', 'mover',
      'munder', 'munderover', 'menclose', 'mstyle', 'merror', 'mpadded',
      'mphantom', 'mmultiscripts', 'none', 'mprescripts', 'semantics', 'annotation',
    ];

    // For text/HTML paste: preserve structure, strip only colors/fonts
    const html = event.clipboardData?.getData('text/html');
    if (html) {
      event.preventDefault();
      const tmp = document.createElement('div');
      tmp.innerHTML = DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ADD_TAGS: ['font', 'code', 'sup', 'sub', 'table', 'thead', 'tbody', 'tr', 'th', 'td', ...PASTE_MATHML_TAGS],
        ADD_ATTR: ['style', 'class', 'colspan', 'rowspan', 'border', 'cellpadding', 'cellspacing',
          'xmlns', 'display', 'mathvariant', 'mathsize', 'stretchy', 'fence', 'separator',
          'lspace', 'rspace', 'linethickness', 'numalign', 'denomalign', 'bevelled',
          'columnalign', 'rowalign', 'columnspacing', 'rowspacing', 'displaystyle',
          'scriptlevel', 'notation', 'encoding', 'color', 'face', 'size'
        ]
      });

      const normalizedHtml = normalizeRichTextHtml(tmp.innerHTML);
      document.execCommand('insertHTML', false, normalizedHtml);
      handleInput();
      return;
    }

    // Plain text fallback — preserves Unicode math chars (𝑃, ₃, ², etc.)
    const text = event.clipboardData?.getData('text/plain');
    if (text) {
      event.preventDefault();
      // Trim empty lines/whitespace from start and end
      const trimmedText = text.replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, '');
      document.execCommand('insertText', false, trimmedText);
      handleInput();
    }
  };

  const applyTextColor = (color: string) => {
    if (typeof document === 'undefined') return;
    const appliedColor = color || TEXT_COLOR_OPTIONS[0].value;
    editorRef.current?.focus();
    document.execCommand('foreColor', false, appliedColor);
    handleInput();
    updateActiveFormats();
  };

  const applyHighlightColor = (color: string) => {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    const command = document.queryCommandSupported('hiliteColor') ? 'hiliteColor' : 'backColor';
    const value = color || 'transparent';
    document.execCommand(command, false, value);
    handleInput();
    updateActiveFormats();
  };

  const applyFontFamily = (fontFamily: string) => {
    if (typeof document === 'undefined') return;
    const targetFont = fontFamily === 'inherit' ? 'inherit' : fontFamily;
    editorRef.current?.focus();
    document.execCommand('fontName', false, targetFont);
    handleInput();
    updateActiveFormats();
  };

  const applyFontSize = (size: string) => {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    if (size === 'inherit') {
      document.execCommand('removeFormat');
    } else {
      // Use font[size="7"] trick: stamp size-7, then swap the <font> tag for a styled <span>
      document.execCommand('styleWithCSS', false, 'false');
      document.execCommand('fontSize', false, '7');
      const editor = editorRef.current;
      if (editor) {
        editor.querySelectorAll('font[size="7"]').forEach(el => {
          const span = document.createElement('span');
          span.style.fontSize = size;
          span.innerHTML = (el as HTMLElement).innerHTML;
          el.parentNode?.replaceChild(span, el);
        });
      }
    }
    handleInput();
    updateActiveFormats();
  };

  useEffect(() => {
    if (typeof document === 'undefined' || !showMathPicker) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.math-picker-root')) setShowMathPicker(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showMathPicker]);

  const updateActiveFormatsRef = useRef(updateActiveFormats);
  useEffect(() => { updateActiveFormatsRef.current = updateActiveFormats; });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleSelectionChange = () => updateActiveFormatsRef.current();
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const buttons = [
    { label: 'B', title: 'Bold', action: () => exec('bold'), key: 'bold' as const },
    { label: 'I', title: 'Italic', action: () => exec('italic'), key: 'italic' as const },
    { label: 'U', title: 'Underline', action: () => exec('underline'), key: 'underline' as const },
    { label: '</>', title: 'Code', action: insertCode, key: 'code' as const },
    { label: '•', title: 'Bulleted list', action: () => exec('insertUnorderedList'), key: 'bulletList' as const },
    { label: '1.', title: 'Numbered list', action: () => exec('insertOrderedList'), key: 'numberedList' as const },
    { label: '↵', title: 'Insert line break', action: insertLineBreak },
    { label: 'Clear', title: 'Remove formatting', action: () => exec('removeFormat'), key: undefined }
  ];

  const minHeight = Math.max(28, rows * 18);

  return (
    <div className="w-full space-y-1">
      {label && <label className="block text-xs font-medium text-gray-600 mb-0.5">{label}</label>}
      <div className="border border-gray-200 rounded-lg bg-white">
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-gray-100">

          {/* Prefix slot — e.g. heading level select */}
          {prefixControls && (
            <>
              {prefixControls}
              <div className="w-px h-4 bg-gray-200 mx-0.5" />
            </>
          )}

          {/* Format buttons */}
          {buttons.map((button) => {
            const isActive = button.key ? activeFormats[button.key] : false;
            return (
              <button
                key={button.label}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={button.action}
                className={`px-1.5 py-0.5 text-xs font-semibold rounded hover:bg-gray-100 transition-colors ${isActive ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`}
                title={button.title}
              >
                {button.label}
              </button>
            );
          })}

          {/* Link */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertLink(); }}
              className={`px-1.5 py-0.5 text-xs font-semibold rounded hover:bg-gray-100 transition-colors ${activeFormats.link ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`}
              title="Insert / edit link"
            >
              Link
            </button>
            {showLinkPopover && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-2.5 w-64" onMouseDown={(e) => e.preventDefault()}>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Insert / Edit Link</p>
                <input
                  ref={linkInputRef}
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } if (e.key === 'Escape') { setShowLinkPopover(false); } }}
                  placeholder="https://example.com"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mb-1.5"
                />
                <div className="flex gap-1.5">
                  <button type="button" onClick={applyLink} className="flex-1 px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
                  {activeFormats.link && (
                    <button type="button" onClick={removeLink} className="px-2 py-1 text-xs font-semibold border border-red-300 text-red-600 rounded hover:bg-red-50">Remove</button>
                  )}
                  <button type="button" onClick={() => setShowLinkPopover(false)} className="px-2 py-1 text-xs font-semibold border border-gray-200 text-gray-600 rounded hover:bg-gray-50">✕</button>
                </div>
              </div>
            )}
          </div>

          {/* Math symbols */}
          <div className="relative math-picker-root">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); saveCursorPosition(); setShowMathPicker(v => !v); }}
              className={`px-1.5 py-0.5 text-xs font-semibold rounded hover:bg-gray-100 transition-colors ${showMathPicker ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`}
              title="Insert math symbol"
            >
              Ω
            </button>
            {showMathPicker && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-2.5 w-64" onMouseDown={(e) => e.preventDefault()}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-600">Math Symbols</span>
                  <button type="button" onClick={() => setShowMathPicker(false)} className="text-gray-400 hover:text-gray-600 text-xs leading-none">✕</button>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto hide-scrollbar">
                  {MATH_SYMBOLS.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{group.label}</p>
                      <div className="flex flex-wrap gap-0.5">
                        {group.symbols.map((sym) => (
                          <button key={sym} type="button" onClick={() => insertMathSymbol(sym)}
                            className="w-6 h-6 text-xs flex items-center justify-center rounded hover:bg-blue-50 hover:text-blue-600 border border-gray-100 font-mono transition-colors" title={sym}>
                            {sym}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-gray-200 mx-0.5" />

          {/* Alignment */}
          {(['left', 'center', 'right', 'justify'] as const).map((align) => {
            const cmds = { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' } as const;
            const icons = { left: '⬅', center: '↔', right: '➡', justify: '≡' };
            const titles = { left: 'Align Left', center: 'Align Center', right: 'Align Right', justify: 'Justify' };
            return (
              <button key={align} type="button" title={titles[align]}
                onMouseDown={(e) => { e.preventDefault(); exec(cmds[align]); }}
                className={`px-1.5 py-0.5 text-xs font-semibold rounded hover:bg-gray-100 transition-colors ${activeFormats.alignment === align ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`}>
                {icons[align]}
              </button>
            );
          })}

          {/* Font / Text color / Highlight — compact, no label text */}
          {variant === 'full' && (
            <>
              <div className="w-px h-4 bg-gray-200 mx-0.5" />
              {/* Font family */}
              <select value={activeFormats.font} onChange={(e) => applyFontFamily(e.target.value)}
                className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 max-w-[72px]" title="Font family">
                {FONT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {/* Font size */}
              <select value={activeFormats.fontSize} onChange={(e) => applyFontSize(e.target.value)}
                className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 w-14" title="Font size">
                {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {/* Text color */}
              <select value={activeFormats.color} onChange={(e) => applyTextColor(e.target.value)}
                className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 max-w-[58px]" title="Text color">
                {TEXT_COLOR_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <input type="color" value={activeFormats.color} onChange={(e) => applyTextColor(e.target.value)}
                className="w-5 h-5 border border-gray-200 rounded cursor-pointer p-0 flex-shrink-0" title="Custom text color" />
              {/* Highlight */}
              <select value={activeFormats.highlight} onChange={(e) => applyHighlightColor(e.target.value)}
                className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 max-w-[58px]" title="Highlight">
                {HIGHLIGHT_COLOR_OPTIONS.map((opt) => <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>)}
              </select>
              <input type="color" value={activeFormats.highlight || '#ffffff'} onChange={(e) => applyHighlightColor(e.target.value)}
                className="w-5 h-5 border border-gray-200 rounded cursor-pointer p-0 flex-shrink-0" title="Custom highlight" />
            </>
          )}
        </div>

        {/* ── Editor area ── */}
        <div className="relative">
          {(!value || value === '<p></p>' || value === '<br>') && (
            <span className="absolute left-2 top-1.5 text-gray-400 text-xs pointer-events-none">{placeholder}</span>
          )}
          <div
            ref={editorRef}
            className={`px-2 py-1.5 focus:outline-none text-sm rich-text-editor ${className}`}
            style={{ minHeight, color: '#1a1a1a' }}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onBlur={handleInput}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onFocus={updateActiveFormats}
            onKeyDown={handleEditorKeyDown}
            onPaste={handleEditorPaste}
          />
        </div>
      </div>
      <div className="text-[10px] text-gray-400 space-y-0.5">
        {helperText && <p>{helperText}</p>}
        <p>Shift+Enter → new line &nbsp;·&nbsp; Enter inside lists → new item</p>
        {onImagePaste && <p>Paste images (Ctrl/⌘+V) to auto-upload.</p>}
      </div>
    </div>
  );
};

interface InlineTextBlockEditorProps {
  block: Block;
  onContentChange: (content: any) => void;
}

const InlineTextBlockEditor: React.FC<InlineTextBlockEditorProps> = ({ block, onContentChange }) => {
  const content = block.content || {};

  if (block.block_type === 'heading') {
    const level = content.level || 2;
    const headingSizes: Record<number, string> = {
      1: 'text-3xl',
      2: 'text-2xl',
      3: 'text-xl',
      4: 'text-lg',
      5: 'text-base',
      6: 'text-sm'
    };

    return (
      <InlineRichTextEditor
        value={content.text || ''}
        onChange={(value) => onContentChange({ ...content, text: sanitizeHeadingEditorValue(value) })}
        placeholder="Heading text…"
        rows={1}
        className={`${headingSizes[level] || 'text-2xl'} font-semibold text-gray-900 leading-tight`}
        prefixControls={
          <select
            value={level}
            onChange={(e) => onContentChange({ ...content, level: Number(e.target.value) })}
            className="text-[10px] font-bold border border-gray-200 rounded bg-white text-gray-600 px-1 py-0.5"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {[1, 2, 3, 4, 5, 6].map((lvl) => (
              <option key={lvl} value={lvl}>H{lvl}</option>
            ))}
          </select>
        }
      />
    );
  }

  if (block.block_type === 'paragraph') {
    return (
      <InlineRichTextEditor
        value={content.text || ''}
        onChange={(value) => onContentChange({ ...content, text: value })}
        placeholder="Add paragraph text…"
        rows={3}
        className="text-sm leading-relaxed text-gray-800"
      />
    );
  }

  if (block.block_type === 'list') {
    const items: string[] = Array.isArray(content.items) && content.items.length ? content.items : [''];
    const listType = content.type || 'unordered';

    const updateItems = (nextItems: string[]) => onContentChange({ ...content, items: nextItems });
    const handleItemChange = (index: number, value: string) => {
      const next = [...items];
      next[index] = value;
      updateItems(next);
    };

    const removeItem = (index: number) => {
      if (items.length === 1) return;
      updateItems(items.filter((_, idx) => idx !== index));
    };

    const addItem = () => updateItems([...items, '']);

    return (
      <div className="space-y-0.5 py-0.5">
        <div className="flex items-center justify-between mb-1">
          <div className="inline-flex rounded border border-gray-200 overflow-hidden text-[10px]">
            <button type="button" onClick={() => onContentChange({ ...content, type: 'unordered' })}
              className={`px-2 py-0.5 transition-colors ${listType === 'unordered' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              • Bullets
            </button>
            <button type="button" onClick={() => onContentChange({ ...content, type: 'ordered' })}
              className={`px-2 py-0.5 transition-colors ${listType === 'ordered' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              1. Numbers
            </button>
          </div>
          <button type="button" onClick={addItem} className="text-[10px] font-semibold text-blue-600 hover:text-blue-800">+ Add item</button>
        </div>
        {items.map((item, index) => (
          <div key={index} className="flex gap-1.5 items-start group/listitem">
            <span className="text-gray-400 mt-0.5 text-xs flex-shrink-0 w-4 text-right tabular-nums">
              {listType === 'ordered' ? `${index + 1}.` : '•'}
            </span>
            <div className="flex-1 min-w-0">
              <InlineRichTextEditor
                value={item}
                onChange={(value) => handleItemChange(index, value)}
                placeholder={`Item ${index + 1}…`}
                rows={1}
                className="text-sm text-gray-800"
              />
            </div>
            <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1}
              className="opacity-0 group-hover/listitem:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 flex-shrink-0 disabled:opacity-0">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (block.block_type === 'quote') {
    return (
      <div className="space-y-1 py-0.5">
        <InlineRichTextEditor
          value={content.text || ''}
          onChange={(value) => onContentChange({ ...content, text: value })}
          placeholder="Quote text…"
          rows={2}
          className="text-sm italic text-gray-700 border-l-2 border-gray-300 pl-2"
        />
        <input
          type="text"
          value={content.author || ''}
          onChange={(e) => onContentChange({ ...content, author: e.target.value })}
          className="w-full px-2 py-1 text-xs border border-gray-200 rounded text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
          placeholder="— Author (optional)"
        />
      </div>
    );
  }

  if (block.block_type === 'alert') {
    return (
      <div className="flex items-start gap-1.5 py-0.5">
        <select
          value={content.type || 'info'}
          onChange={(e) => onContentChange({ ...content, type: e.target.value })}
          className="text-[10px] border border-gray-200 rounded bg-white text-gray-600 px-1 py-0.5 flex-shrink-0 mt-0.5"
        >
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="danger">Danger</option>
        </select>
        <div className="flex-1 min-w-0">
          <InlineRichTextEditor
            value={content.text || ''}
            onChange={(value) => onContentChange({ ...content, text: value })}
            placeholder="Alert message…"
            rows={2}
            className="text-sm text-gray-800"
          />
        </div>
      </div>
    );
  }

  if (block.block_type === 'card') {
    const cardHeadingTag = normalizeHeadingTag(content.headingTag, 'h3');
    return (
      <div className="space-y-1.5 py-0.5">
        <div className="grid grid-cols-2 gap-1.5">
          <input type="text" value={content.title || ''} onChange={(e) => onContentChange({ ...content, title: e.target.value })}
            className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300" placeholder="Card title" />
          <select value={cardHeadingTag} onChange={(e) => onContentChange({ ...content, headingTag: e.target.value })}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600">
            {HEADING_TAG_OPTIONS.map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}
          </select>
        </div>
        <InlineRichTextEditor value={content.description || ''} onChange={(value) => onContentChange({ ...content, description: value })}
          placeholder="Card description…" rows={2} className="text-sm text-gray-800" />
        <div className="grid grid-cols-2 gap-1.5">
          <input type="text" value={content.subtitle || ''} onChange={(e) => onContentChange({ ...content, subtitle: e.target.value })}
            className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300" placeholder="Subtitle (optional)" />
          <input type="text" value={content.image || ''} onChange={(e) => onContentChange({ ...content, image: e.target.value })}
            className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300" placeholder="Image URL" />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <input type="text" value={content.link?.text || ''} onChange={(e) => onContentChange({ ...content, link: { ...(content.link || {}), text: e.target.value } })}
            className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300" placeholder="Button text" />
          <input type="text" value={content.link?.url || ''} onChange={(e) => onContentChange({ ...content, link: { ...(content.link || {}), url: e.target.value } })}
            className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300" placeholder="Button URL" />
        </div>
      </div>
    );
  }

  return <BlockRenderer block={block} isEditing={true} />;
};

const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading', description: 'Add a heading' },
  { type: 'paragraph', label: 'Paragraph', description: 'Add text content' },
  { type: 'list', label: 'List', description: 'Bulleted or numbered list' },
  { type: 'table', label: 'Table', description: 'Add a data table' },
  { type: 'image', label: 'Image', description: 'Add an image' },
  { type: 'chart', label: 'Chart', description: 'Add a chart or graph' },
  { type: 'quote', label: 'Quote', description: 'Add a blockquote' },
  { type: 'code', label: 'Code', description: 'Add code snippet' },
  { type: 'divider', label: 'Divider', description: 'Add a horizontal line' },
  { type: 'button', label: 'Button', description: 'Add a call-to-action button' },
  { type: 'accordion', label: 'Accordion', description: 'Collapsible content' },
  { type: 'tabs', label: 'Tabs', description: 'Tabbed content' },
  { type: 'card', label: 'Card', description: 'Content card' },
  { type: 'alert', label: 'Alert', description: 'Alert or notice box' },
  { type: 'video', label: 'Video', description: 'Embed video' },
  { type: 'html', label: 'HTML', description: 'Custom HTML' },
  { type: 'spacer', label: 'Spacer', description: 'Add vertical space' },
  { type: 'adBanner', label: 'Ad Banner', description: 'Display an ad image with link' },
  { type: 'examCards', label: 'Exam Cards', description: 'Attach and display exam cards' },
  { type: 'autoExamCards', label: 'Auto Exam Cards', description: 'Auto-fetch category, subcategory, quiz or live exam cards with slider' }
];

const INLINE_EDITABLE_BLOCKS = new Set([
  'heading',
  'paragraph',
  'list',
  'quote',
  'alert',
  'card'
]);

// Re-focus the contentEditable that owns a saved range and re-apply the range.
// Without focusing the host first, document.execCommand() targets nothing once the
// pointer has left the highlighted text — which is why colour/format "did not stick
// after focus was lost". Returns the editable element (or null).
const focusRangeEditable = (range: Range | null): HTMLElement | null => {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (!sel || !range) return null;
  const node = range.startContainer;
  const host = (node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement)
    ?.closest('[contenteditable="true"]') as HTMLElement | null;
  host?.focus({ preventScroll: true });
  try {
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {
    /* range nodes may have been replaced by a re-render — ignore */
  }
  return host;
};

const CtxBtn: React.FC<{ title: string; onApply: () => void; className?: string; children: React.ReactNode }> = ({
  title,
  onApply,
  className = '',
  children,
}) => (
  <button
    type="button"
    title={title}
    // onMouseDown + preventDefault keeps the contentEditable's selection alive
    onMouseDown={(e) => { e.preventDefault(); onApply(); }}
    className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-sm text-gray-700 transition-colors ${className}`}
  >
    {children}
  </button>
);

// Highest practical stacking value so the menu sits above every dialog/overlay.
const CTX_MENU_Z = 2147483646;

// ── Global right-click formatting menu ──────────────────────────────────────
// Right-click any highlighted text inside an editor block (rich text, table cell,
// heading, section title …) to open an inline formatting menu. Works for every
// block because it keys off `[contenteditable="true"]` + a live text selection.
const RichTextContextMenu: React.FC = () => {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [placed, setPlaced] = useState(false); // false until measured & clamped on-screen
  const [submenu, setSubmenu] = useState<null | 'color' | 'highlight'>(null);
  const savedRange = useRef<Range | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setMenu(null);
    setPlaced(false);
    setSubmenu(null);
  }, []);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const editable = target?.closest?.('[contenteditable="true"]') as HTMLElement | null;
      const sel = window.getSelection();
      // No editable text selected → leave the browser's native menu alone.
      if (!editable || !sel || sel.rangeCount === 0 || sel.isCollapsed || !sel.toString().trim()) {
        return;
      }
      e.preventDefault();
      savedRange.current = sel.getRangeAt(0).cloneRange();
      setSubmenu(null);
      setPlaced(false);
      setMenu({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);

  // Measure the rendered menu and clamp it fully inside the viewport. Runs before
  // paint so a menu opened near a screen edge/corner never spills off-screen.
  React.useLayoutEffect(() => {
    if (!menu || placed || !menuRef.current) return;
    const r = menuRef.current.getBoundingClientRect();
    const pad = 8;
    const x = Math.max(pad, Math.min(menu.x, window.innerWidth - r.width - pad));
    const y = Math.max(pad, Math.min(menu.y, window.innerHeight - r.height - pad));
    if (x !== menu.x || y !== menu.y) setMenu({ x, y });
    setPlaced(true);
  }, [menu, placed]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu(); };
    const onScroll = () => closeMenu();
    const onResize = () => closeMenu();
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [menu, closeMenu]);

  const exec = (cmd: string, value?: string) => {
    focusRangeEditable(savedRange.current);
    try {
      if (cmd === 'foreColor' || cmd === 'hiliteColor' || cmd === 'backColor') {
        document.execCommand('styleWithCSS', false, 'true');
      }
      document.execCommand(cmd, false, value);
    } catch {
      /* ignore unsupported command */
    }
    // Re-capture the (possibly shifted) selection so commands can be chained.
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const addLink = () => {
    const url = window.prompt('Link URL:', 'https://');
    if (url && url.trim()) exec('createLink', url.trim());
  };

  const copySelection = () => {
    const text = savedRange.current?.toString() || window.getSelection()?.toString() || '';
    if (text) navigator.clipboard?.writeText(text).catch(() => { /* ignore */ });
  };

  if (!menu) return null;

  // Open submenus toward whichever side/edge has room so swatches stay on-screen.
  const openLeft = menu.x > window.innerWidth - 260;
  const openUp = menu.y > window.innerHeight - 170;
  const swatchPanelCls = `absolute ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'} ${openLeft ? 'right-0' : 'left-0'} p-1.5 bg-white border border-gray-200 rounded-lg shadow-xl flex items-center gap-1`;
  const swatchPanelStyle = { zIndex: CTX_MENU_Z + 1 } as React.CSSProperties;
  const divider = <div className="w-px h-5 bg-gray-200 mx-0.5" />;

  return (
    <div
      ref={menuRef}
      className="fixed flex flex-wrap items-center gap-0.5 p-1 bg-white border border-gray-200 rounded-lg shadow-2xl"
      style={{ left: menu.x, top: menu.y, zIndex: CTX_MENU_Z, maxWidth: 'min(96vw, 640px)', visibility: placed ? 'visible' : 'hidden' }}
      onMouseDown={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Inline emphasis */}
      <CtxBtn title="Bold (Ctrl+B)" onApply={() => exec('bold')}><b>B</b></CtxBtn>
      <CtxBtn title="Italic (Ctrl+I)" onApply={() => exec('italic')}><i>I</i></CtxBtn>
      <CtxBtn title="Underline (Ctrl+U)" onApply={() => exec('underline')}><u>U</u></CtxBtn>
      <CtxBtn title="Strikethrough" onApply={() => exec('strikeThrough')}><s>S</s></CtxBtn>
      <CtxBtn title="Superscript" onApply={() => exec('superscript')}>x<sup className="text-[8px]">2</sup></CtxBtn>
      <CtxBtn title="Subscript" onApply={() => exec('subscript')}>x<sub className="text-[8px]">2</sub></CtxBtn>

      {divider}

      {/* Text colour */}
      <div className="relative">
        <CtxBtn title="Text colour" onApply={() => setSubmenu((v) => (v === 'color' ? null : 'color'))}>
          <span style={{ color: '#1d4ed8' }} className="font-bold">A</span>
        </CtxBtn>
        {submenu === 'color' && (
          <div className={swatchPanelCls} style={swatchPanelStyle} onMouseDown={(e) => e.preventDefault()}>
            {TEXT_COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                title={opt.label}
                onMouseDown={(e) => { e.preventDefault(); exec('foreColor', opt.value); setSubmenu(null); }}
                className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform flex-shrink-0"
                style={{ backgroundColor: opt.value }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Highlight colour */}
      <div className="relative">
        <CtxBtn title="Highlight" onApply={() => setSubmenu((v) => (v === 'highlight' ? null : 'highlight'))}>
          <span className="px-1 rounded text-gray-800" style={{ backgroundColor: '#fde68a' }}>H</span>
        </CtxBtn>
        {submenu === 'highlight' && (
          <div className={swatchPanelCls} style={swatchPanelStyle} onMouseDown={(e) => e.preventDefault()}>
            {HIGHLIGHT_COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                title={opt.label}
                onMouseDown={(e) => { e.preventDefault(); exec('hiliteColor', opt.value || 'transparent'); setSubmenu(null); }}
                className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform flex-shrink-0 flex items-center justify-center text-[10px] text-gray-400"
                style={{ backgroundColor: opt.value || '#ffffff' }}
              >
                {opt.value ? '' : '∅'}
              </button>
            ))}
          </div>
        )}
      </div>

      {divider}

      {/* Block format */}
      <CtxBtn title="Heading 1" onApply={() => exec('formatBlock', 'h1')}><span className="text-xs font-bold">H1</span></CtxBtn>
      <CtxBtn title="Heading 2" onApply={() => exec('formatBlock', 'h2')}><span className="text-xs font-bold">H2</span></CtxBtn>
      <CtxBtn title="Heading 3" onApply={() => exec('formatBlock', 'h3')}><span className="text-xs font-bold">H3</span></CtxBtn>
      <CtxBtn title="Normal text" onApply={() => exec('formatBlock', 'p')}><span className="text-xs">¶</span></CtxBtn>
      <CtxBtn title="Quote" onApply={() => exec('formatBlock', 'blockquote')}>❝</CtxBtn>

      {divider}

      {/* Lists & indent */}
      <CtxBtn title="Bulleted list" onApply={() => exec('insertUnorderedList')}>•</CtxBtn>
      <CtxBtn title="Numbered list" onApply={() => exec('insertOrderedList')}><span className="text-xs">1.</span></CtxBtn>
      <CtxBtn title="Decrease indent" onApply={() => exec('outdent')}>⇤</CtxBtn>
      <CtxBtn title="Increase indent" onApply={() => exec('indent')}>⇥</CtxBtn>

      {divider}

      {/* Alignment */}
      <CtxBtn title="Align left" onApply={() => exec('justifyLeft')}>⬅</CtxBtn>
      <CtxBtn title="Align centre" onApply={() => exec('justifyCenter')}>⬌</CtxBtn>
      <CtxBtn title="Align right" onApply={() => exec('justifyRight')}>➡</CtxBtn>
      <CtxBtn title="Justify" onApply={() => exec('justifyFull')}>☰</CtxBtn>

      {divider}

      {/* Actions */}
      <CtxBtn title="Add link" onApply={addLink}>🔗</CtxBtn>
      <CtxBtn title="Copy" onApply={copySelection}>⎘</CtxBtn>
      <CtxBtn title="Clear formatting" className="text-red-500" onApply={() => exec('removeFormat')}>✕</CtxBtn>
    </div>
  );
};

export const BlockEditor: React.FC<BlockEditorProps> = ({
  sections: initialSections,
  onSave,
  onSectionsChange,
  tabLabel,
  mediaUploadConfig,
  reservedTabInfo,
  onReservedPositionChange,
  availableTabs,
  onTocOrderClick
}) => {
  // Load editor fonts lazily — only when this admin component mounts
  useEditorFonts();

  const [sections, setSections] = useState<Section[]>(() => normalizeSections(initialSections));
  const parentSectionsSignatureRef = useRef<string | null>(JSON.stringify(normalizeSections(initialSections)));
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [reservedPosition, setReservedPosition] = useState<number>(reservedTabInfo?.position ?? 0);
  const isPreview = false;
  const [showBlockPicker, setShowBlockPicker] = useState<string | null>(null);
  const [openBlockEditor, setOpenBlockEditor] = useState<string | null>(null);
  const historyRef = useRef<Section[][]>([snapshotSections(initialSections)]);
  const historyIndexRef = useRef(0);
  const [historyIndex, setHistoryIndex] = useState(0);
  const syncingFromParentRef = useRef(false);
  const suppressHistoryRef = useRef(false);
  const onSectionsChangeRef = useRef(onSectionsChange);
  useEffect(() => { onSectionsChangeRef.current = onSectionsChange; });
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [openColorPicker, setOpenColorPicker] = useState<string | null>(null);

  useEffect(() => {
    const normalized = normalizeSections(initialSections);
    const sig = JSON.stringify(normalized);
    if (parentSectionsSignatureRef.current === sig) {
      return;
    }
    parentSectionsSignatureRef.current = sig;
    syncingFromParentRef.current = true;
    suppressHistoryRef.current = true;
    setSections(normalized);
    historyRef.current = [snapshotSections(normalized)];
    historyIndexRef.current = 0;
    setHistoryIndex(0);
  }, [initialSections]);

  useEffect(() => {
    setCollapsedSections((prev) => {
      const next = new Set<string>();
      sections.forEach((section) => {
        if (prev.has(section.id)) {
          next.add(section.id);
        }
      });
      return next;
    });
  }, [sections]);

  useEffect(() => {
    if (syncingFromParentRef.current) {
      syncingFromParentRef.current = false;
      suppressHistoryRef.current = false;
      // Don't call onSectionsChange when syncing from parent — would cause loop
      return;
    }

    if (!suppressHistoryRef.current) {
      const base = historyRef.current.slice(0, historyIndexRef.current + 1);
      const nextSnapshot = snapshotSections(sections);
      const updated = [...base, nextSnapshot];
      if (updated.length > 50) {
        updated.shift();
      }
      historyRef.current = updated;
      historyIndexRef.current = updated.length - 1;
      setHistoryIndex(historyIndexRef.current);
    } else {
      suppressHistoryRef.current = false;
    }

    // Update parent signature so parent sync doesn't re-fire for this change
    parentSectionsSignatureRef.current = JSON.stringify(sections);
    onSectionsChangeRef.current?.(sections);
  }, [sections]);

  // Close color picker when clicking outside
  useEffect(() => {
    if (!openColorPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-color-picker]')) setOpenColorPicker(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openColorPicker]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyRef.current.length - 1;

  const handleUndo = () => {
    if (!canUndo) return;
    const nextIndex = historyIndex - 1;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    suppressHistoryRef.current = true;
    setSections(historyRef.current[nextIndex]);
  };

  const handleRedo = () => {
    if (!canRedo) return;
    const nextIndex = historyIndex + 1;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    suppressHistoryRef.current = true;
    setSections(historyRef.current[nextIndex]);
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleSectionSidebar = (sectionId: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, is_sidebar: !(section.is_sidebar ?? false), sidebar_tab_id: !(section.is_sidebar ?? false) ? null : section.sidebar_tab_id }
          : section
      )
    );
  };

  const updateSidebarTab = (sectionId: string, tabId: string | null) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, sidebar_tab_id: tabId }
          : section
      )
    );
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setSections((prev) => {
      const index = prev.findIndex((section) => section.id === sectionId);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const reordered = [...prev];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered.map((section, idx) => ({ ...section, display_order: idx }));
    });
  };

  const moveReservedCard = (direction: 'up' | 'down') => {
    const targetPos = direction === 'up' ? reservedPosition - 1 : reservedPosition + 1;
    if (targetPos < 0 || targetPos > sections.length) return;
    setReservedPosition(targetPos);
    onReservedPositionChange?.(targetPos);
  };

  useEffect(() => {
    if (reservedTabInfo?.position !== undefined && reservedTabInfo.position !== reservedPosition) {
      setReservedPosition(reservedTabInfo.position);
    }
  }, [reservedTabInfo?.position]);

  const addSection = () => {
    const newSection: Section = {
      id: `temp-${Date.now()}`,
      title: 'New Section',
      display_order: sections.length,
      blocks: [],
      is_sidebar: false,
      settings: { headingTag: 'h2' }
    };
    setSections([...sections, newSection]);
  };

  const reorderSections = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setSections((prev) => {
      const next = [...prev];
      const sourceIndex = next.findIndex((section) => section.id === sourceId);
      let targetIndex = next.findIndex((section) => section.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }

      const [moved] = next.splice(sourceIndex, 1);
      if (sourceIndex < targetIndex) {
        targetIndex -= 1;
      }
      next.splice(targetIndex, 0, moved);
      return next.map((section, index) => ({
        ...section,
        display_order: index
      }));
    });
  };

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    setSections(sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    ));
  };

  const deleteSection = (sectionId: string) => {
    setSections((prev) => prev.filter(section => section.id !== sectionId));
  };

  const addBlock = (sectionId: string, blockType: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const defaultContent = getDefaultBlockContent(blockType);
    const newBlock: Block = {
      id: `temp-${Date.now()}`,
      block_type: blockType,
      content: defaultContent,
      display_order: section.blocks.length,
      section_id: sectionId
    };

    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, blocks: [...s.blocks, newBlock] }
        : s
    ));
    setShowBlockPicker(null);
    setOpenBlockEditor(newBlock.id);
  };

  const updateBlock = (sectionId: string, blockId: string, updates: Partial<Block>) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? {
          ...section,
          blocks: section.blocks.map(block =>
            block.id === blockId ? { ...block, ...updates } : block
          )
        }
        : section
    ));
  };

  const deleteBlock = (sectionId: string, blockId: string) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? {
          ...section,
          blocks: section.blocks.filter(block => block.id !== blockId)
        }
        : section
    ));
  };

  const moveBlock = (sectionId: string, blockId: string, direction: 'up' | 'down') => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const blockIndex = section.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;

    const newBlocks = [...section.blocks];
    const targetIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;

    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;

    [newBlocks[blockIndex], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[blockIndex]];

    newBlocks.forEach((block, index) => {
      block.display_order = index;
    });

    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, blocks: newBlocks } : s
    ));
  };

  const reorderBlocks = (sectionId: string, sourceBlockId: string, targetBlockId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        const nextBlocks = [...section.blocks];
        const sourceIndex = nextBlocks.findIndex((block) => block.id === sourceBlockId);
        let targetIndex = nextBlocks.findIndex((block) => block.id === targetBlockId);
        if (sourceIndex === -1 || targetIndex === -1) {
          return section;
        }
        const [moved] = nextBlocks.splice(sourceIndex, 1);
        if (sourceIndex < targetIndex) {
          targetIndex -= 1;
        }
        nextBlocks.splice(targetIndex, 0, moved);
        nextBlocks.forEach((block, index) => {
          block.display_order = index;
        });
        return { ...section, blocks: nextBlocks };
      })
    );
  };

  const handleSave = () => {
    onSave(sections);
  };

  return (
    <div className="flex bg-[#f8f9fa]" style={{ height: '100%', minHeight: 0 }}>

      {/* Right-click formatting menu — works on any selected text in any block */}
      <RichTextContextMenu />

      {/* ── LEFT OUTLINE SIDEBAR ─────────────────────────────────── */}
      <div className="w-44 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
        <div className="px-3 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Outline</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1 hide-scrollbar">
          {sections.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400 italic">No sections yet</p>
          )}
          {sections.map((section, idx) => (
            <button
              key={section.id}
              onClick={() => document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 group transition-colors"
            >
              <span className="text-[10px] text-gray-300 font-mono w-3 flex-shrink-0 tabular-nums">{idx + 1}</span>
              <span
                className="truncate text-gray-600 group-hover:text-gray-900 leading-tight"
                dangerouslySetInnerHTML={{ __html: section.title || 'Untitled' }}
              />
              {section.is_sidebar && (
                <span className="ml-auto flex-shrink-0 text-[8px] font-bold uppercase text-amber-500 bg-amber-50 border border-amber-200 px-1 rounded">SB</span>
              )}
            </button>
          ))}
          {reservedTabInfo && (
            <div className="px-3 py-1.5 text-xs text-amber-600 flex items-center gap-2">
              <span className="text-[10px] font-mono w-3 flex-shrink-0">★</span>
              <span className="truncate italic">{reservedTabInfo.tabType === 'mock-tests' ? 'Mock Tests' : 'Papers'}</span>
            </div>
          )}
        </div>
        <div className="px-3 py-2.5 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={addSection}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-dashed border-blue-200 hover:border-blue-400 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Section
          </button>
        </div>
      </div>

      {/* ── CENTER EDITOR ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="px-1 py-2">

          {sections.length === 0 && !reservedTabInfo ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-3">No sections yet</p>
              <button
                onClick={addSection}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Add First Section
              </button>
            </div>
          ) : (
            <>
              {sections.map((section, sectionIndex) => {
                const isCollapsed = collapsedSections.has(section.id);
                const renderReservedCard = reservedTabInfo && sectionIndex === reservedPosition;
                return (
                  <React.Fragment key={section.id}>

                    {/* Reserved area card */}
                    {renderReservedCard && (
                      <div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-3">
                        <Settings className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-amber-800">
                            {reservedTabInfo.tabType === 'mock-tests' ? 'Mock Tests Listing' : 'Question Papers Listing'}
                          </p>
                          <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">{reservedTabInfo.message}</p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => moveReservedCard('up')} disabled={reservedPosition === 0} className="p-1 rounded hover:bg-amber-100 disabled:opacity-30 transition-colors" title="Move up">
                            <ArrowUp className="w-3 h-3 text-amber-700" />
                          </button>
                          <button onClick={() => moveReservedCard('down')} disabled={reservedPosition === sections.length} className="p-1 rounded hover:bg-amber-100 disabled:opacity-30 transition-colors" title="Move down">
                            <ArrowDown className="w-3 h-3 text-amber-700" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── SECTION ──────────────────────────────────── */}
                    <div id={`section-${section.id}`} className="mb-1 group/section">

                      {/* Section header row */}
                      <div className="flex items-center gap-1 px-1 py-1 rounded-md hover:bg-white hover:shadow-sm transition-all group/sectionrow">

                        {/* Collapse toggle */}
                        <button
                          type="button"
                          onClick={() => toggleSectionCollapse(section.id)}
                          className="p-0.5 rounded text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors"
                          title={isCollapsed ? 'Expand' : 'Collapse'}
                        >
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`} />
                        </button>

                        {/* Section title — inline editable */}
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          dangerouslySetInnerHTML={{ __html: section.title || '' }}
                          onBlur={(e) => updateSection(section.id, { title: e.currentTarget.innerHTML })}
                          className="flex-1 text-sm font-semibold text-gray-800 outline-none min-w-0 px-1 rounded focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 cursor-text"
                          data-placeholder="Section Title"
                          style={{ minHeight: '1.25em', color: section.text_color || undefined }}
                          spellCheck={false}
                        />

                        {/* Hover action strip */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/sectionrow:opacity-100 transition-opacity flex-shrink-0">

                          {/* Title format buttons */}
                          <div className="flex items-center border border-gray-200 rounded bg-white mr-1">
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); }} className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-l" title="Bold">
                              <Bold className="w-3 h-3" />
                            </button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic'); }} className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-800" title="Italic">
                              <Italic className="w-3 h-3" />
                            </button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline'); }} className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-r" title="Underline">
                              <Underline className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Color picker — click-toggled so mouse movement doesn't close it */}
                          <div className="relative" data-color-picker>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setOpenColorPicker(openColorPicker === section.id ? null : section.id); }}
                              className={`p-1 rounded hover:bg-gray-100 transition-colors ${openColorPicker === section.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-700'}`}
                              title="Title color"
                            >
                              <Palette className="w-3 h-3" />
                            </button>
                            {openColorPicker === section.id && (
                              <div
                                className="absolute top-full right-0 mt-1 flex flex-wrap gap-1 bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-[200] w-36"
                                onMouseLeave={(e) => e.stopPropagation()}
                              >
                                {[
                                  { label: 'Default', value: '' },
                                  { label: 'Dark', value: '#111827' },
                                  { label: 'Blue', value: '#1d4ed8' },
                                  { label: 'Green', value: '#15803d' },
                                  { label: 'Orange', value: '#d97706' },
                                  { label: 'Red', value: '#b91c1c' },
                                  { label: 'Purple', value: '#7c3aed' },
                                  { label: 'Teal', value: '#0d9488' },
                                ].map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { updateSection(section.id, { text_color: opt.value || undefined }); setOpenColorPicker(null); }}
                                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-transform hover:scale-110 ${(section.text_color || '') === opt.value ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-300'}`}
                                    style={{ backgroundColor: opt.value || '#f3f4f6' }}
                                    title={opt.label}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Heading tag */}
                          <select
                            value={normalizeHeadingTag(section.settings?.headingTag, section.is_sidebar ? 'h3' : 'h2')}
                            onChange={(e) => updateSection(section.id, { settings: { ...(section.settings || {}), headingTag: e.target.value } })}
                            className="text-[10px] font-bold border border-gray-200 rounded bg-white text-gray-600 px-1 py-0.5 cursor-pointer"
                            title="Heading tag"
                          >
                            {HEADING_TAG_OPTIONS.map((tag) => (
                              <option key={tag} value={tag}>{tag.toUpperCase()}</option>
                            ))}
                          </select>

                          <div className="w-px h-3.5 bg-gray-200 mx-0.5" />

                          {/* Move up / down */}
                          <button onClick={() => moveSection(section.id, 'up')} disabled={sectionIndex === 0} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors" title="Move section up">
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button onClick={() => moveSection(section.id, 'down')} disabled={sectionIndex === sections.length - 1} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors" title="Move section down">
                            <ArrowDown className="w-3 h-3" />
                          </button>

                          <div className="w-px h-3.5 bg-gray-200 mx-0.5" />

                          {/* Sidebar toggle */}
                          <button
                            onClick={() => toggleSectionSidebar(section.id)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${section.is_sidebar ? 'border-amber-300 text-amber-600 bg-amber-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            title={section.is_sidebar ? 'Switch to main content' : 'Use as sidebar'}
                          >
                            {section.is_sidebar ? 'Sidebar' : 'Main'}
                          </button>

                          {section.is_sidebar && availableTabs && availableTabs.length > 0 && (
                            <select
                              value={section.sidebar_tab_id || ''}
                              onChange={(e) => updateSidebarTab(section.id, e.target.value || null)}
                              className="text-[10px] border border-gray-200 rounded bg-white px-1 py-0.5 text-gray-600"
                              title="Assign sidebar to tab"
                            >
                              <option value="">All tabs</option>
                              {availableTabs.map((tab) => (
                                <option key={tab.id} value={tab.id}>{tab.label}</option>
                              ))}
                            </select>
                          )}

                          <div className="w-px h-3.5 bg-gray-200 mx-0.5" />

                          {/* Add block */}
                          <button
                            onClick={() => setShowBlockPicker(showBlockPicker === section.id ? null : section.id)}
                            className="p-1 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
                            title="Add block"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete section */}
                          <button
                            onClick={() => deleteSection(section.id)}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete section"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Optional subtitle */}
                      {section.subtitle !== undefined && !isCollapsed && (
                        <input
                          type="text"
                          value={section.subtitle ?? ''}
                          onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                          className="ml-3 mt-0.5 w-[calc(100%-0.75rem)] text-xs text-gray-500 bg-transparent outline-none focus:ring-1 focus:ring-blue-300 rounded px-1"
                          placeholder="Section subtitle (optional)"
                        />
                      )}

                      {/* Block picker */}
                      {showBlockPicker === section.id && !isCollapsed && (
                        <div className="ml-3 mt-1.5 mb-1 p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-semibold text-gray-600">Insert block</p>
                            <button onClick={() => setShowBlockPicker(null)} className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {BLOCK_TYPES.map(blockType => {
                              const Icon = getBlockIcon(blockType.type);
                              return (
                                <button
                                  key={blockType.type}
                                  onClick={() => addBlock(section.id, blockType.type)}
                                  className="flex flex-col items-center gap-0.5 p-1.5 rounded-md border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                                  title={blockType.description}
                                >
                                  <Icon className="w-3.5 h-3.5 text-gray-500" />
                                  <span className="text-[9px] text-gray-600 leading-tight">{blockType.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Blocks */}
                      {isCollapsed ? (
                        <button
                          onClick={() => toggleSectionCollapse(section.id)}
                          className="ml-3 mt-0.5 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <ChevronRight className="w-3 h-3" />
                          {section.blocks.length} block{section.blocks.length !== 1 ? 's' : ''} — click to expand
                        </button>
                      ) : (
                        <div className="ml-3 mt-0.5 space-y-px">
                          {section.blocks.length === 0 ? (
                            <button
                              onClick={() => setShowBlockPicker(section.id)}
                              className="w-full py-2 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-gray-200 hover:border-blue-300 transition-colors"
                            >
                              + Add a block
                            </button>
                          ) : (
                            section.blocks.map((block, blockIndex) => {
                              const isSelected = selectedBlock === block.id;
                              const isTableBlock = block.block_type === 'table';
                              const isTableEditing = isTableBlock; // always edit mode in admin
                              const isInlineEditable = INLINE_EDITABLE_BLOCKS.has(block.block_type);
                              const showSideEditor = !isTableBlock && !isInlineEditable && !isPreview && openBlockEditor === block.id;
                              const BlockIcon = getBlockIcon(block.block_type);

                              return (
                                <div
                                  key={block.id}
                                  className="group/block"
                                  onClick={() => setSelectedBlock(block.id)}
                                >
                                  {/* Block row */}
                                  <div className={`flex items-start gap-1.5 px-2 py-1 rounded-md transition-all ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-white hover:shadow-sm'}`}>

                                    {/* Reorder controls — appear on hover */}
                                    <div className="flex flex-col gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity pt-0.5 flex-shrink-0">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); moveBlock(section.id, block.id, 'up'); }}
                                        disabled={blockIndex === 0}
                                        className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors"
                                        title="Move up"
                                      >
                                        <ArrowUp className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); moveBlock(section.id, block.id, 'down'); }}
                                        disabled={blockIndex === section.blocks.length - 1}
                                        className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors"
                                        title="Move down"
                                      >
                                        <ArrowDown className="w-2.5 h-2.5" />
                                      </button>
                                    </div>

                                    {/* Block type icon */}
                                    <BlockIcon className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />

                                    {/* Block content */}
                                    <div className="flex-1 min-w-0">
                                      {isTableBlock && isTableEditing && (
                                        <InlineTableEditor
                                          content={block.content}
                                          onChange={(updatedContent) => updateBlock(section.id, block.id, { content: updatedContent })}
                                        />
                                      )}
                                      {!isPreview && isInlineEditable ? (
                                        <InlineTextBlockEditor
                                          block={block}
                                          onContentChange={(nextContent) => updateBlock(section.id, block.id, { content: nextContent })}
                                        />
                                      ) : (
                                        !isTableEditing && <BlockRenderer block={block} isEditing={!isPreview} />
                                      )}
                                    </div>

                                    {/* Block action buttons — appear on hover */}
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
                                      {!isTableBlock && !isInlineEditable && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setOpenBlockEditor((prev) => (prev === block.id ? null : block.id)); }}
                                          className={`p-1 rounded transition-colors ${showSideEditor ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'}`}
                                          title={showSideEditor ? 'Close settings' : 'Configure block'}
                                        >
                                          <Settings className="w-3 h-3" />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); deleteBlock(section.id, block.id); }}
                                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Delete block"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Inline settings panel */}
                                  {showSideEditor && (
                                    <div className="mx-1 mb-1 mt-0.5 border border-gray-200 bg-white rounded-lg overflow-hidden shadow-sm">
                                      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
                                          <Settings className="w-3 h-3 text-gray-400" />
                                          Configure — <span className="font-mono text-gray-500">{block.block_type}</span>
                                        </div>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setOpenBlockEditor(null); }}
                                          className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                      </div>
                                      <div className="p-3">
                                        <BlockContentEditor
                                          blockType={block.block_type}
                                          content={block.content}
                                          settings={block.settings}
                                          onChange={(updatedContent) => updateBlock(section.id, block.id, { content: updatedContent })}
                                          onSettingsChange={(updatedSettings) => updateBlock(section.id, block.id, { settings: updatedSettings })}
                                          mediaUploadConfig={mediaUploadConfig}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Reserved card at end */}
              {reservedTabInfo && reservedPosition === sections.length && (
                <div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-3">
                  <Settings className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-800">
                      {reservedTabInfo.tabType === 'mock-tests' ? 'Mock Tests Listing' : 'Question Papers Listing'}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">{reservedTabInfo.message}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => moveReservedCard('up')} disabled={reservedPosition === 0} className="p-1 rounded hover:bg-amber-100 disabled:opacity-30 transition-colors" title="Move up">
                      <ArrowUp className="w-3 h-3 text-amber-700" />
                    </button>
                    <button onClick={() => moveReservedCard('down')} disabled={reservedPosition === sections.length} className="p-1 rounded hover:bg-amber-100 disabled:opacity-30 transition-colors" title="Move down">
                      <ArrowDown className="w-3 h-3 text-amber-700" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

    </div>
  );
};

const BlockContentEditor: React.FC<{
  blockType: string;
  content: any;
  settings?: any;
  onChange: (content: any) => void;
  onSettingsChange?: (settings: any) => void;
  mediaUploadConfig?: BlockEditorMediaUploadConfig;
}> = ({ blockType, content, settings, onChange, onSettingsChange, mediaUploadConfig }) => {
  switch (blockType) {
    case 'heading':
      return (
        <>
          <RichTextField
            label="Text"
            value={content.text || ''}
            onChange={(value) => onChange({ ...content, text: sanitizeHeadingEditorValue(value) })}
            rows={2}
            helper="Supports inline HTML like <strong>, <em>, <u>, and links"
          />
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Level</label>
            <select
              value={content.level || 2}
              onChange={(e) => onChange({ ...content, level: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6].map(level => (
                <option key={level} value={level}>H{level}</option>
              ))}
            </select>
          </div>
        </>
      );

    case 'paragraph':
      return (
        <RichTextField
          label="Text"
          value={content.text || ''}
          rows={8}
          onChange={(value) => onChange({ ...content, text: value })}
          helper="Use the toolbar to insert bold, italic, underline, or links without typing HTML manually."
        />
      );

    case 'list':
      return <ListContentEditor content={content} onChange={onChange} />;

    case 'table':
      return <TableContentEditor content={content} onChange={onChange} />;

    case 'image':
      return (
        <ImageContentEditor content={content} onChange={onChange} mediaUploadConfig={mediaUploadConfig} />
      );

    case 'button':
      return <ButtonContentEditor content={content} onChange={onChange} />;

    case 'quote':
      return <QuoteContentEditor content={content} onChange={onChange} />;

    case 'code':
      return <CodeContentEditor content={content} onChange={onChange} />;

    case 'accordion':
      return <AccordionContentEditor content={content} onChange={onChange} />;

    case 'tabs':
      return <TabsContentEditor content={content} onChange={onChange} />;

    case 'alert':
      return <AlertContentEditor content={content} onChange={onChange} />;

    case 'video':
      return <VideoContentEditor content={content} onChange={onChange} mediaUploadConfig={mediaUploadConfig} />;

    case 'card':
      return <CardContentEditor content={content} onChange={onChange} />;

    case 'adBanner':
      return <AdBannerContentEditor content={content} onChange={onChange} />;

    case 'examCards':
      return <ExamCardsContentEditor content={content} onChange={onChange} />;

    case 'autoExamCards':
      return <AutoExamCardsContentEditor content={content} onChange={onChange} />;

    default:
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Content (JSON)</label>
          <textarea
            value={JSON.stringify(content, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch (err) {
                // Invalid JSON, ignore
              }
            }}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
      );
  }
};

const ListContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const items: string[] = Array.isArray(content.items) && content.items.length ? content.items : [''];
  const listType = content.type || 'unordered';

  const handleItemChange = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange({ ...content, items: next });
  };

  const addItem = () => onChange({ ...content, items: [...items, ''] });
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    onChange({ ...content, items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">List Type</label>
        <select
          value={listType}
          onChange={(e) => onChange({ ...content, type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="unordered">Bulleted</option>
          <option value="ordered">Numbered</option>
        </select>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Items</label>
          <button type="button" onClick={addItem} className="text-blue-600 text-sm font-semibold">
            + Add Item
          </button>
        </div>
        {items.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3">
            <RichTextField
              label={`Item ${index + 1}`}
              value={item}
              rows={3}
              helper="Supports inline formatting (bold, italic, links)"
              onChange={(value) => handleItemChange(index, value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-sm text-red-600 hover:underline disabled:text-gray-400"
                disabled={items.length === 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TableContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const headers: string[] = Array.isArray(content.headers) && content.headers.length ? content.headers : ['Column 1'];
  const rows: string[][] = Array.isArray(content.rows) && content.rows.length ? content.rows : [headers.map(() => '')];
  const hasHeader = content.hasHeader ?? true;
  const striped = content.striped ?? true;
  const headerBgColor = content.headerBgColor || '#2563eb';
  const headerTextColor = content.headerTextColor || '#ffffff';
  const borderColor = content.borderColor || '#d1d5db';
  const cellLinks = content.cellLinks || {}; // Format: { "rowIndex-colIndex": "url" }

  const update = (next: Partial<any>) => onChange({ ...content, ...next });

  const handleHeaderChange = (index: number, value: string) => {
    const nextHeaders = [...headers];
    nextHeaders[index] = value;
    update({ headers: nextHeaders });
  };

  const addColumn = () => {
    const nextHeaders = [...headers, `Column ${headers.length + 1}`];
    const nextRows = rows.length ? rows.map((row) => [...row, '']) : [[...nextHeaders.map(() => '')]];
    update({ headers: nextHeaders, rows: nextRows });
  };

  const removeColumn = (index: number) => {
    if (headers.length === 1) return;
    const nextHeaders = headers.filter((_, i) => i !== index);
    const nextRows = rows.map((row) => row.filter((_, i) => i !== index));

    // Remove links for deleted column
    const nextLinks = { ...cellLinks };
    Object.keys(nextLinks).forEach(key => {
      const [_, colIdx] = key.split('-').map(Number);
      if (colIdx === index) delete nextLinks[key];
      else if (colIdx > index) {
        const [rowIdx] = key.split('-').map(Number);
        const newKey = `${rowIdx}-${colIdx - 1}`;
        nextLinks[newKey] = nextLinks[key];
        delete nextLinks[key];
      }
    });

    update({ headers: nextHeaders, rows: nextRows, cellLinks: nextLinks });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const nextRow = [...row];
      nextRow[colIndex] = value;
      return nextRow;
    });
    update({ rows: nextRows });
  };

  const handleCellLinkChange = (rowIndex: number, colIndex: number, url: string) => {
    const key = `${rowIndex}-${colIndex}`;
    const nextLinks = { ...cellLinks };
    if (url.trim()) {
      nextLinks[key] = url.trim();
    } else {
      delete nextLinks[key];
    }
    update({ cellLinks: nextLinks });
  };

  const addRow = () => update({ rows: [...rows, headers.map(() => '')] });
  const removeRow = (index: number) => {
    if (rows.length === 1) return;

    // Remove links for deleted row
    const nextLinks = { ...cellLinks };
    Object.keys(nextLinks).forEach(key => {
      const [rowIdx] = key.split('-').map(Number);
      if (rowIdx === index) delete nextLinks[key];
      else if (rowIdx > index) {
        const [_, colIdx] = key.split('-').map(Number);
        const newKey = `${rowIdx - 1}-${colIdx}`;
        nextLinks[newKey] = nextLinks[key];
        delete nextLinks[key];
      }
    });

    update({ rows: rows.filter((_, i) => i !== index), cellLinks: nextLinks });
  };

  const BoldButton = () => (
    <button
      type="button"
      title="Bold (Ctrl+B)"
      onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); }}
      className="px-2 py-0.5 text-xs font-bold border border-gray-300 rounded hover:bg-gray-100 bg-white leading-none"
    >
      B
    </button>
  );

  // Per-selection text color for header/cell content. Every interaction uses
  // onMouseDown + preventDefault so the contentEditable keeps its text selection
  // (a native <input type="color"> steals focus and collapses the selection, which
  // is why changing color used to do nothing on the highlighted text).
  const ColorButton = () => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!open) return;
      const onDocMouseDown = (e: MouseEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('mousedown', onDocMouseDown);
      return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [open]);

    const applyColor = (color: string) => {
      // Emit inline-style spans (instead of deprecated <font>) for the active selection.
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, color);
      setOpen(false);
    };

    return (
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          title="Text color"
          onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
          className="px-2 py-0.5 text-xs font-bold border border-gray-300 rounded hover:bg-gray-100 bg-white leading-none"
          style={{ color: TEXT_COLOR_OPTIONS[1].value }}
        >
          A
        </button>
        {open && (
          <div
            className="absolute z-50 top-full left-0 mt-1 p-1.5 bg-white border border-gray-200 rounded-lg shadow-xl flex items-center gap-1"
            onMouseDown={(e) => e.preventDefault()}
          >
            {TEXT_COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                title={opt.label}
                onMouseDown={(e) => { e.preventDefault(); applyColor(opt.value); }}
                className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform flex-shrink-0"
                style={{ backgroundColor: opt.value }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Convert any HTML fragment to plain text.
  const stripHtml = (html: string): string => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || '').replace(/\u00a0/g, ' ');
  };

  // Paste as PLAIN TEXT only. Content copied from Word, Google Docs or other sites
  // carries inline styles, background fills, embedded icons/images and nested tables
  // that wreck the cell layout (see the broken "You May Also Like" table). Strip
  // everything to text — use the B / A buttons to (re)apply bold or color by hand.
  const handleCellPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    let text = event.clipboardData?.getData('text/plain') || '';
    if (!text) {
      // Some sources only put HTML on the clipboard — derive text from it.
      text = stripHtml(event.clipboardData?.getData('text/html') || '');
    }
    document.execCommand('insertText', false, text.replace(/\u00a0/g, ' '));
  };

  // Strip all formatting (bold, color, backgrounds, stray markup) from every header
  // and cell, leaving plain text. Fixes tables already polluted by past pastes.
  const clearAllFormatting = () => {
    if (!window.confirm('Remove all bold, colour and other formatting from every cell? The text is kept.')) return;
    update({
      headers: headers.map(stripHtml),
      rows: rows.map((row) => row.map(stripHtml)),
    });
  };

  return (
    <div className="space-y-4">
      {/* Paste behaviour + reset */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500">
          Pasted content is inserted as plain text. Use <span className="font-bold">B</span> / <span className="font-bold">A</span> to apply bold or colour.
        </p>
        <button
          type="button"
          onClick={clearAllFormatting}
          title="Strip bold, colour, backgrounds and stray markup from every cell — keeps the text"
          className="px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap"
        >
          Clear formatting
        </button>
      </div>

      {/* Color Options */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Header Background</label>
          <input
            type="color"
            value={headerBgColor}
            onChange={(e) => update({ headerBgColor: e.target.value })}
            className="w-full h-9 rounded border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            value={headerBgColor}
            onChange={(e) => update({ headerBgColor: e.target.value })}
            className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded"
            placeholder="#2563eb"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Header Text</label>
          <input
            type="color"
            value={headerTextColor}
            onChange={(e) => update({ headerTextColor: e.target.value })}
            className="w-full h-9 rounded border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            value={headerTextColor}
            onChange={(e) => update({ headerTextColor: e.target.value })}
            className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded"
            placeholder="#ffffff"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Border Color</label>
          <input
            type="color"
            value={borderColor}
            onChange={(e) => update({ borderColor: e.target.value })}
            className="w-full h-9 rounded border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            value={borderColor}
            onChange={(e) => update({ borderColor: e.target.value })}
            className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded"
            placeholder="#d1d5db"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Headers</label>
          <button type="button" onClick={addColumn} className="text-blue-600 text-sm font-semibold">
            + Add Column
          </button>
        </div>
        <div className="space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <BoldButton />
                  <ColorButton />
                  <span className="text-xs text-gray-400">Ctrl+B to bold</span>
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className={`w-full border border-gray-300 rounded px-3 py-2 text-sm leading-snug min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${TABLE_CELL_RESET}`}
                  dangerouslySetInnerHTML={{ __html: header }}
                  onBlur={(e) => handleHeaderChange(index, sanitizeTableCellHtml(e.currentTarget.innerHTML))}
                  onPaste={handleCellPaste}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                      e.preventDefault();
                      document.execCommand('bold');
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => removeColumn(index)}
                className="px-2 py-2 text-red-600 hover:bg-red-50 rounded"
                disabled={headers.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Rows</label>
          <button type="button" onClick={addRow} className="text-blue-600 text-sm font-semibold">
            + Add Row
          </button>
        </div>
        <div className="space-y-4">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Row {rowIndex + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRow(rowIndex)}
                  className="text-red-600"
                  disabled={rows.length === 1}
                >
                  Remove Row
                </button>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}>
                {headers.map((_, colIndex) => {
                  const cellKey = `${rowIndex}-${colIndex}`;
                  const cellLink = cellLinks[cellKey] || '';

                  return (
                    <div key={colIndex} className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <BoldButton />
                        <ColorButton />
                        {cellLink && (
                          <span className="text-xs text-blue-600 font-medium">🔗</span>
                        )}
                      </div>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className={`w-full border border-gray-300 rounded px-3 py-2 text-sm leading-snug min-h-[56px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${TABLE_CELL_RESET}`}
                        dangerouslySetInnerHTML={{ __html: row[colIndex] || '' }}
                        onBlur={(e) => handleCellChange(rowIndex, colIndex, sanitizeTableCellHtml(e.currentTarget.innerHTML))}
                        onPaste={handleCellPaste}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                            e.preventDefault();
                            document.execCommand('bold');
                          }
                        }}
                      />
                      <input
                        type="text"
                        value={cellLink}
                        onChange={(e) => handleCellLinkChange(rowIndex, colIndex, e.target.value)}
                        placeholder="Add link URL (optional)"
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasHeader} onChange={(e) => update({ hasHeader: e.target.checked })} />
          Show header row
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={striped} onChange={(e) => update({ striped: e.target.checked })} />
          Striped rows
        </label>
      </div>
    </div>
  );
};

const AutoExamCardsContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const variant = content.variant || 'category';
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Card Type</label>
        <select
          value={variant}
          onChange={(e) => onChange({ ...content, variant: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="category">Category Exams</option>
          <option value="subcategory">Subcategory Exams</option>
          <option value="quizzes">Quizzes</option>
          <option value="live">Live Exams</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Section Title (optional)</label>
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          placeholder={variant === 'quizzes' ? 'Quizzes' : variant === 'live' ? 'Live Exams' : variant === 'subcategory' ? 'Subcategory Exams' : 'Category Exams'}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Title Tag</label>
        <select
          value={normalizeHeadingTag(content.headingTag, 'h3')}
          onChange={(e) => onChange({ ...content, headingTag: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          {HEADING_TAG_OPTIONS.map((tag) => (
            <option key={tag} value={tag}>{tag.toUpperCase()}</option>
          ))}
        </select>
      </div>
      {variant === 'category' && (
        <div>
          <label className="block text-sm font-medium mb-2">Category ID (optional — leave blank for all)</label>
          <input
            type="text"
            value={content.categoryId || ''}
            onChange={(e) => onChange({ ...content, categoryId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. uuid of category"
          />
        </div>
      )}
      {variant === 'subcategory' && (
        <div>
          <label className="block text-sm font-medium mb-2">Subcategory ID (optional — leave blank for all)</label>
          <input
            type="text"
            value={content.subcategoryId || ''}
            onChange={(e) => onChange({ ...content, subcategoryId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. uuid of subcategory"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-2">Max cards to fetch</label>
        <input
          type="number"
          min={4}
          max={50}
          value={content.limit || 10}
          onChange={(e) => onChange({ ...content, limit: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">View More URL (optional)</label>
        <input
          type="text"
          value={content.viewMoreUrl || ''}
          onChange={(e) => onChange({ ...content, viewMoreUrl: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. /quizzes or /live-tests"
        />
      </div>
    </div>
  );
};

const ButtonContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Label</label>
      <input
        type="text"
        value={content.text || ''}
        onChange={(e) => onChange({ ...content, text: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">URL</label>
      <input
        type="text"
        value={content.url || ''}
        onChange={(e) => onChange({ ...content, url: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">Variant</label>
        <select
          value={content.variant || 'primary'}
          onChange={(e) => onChange({ ...content, variant: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Size</label>
        <select
          value={content.size || 'medium'}
          onChange={(e) => onChange({ ...content, size: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    </div>
  </div>
);

const QuoteContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => (
  <div className="space-y-4">
    <RichTextField
      label="Quote"
      value={content.text || ''}
      rows={4}
      helper="Use inline formatting to emphasize parts of the quote"
      onChange={(value) => onChange({ ...content, text: value })}
    />
    <div>
      <label className="block text-sm font-medium mb-2">Author</label>
      <input
        type="text"
        value={content.author || ''}
        onChange={(e) => onChange({ ...content, author: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>
);

const CodeContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Language</label>
      <select
        value={content.language || 'javascript'}
        onChange={(e) => onChange({ ...content, language: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      >
        {['javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'go', 'ruby', 'php', 'sql', 'bash'].map((lang) => (
          <option key={lang} value={lang}>
            {lang.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Code</label>
      <textarea
        rows={8}
        value={content.code || ''}
        onChange={(e) => onChange({ ...content, code: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>
);

interface AccordionItem {
  title: string;
  content?: string;
  contentType?: 'text' | 'table';
  table?: {
    headers: string[];
    rows: string[][];
    hasHeader?: boolean;
    striped?: boolean;
  };
}

const AccordionContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const items: AccordionItem[] = Array.isArray(content.items) && content.items.length ? content.items : [{ title: 'Accordion Title', content: '', contentType: 'text' }];

  const updateItems = (next: any[]) => onChange({ ...content, items: next });
  const addItem = () => updateItems([...items, { title: `Item ${items.length + 1}`, content: '', contentType: 'text' }]);
  const removeItem = (i: number) => { if (items.length > 1) updateItems(items.filter((_, idx) => idx !== i)); };
  const moveItem = (i: number, dir: 'up' | 'down') => {
    const next = [...items];
    const t = dir === 'up' ? i - 1 : i + 1;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    updateItems(next);
  };
  const handleChange = (i: number, key: string, value: any) => {
    const next = [...items]; next[i] = { ...next[i], [key]: value }; updateItems(next);
  };
  const handleContentTypeChange = (i: number, type: 'text' | 'table') => {
    const next = [...items];
    next[i] = type === 'table'
      ? { ...next[i], contentType: 'table', table: next[i].table || { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', '']], hasHeader: true, striped: true } }
      : { ...next[i], contentType: 'text' };
    updateItems(next);
  };
  const handleTableChange = (i: number, tableData: any) => {
    const next = [...items]; next[i] = { ...next[i], table: tableData }; updateItems(next);
  };

  return (
    <div className="space-y-1.5">
      {/* Compact header controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 font-medium">Title tag</span>
          <select
            value={normalizeHeadingTag(content.headingTag, 'h3')}
            onChange={(e) => onChange({ ...content, headingTag: e.target.value })}
            className="text-[10px] font-bold border border-gray-200 rounded bg-white text-gray-600 px-1 py-0.5"
          >
            {HEADING_TAG_OPTIONS.map((tag) => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}
          </select>
        </div>
        <button type="button" onClick={addItem}
          className="px-2 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-400 transition-colors">
          + Add Item
        </button>
      </div>

      {/* Items */}
      {items.map((item: AccordionItem, index) => {
        const contentType = item.contentType || 'text';
        const table = item.table || { headers: ['Column 1', 'Column 2'], rows: [['', '']], hasHeader: true, striped: true };
        return (
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden group/aitem">
            {/* Item header row */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-100 group/arow">
              {/* Move up/down */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button type="button" onClick={() => moveItem(index, 'up')} disabled={index === 0}
                  className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors">
                  <ArrowUp className="w-2.5 h-2.5" />
                </button>
                <button type="button" onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1}
                  className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors">
                  <ArrowDown className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Title input */}
              <input
                type="text"
                value={item.title || ''}
                onChange={(e) => handleChange(index, 'title', e.target.value)}
                className="flex-1 text-xs font-medium bg-transparent outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 min-w-0"
                placeholder="Accordion title…"
              />

              {/* Content type toggle + delete — show on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover/arow:opacity-100 transition-opacity flex-shrink-0">
                <div className="flex border border-gray-200 rounded overflow-hidden text-[10px]">
                  <button type="button" onClick={() => handleContentTypeChange(index, 'text')}
                    className={`px-1.5 py-0.5 transition-colors ${contentType === 'text' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                    Text
                  </button>
                  <button type="button" onClick={() => handleContentTypeChange(index, 'table')}
                    className={`px-1.5 py-0.5 transition-colors ${contentType === 'table' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                    Table
                  </button>
                </div>
                <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1}
                  className="p-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-20 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="p-2 bg-white">
              {contentType === 'text' ? (
                <InlineRichTextEditor
                  value={item.content || ''}
                  onChange={(v) => handleChange(index, 'content', v)}
                  placeholder="Accordion content…"
                  rows={3}
                  variant="full"
                />
              ) : (
                <AccordionTableEditor table={table} onChange={(t) => handleTableChange(index, t)} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AccordionTableEditor = ({ table, onChange }: { table: any; onChange: (t: any) => void }) => {
  const headers: string[] = Array.isArray(table.headers) && table.headers.length ? table.headers : ['Column 1'];
  const rows: string[][] = Array.isArray(table.rows) && table.rows.length ? table.rows : [headers.map(() => '')];
  const hasHeader = table.hasHeader ?? true;
  const striped = table.striped ?? true;

  const update = (next: Partial<any>) => onChange({ ...table, ...next });

  const addColumn = () => {
    const nextHeaders = [...headers, `Column ${headers.length + 1}`];
    const nextRows = rows.map((row) => [...row, '']);
    update({ headers: nextHeaders, rows: nextRows });
  };

  const removeColumn = (i: number) => {
    if (headers.length === 1) return;
    update({ headers: headers.filter((_, idx) => idx !== i), rows: rows.map((row) => row.filter((_, idx) => idx !== i)) });
  };

  const addRow = () => update({ rows: [...rows, headers.map(() => '')] });

  const removeRow = (i: number) => {
    if (rows.length === 1) return;
    update({ rows: rows.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Options bar */}
      <div className="flex items-center gap-3 px-2 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px]">
        <label className="inline-flex items-center gap-1 cursor-pointer text-gray-600">
          <input type="checkbox" checked={hasHeader} onChange={(e) => update({ hasHeader: e.target.checked })} className="w-3 h-3 accent-blue-600" />
          Header
        </label>
        <label className="inline-flex items-center gap-1 cursor-pointer text-gray-600">
          <input type="checkbox" checked={striped} onChange={(e) => update({ striped: e.target.checked })} className="w-3 h-3 accent-blue-600" />
          Stripe
        </label>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={addColumn}
            className="px-2 py-0.5 font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-400 transition-colors">
            + Col
          </button>
          <button type="button" onClick={addRow}
            className="px-2 py-0.5 font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-400 transition-colors">
            + Row
          </button>
        </div>
      </div>

      {/* Table grid */}
      <div className="overflow-x-auto hide-scrollbar">
        <table className="min-w-full border-collapse text-xs">
          {hasHeader && (
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="p-0 relative group/hcol bg-gray-50"
                    style={{ borderRight: '1px solid #e5e7eb', borderBottom: '2px solid #e5e7eb' }}>
                    <input
                      type="text" value={h}
                      onChange={(e) => { const nh = [...headers]; nh[i] = e.target.value; update({ headers: nh }); }}
                      className="w-full px-2 py-1.5 text-xs font-semibold bg-transparent border-0 outline-none focus:bg-white min-w-[70px]"
                      placeholder={`Col ${i + 1}`}
                    />
                    <button type="button" onClick={() => removeColumn(i)} disabled={headers.length === 1}
                      className="absolute top-0.5 right-0.5 hidden group-hover/hcol:flex w-4 h-4 items-center justify-center text-[9px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded leading-none disabled:opacity-20">
                      ×
                    </button>
                  </th>
                ))}
                <th className="w-6 border-0 bg-gray-50" />
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="group/row hover:bg-blue-50/20 transition-colors"
                style={{ backgroundColor: striped && ri % 2 === 1 ? '#f9fafb' : 'white' }}>
                {headers.map((_, ci) => (
                  <td key={ci} className="p-0"
                    style={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
                    <input
                      type="text" value={row[ci] || ''}
                      onChange={(e) => {
                        const nr = rows.map((r, rIdx) => {
                          if (rIdx !== ri) return r;
                          const nc = [...r]; nc[ci] = e.target.value; return nc;
                        });
                        update({ rows: nr });
                      }}
                      className="w-full px-2 py-1.5 text-xs bg-transparent border-0 outline-none focus:bg-blue-50/40 min-w-[70px]"
                      placeholder={headers[ci] || `Col ${ci + 1}`}
                    />
                  </td>
                ))}
                <td className="w-6 border-0 align-middle pl-1">
                  <button type="button" onClick={() => removeRow(ri)} disabled={rows.length === 1}
                    className="opacity-0 group-hover/row:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center rounded hover:bg-red-50 text-gray-300 hover:text-red-500 text-xs disabled:opacity-0 leading-none">
                    ×
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={headers.length + 1} className="border-0 p-0">
                <button type="button" onClick={addRow}
                  className="w-full flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 hover:text-blue-600 hover:bg-blue-50/40 transition-colors border-t border-gray-100">
                  <span className="text-sm leading-none font-light">+</span> Add row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface Tab {
  title: string;
  content: string;
}

const TabsContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const tabs: Tab[] = Array.isArray(content.tabs) && content.tabs.length ? content.tabs : [{ title: 'Tab 1', content: '' }];

  const updateTabs = (next: any[]) => onChange({ ...content, tabs: next });

  const addTab = () => updateTabs([...tabs, { title: `Tab ${tabs.length + 1}`, content: '' }]);
  const removeTab = (index: number) => {
    if (tabs.length === 1) return;
    updateTabs(tabs.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, key: 'title' | 'content', value: string) => {
    const next = [...tabs];
    next[index] = { ...next[index], [key]: value };
    updateTabs(next);
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={addTab} className="text-blue-600 text-sm font-semibold">
        + Add Tab
      </button>
      {tabs.map((tab: Tab, index: number) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Tab {index + 1}</p>
            <button
              type="button"
              onClick={() => removeTab(index)}
              className="text-red-600 text-sm"
              disabled={tabs.length === 1}
            >
              Remove
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={tab.title || ''}
              onChange={(e) => handleChange(index, 'title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              rows={4}
              value={tab.content || ''}
              onChange={(e) => handleChange(index, 'content', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const AlertContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Alert Type</label>
      <select
        value={content.type || 'info'}
        onChange={(e) => onChange({ ...content, type: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      >
        <option value="info">Info</option>
        <option value="success">Success</option>
        <option value="warning">Warning</option>
        <option value="danger">Danger</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Text</label>
      <InlineRichTextEditor
        label="Text"
        value={content.text || ''}
        rows={4}
        onChange={(value) => onChange({ ...content, text: value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />
    </div>
  </div>
);

const InlineTableEditor = ({
  content,
  onChange
}: {
  content: any;
  onChange: (content: any) => void;
}) => {
  const headers: string[] = Array.isArray(content.headers) ? content.headers : [];
  const rows: string[][] = Array.isArray(content.rows) ? content.rows : [];
  const hasHeader = content.hasHeader ?? true;
  const striped = content.striped ?? false;
  const headerBgColor = content.headerBgColor || '#2563eb';
  const headerTextColor = content.headerTextColor || '#ffffff';
  const borderColor = content.borderColor || '#d1d5db';
  const cellLinks = content.cellLinks || {}; // Format: { "rowIndex-colIndex": "url" }
  const cellColors = content.cellColors || {}; // Format: { "rowIndex-colIndex": { bg: "#fff", text: "#000" } }
  const headerColors = content.headerColors || {}; // Format: { "colIndex": { bg: "", text: "" } }

  const update = (next: Partial<any>) => onChange({ ...content, ...next });

  const addColumn = () => {
    const nextHeaders = [...headers, `Column ${headers.length + 1}`];
    const nextRows = rows.length ? rows.map((row) => [...row, '']) : [[...nextHeaders.map(() => '')]];
    update({ headers: nextHeaders, rows: nextRows });
  };

  const removeColumn = (index: number) => {
    if (headers.length <= 1) return;
    const nextHeaders = headers.filter((_, i) => i !== index);
    const nextRows = rows.map((row) => row.filter((_, i) => i !== index));

    // Remove links and colors for deleted column
    const nextLinks = { ...cellLinks };
    const nextColors = { ...cellColors };
    Object.keys(nextLinks).forEach(key => {
      const [_, colIdx] = key.split('-').map(Number);
      if (colIdx === index) {
        delete nextLinks[key];
        delete nextColors[key];
      } else if (colIdx > index) {
        const [rowIdx] = key.split('-').map(Number);
        const newKey = `${rowIdx}-${colIdx - 1}`;
        nextLinks[newKey] = nextLinks[key];
        if (nextColors[key]) nextColors[newKey] = nextColors[key];
        delete nextLinks[key];
        delete nextColors[key];
      }
    });
    Object.keys(nextColors).forEach(key => {
      if (!nextLinks[key]) {
        const [_, colIdx] = key.split('-').map(Number);
        if (colIdx === index) {
          delete nextColors[key];
        } else if (colIdx > index) {
          const [rowIdx] = key.split('-').map(Number);
          const newKey = `${rowIdx}-${colIdx - 1}`;
          nextColors[newKey] = nextColors[key];
          delete nextColors[key];
        }
      }
    });

    // Clean up headerColors for deleted/shifted columns
    const nextHeaderColors = { ...content.headerColors || {} };
    Object.keys(nextHeaderColors).forEach(key => {
      const colIdx = Number(key);
      if (colIdx === index) {
        delete nextHeaderColors[key];
      } else if (colIdx > index) {
        nextHeaderColors[String(colIdx - 1)] = nextHeaderColors[key];
        delete nextHeaderColors[key];
      }
    });
    update({ headers: nextHeaders, rows: nextRows, cellLinks: nextLinks, cellColors: nextColors, headerColors: nextHeaderColors });
  };


  const handleTablePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData?.getData('text/html');
    if (!html) return false;

    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const table = tmp.querySelector('table');

    if (table) {
      e.preventDefault();
      e.stopPropagation();

      const trs = Array.from(table.querySelectorAll('tr'));
      if (trs.length === 0) return true;

      let newHeaders = [];
      let newRows = [];

      // Plain text only — a pasted table from Word/Docs/Excel/another site brings
      // inline styles, colours, background fills and embedded icons/images that wreck
      // the layout. Keep just the cell text; formatting is applied via the toolbar.
      // Keep bold/colour and intentional line breaks (e.g. "Tier 1" / "Tier 2"),
      // but strip inline font-size, block margins and embedded media that wreck
      // the cell layout \u2014 block margins are why a pasted header spanned two lines.
      const sanitizeCell = (cell: any) =>
        sanitizeTableCellHtml((cell.innerHTML || '').replace(/\u00a0/g, ' '), { stripAlign: true });

      if (hasHeader) {
        newHeaders = Array.from(trs[0].querySelectorAll('th, td')).map(sanitizeCell);
        for (let i = 1; i < trs.length; i++) {
          newRows.push(Array.from(trs[i].querySelectorAll('th, td')).map(sanitizeCell));
        }
      } else {
        newHeaders = Array.from(trs[0].querySelectorAll('th, td')).map(() => '');
        for (let i = 0; i < trs.length; i++) {
          newRows.push(Array.from(trs[i].querySelectorAll('th, td')).map(sanitizeCell));
        }
      }

      // Pad rows to match max columns
      const maxCols = Math.max(newHeaders.length, ...newRows.map(r => r.length));
      while (newHeaders.length < maxCols) newHeaders.push('');
      newRows = newRows.map(row => {
        const newRow = [...row];
        while (newRow.length < maxCols) newRow.push('');
        return newRow;
      });

      update({ headers: newHeaders, rows: newRows });
      return true;
    }
    return false;
  };

  const addRow = () => {
    if (!headers.length) return;
    update({ rows: [...rows, headers.map(() => '')] });
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;

    // Remove links and colors for deleted row
    const nextLinks = { ...cellLinks };
    const nextColors = { ...cellColors };
    Object.keys(nextLinks).forEach(key => {
      const [rowIdx] = key.split('-').map(Number);
      if (rowIdx === index) {
        delete nextLinks[key];
        delete nextColors[key];
      } else if (rowIdx > index) {
        const [_, colIdx] = key.split('-').map(Number);
        const newKey = `${rowIdx - 1}-${colIdx}`;
        nextLinks[newKey] = nextLinks[key];
        if (nextColors[key]) nextColors[newKey] = nextColors[key];
        delete nextLinks[key];
        delete nextColors[key];
      }
    });
    Object.keys(nextColors).forEach(key => {
      if (!nextLinks[key]) {
        const [rowIdx] = key.split('-').map(Number);
        if (rowIdx === index) {
          delete nextColors[key];
        } else if (rowIdx > index) {
          const [_, colIdx] = key.split('-').map(Number);
          const newKey = `${rowIdx - 1}-${colIdx}`;
          nextColors[newKey] = nextColors[key];
          delete nextColors[key];
        }
      }
    });

    update({ rows: rows.filter((_, i) => i !== index), cellLinks: nextLinks, cellColors: nextColors });
  };

  const handleHeaderChange = (index: number, value: string) => {
    const next = [...headers];
    next[index] = value;
    update({ headers: next });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const nextRows = rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const nextRow = [...row];
      nextRow[colIndex] = value;
      return nextRow;
    });
    update({ rows: nextRows });
  };

  const handleHeaderColorChange = (colIndex: number, colorType: 'bg' | 'text', color: string) => {
    const key = String(colIndex);
    const nextHeaderColors = { ...headerColors };
    if (!nextHeaderColors[key]) nextHeaderColors[key] = { bg: '', text: '' };
    nextHeaderColors[key][colorType] = color;
    if (!nextHeaderColors[key].bg && !nextHeaderColors[key].text) delete nextHeaderColors[key];
    update({ headerColors: nextHeaderColors });
  };

  const handleCellLinkChange = (rowIndex: number, colIndex: number, url: string) => {
    const key = `${rowIndex}-${colIndex}`;
    const nextLinks = { ...cellLinks };
    if (url.trim()) {
      // Preserve existing target if it exists
      const existingTarget = typeof nextLinks[key] === 'object' ? nextLinks[key].target : '_blank';
      nextLinks[key] = { url: url.trim(), target: existingTarget };
    } else {
      delete nextLinks[key];
    }
    update({ cellLinks: nextLinks });
  };

  const handleCellLinkTargetChange = (rowIndex: number, colIndex: number, target: '_blank' | '_self') => {
    const key = `${rowIndex}-${colIndex}`;
    const nextLinks = { ...cellLinks };
    if (nextLinks[key]) {
      const url = typeof nextLinks[key] === 'object' ? nextLinks[key].url : nextLinks[key];
      nextLinks[key] = { url, target };
      update({ cellLinks: nextLinks });
    }
  };

  const handleCellColorChange = (rowIndex: number, colIndex: number, colorType: 'bg' | 'text', color: string) => {
    const key = `${rowIndex}-${colIndex}`;
    const nextColors = { ...cellColors };
    if (!nextColors[key]) {
      nextColors[key] = { bg: '', text: '' };
    }
    nextColors[key][colorType] = color;
    // Remove entry if both colors are empty
    if (!nextColors[key].bg && !nextColors[key].text) {
      delete nextColors[key];
    }
    update({ cellColors: nextColors });
  };

  const ensureStructure = () => {
    if (!headers.length) {
      update({ headers: ['Column 1'], rows: [['']] });
    } else if (!rows.length) {
      update({ rows: [headers.map(() => '')] });
    }
  };

  const [focusedCell, setFocusedCell] = React.useState<string | null>(null);
  // Keeps the per-cell control strip visible while a native color picker is open
  const [pinnedControls, setPinnedControls] = React.useState<string | null>(null);
  // Text-color swatch popover (applies foreColor to the selected text inside a cell)
  const [textColorOpen, setTextColorOpen] = React.useState(false);
  // Saved selection range — restored before applying toolbar commands so they
  // work even though the toolbar lives outside the table's scroll container
  const savedRangeRef = React.useRef<Range | null>(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Re-focus the cell that owns the saved range before re-applying it, otherwise
  // execCommand (bold/colour/align) targets nothing once the pointer moved to the
  // toolbar — the reason colour "did not change once focus left the highlighted text".
  const restoreSelection = () => {
    focusRangeEditable(savedRangeRef.current);
  };

  // Strip margin/padding inline styles from block elements so pasted content
  // from Word/Google Docs doesn't add phantom top space inside cells
  // Convert any HTML fragment to plain text (drops tags, styles, icons/images).
  const stripHtml = (html: string): string => {
    if (typeof document === 'undefined') return html || '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || '').replace(/\u00a0/g, ' ');
  };

  // Reset content formatting: strip bold/colour/markup/icons from every header and
  // cell down to plain text, and drop per-cell/per-header colour overrides. Fixes
  // tables already polluted by past pastes (e.g. the broken "You May Also Like" block).
  const clearAllFormatting = () => {
    if (!window.confirm('Reset formatting? Removes bold, colours, background fills, icons/images and stray markup from every cell — the text is kept.')) return;
    update({
      headers: headers.map(stripHtml),
      rows: rows.map((row) => row.map(stripHtml)),
      cellColors: {},
      headerColors: {},
    });
  };

  React.useEffect(() => {
    ensureStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!headers.length || !rows.length) {
    return null;
  }

  const fmtBtn = (cmd: string, label: string, title: string, cls = '') => (
    <button key={cmd} type="button" title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        restoreSelection();
        document.execCommand(cmd);
      }}
      className={`w-6 h-6 flex items-center justify-center rounded text-xs hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors ${cls}`}>
      {label}
    </button>
  );

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">

      {/* ── Unified toolbar ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">

        {/* Format group */}
        {fmtBtn('bold', 'B', 'Bold', 'font-bold')}
        {fmtBtn('italic', 'I', 'Italic', 'italic')}
        {fmtBtn('underline', 'U', 'Underline', 'underline')}
        {fmtBtn('strikeThrough', 'S̶', 'Strikethrough')}

        {/* Text color — applies to the selected text. Uses the same selection-preserving
            pattern as fmtBtn (onMouseDown + preventDefault + restoreSelection) so the
            cell never loses focus/selection when picking a color. */}
        <div className="relative">
          <button type="button" title="Text color"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); setTextColorOpen((v) => !v); }}
            className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors"
            style={{ color: TEXT_COLOR_OPTIONS[1].value }}>
            A
          </button>
          {textColorOpen && (
            <div className="absolute z-30 top-full left-0 mt-1 p-1.5 bg-white border border-gray-200 rounded-lg shadow-xl flex items-center gap-1"
              onMouseDown={(e) => e.preventDefault()}>
              {TEXT_COLOR_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" title={opt.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    restoreSelection();
                    document.execCommand('styleWithCSS', false, 'true');
                    document.execCommand('foreColor', false, opt.value);
                    setTextColorOpen(false);
                  }}
                  className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: opt.value }} />
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Align group */}
        {fmtBtn('justifyLeft', '⬅', 'Align left')}
        {fmtBtn('justifyCenter', '⇔', 'Center')}
        {fmtBtn('justifyRight', '➡', 'Align right')}
        {fmtBtn('removeFormat', '✕', 'Clear formatting', 'text-red-400')}
        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Color & style options */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <label className="flex items-center gap-1 cursor-pointer" title="Header background color">
            <span>H·BG</span>
            <input type="color" value={headerBgColor} onChange={(e) => update({ headerBgColor: e.target.value })} className="w-5 h-5 rounded cursor-pointer border border-gray-200 p-0" />
          </label>
          <label className="flex items-center gap-1 cursor-pointer" title="Header text color">
            <span>H·Text</span>
            <input type="color" value={headerTextColor} onChange={(e) => update({ headerTextColor: e.target.value })} className="w-5 h-5 rounded cursor-pointer border border-gray-200 p-0" />
          </label>
          <label className="flex items-center gap-1 cursor-pointer" title="Border color">
            <span>Border</span>
            <input type="color" value={borderColor} onChange={(e) => update({ borderColor: e.target.value })} className="w-5 h-5 rounded cursor-pointer border border-gray-200 p-0" />
          </label>
        </div>
        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Toggles */}
        <label className="inline-flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer select-none">
          <input type="checkbox" checked={hasHeader} onChange={(e) => update({ hasHeader: e.target.checked })} className="w-3 h-3 rounded accent-blue-600" />
          Header
        </label>
        <label className="inline-flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer select-none">
          <input type="checkbox" checked={striped} onChange={(e) => update({ striped: e.target.checked })} className="w-3 h-3 rounded accent-blue-600" />
          Stripe
        </label>
        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Add controls */}
        <button type="button" onClick={addColumn}
          className="px-2 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-400 transition-colors">
          + Col
        </button>
        <button type="button" onClick={addRow}
          className="px-2 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-400 transition-colors">
          + Row
        </button>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <button type="button" onClick={clearAllFormatting}
          title="Strip bold, colours, backgrounds, icons/images and stray markup from every cell — keeps the text"
          className="px-2 py-0.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 rounded border border-gray-300 hover:border-gray-400 transition-colors">
          Clear formatting
        </button>

        {/* Active cell indicator */}
        {focusedCell && (
          <span className="ml-auto text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 flex-shrink-0">
            {focusedCell.startsWith('h-')
              ? `Header C${Number(focusedCell.replace('h-', '')) + 1}`
              : `R${Number(focusedCell.split('-')[0]) + 1} · C${Number(focusedCell.split('-')[1]) + 1}`}
          </span>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto hide-scrollbar">
        <table className="min-w-full text-sm border-collapse">
          {hasHeader && (
            <thead>
              <tr>
                {headers.map((header, index) => {
                  const hColor = headerColors[String(index)] || { bg: '', text: '' };
                  const hText = hColor.text || headerTextColor || '#ffffff';
                  const hBg = hColor.bg || headerBgColor;
                  return (
                    <th key={index} className="relative group/hcell p-0 text-left align-top" style={{ borderRight: `1px solid ${borderColor}`, borderBottom: `2px solid ${borderColor}` }}>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className={`px-3 py-2 text-xs font-semibold leading-snug text-center min-w-[90px] min-h-[32px] focus:outline-none focus:brightness-110 ${TABLE_CELL_RESET}`}
                        style={{ color: hText, backgroundColor: hBg }}
                        dangerouslySetInnerHTML={{ __html: header }}
                        onFocus={() => setFocusedCell(`h-${index}`)}
                        onBlur={(e) => { setFocusedCell(null); handleHeaderChange(index, sanitizeTableCellHtml(e.currentTarget.innerHTML)); }}
                        onSelect={saveSelection}
                        onKeyUp={saveSelection}
                        onMouseUp={saveSelection}
                        onPaste={(e) => {
                          // A full pasted table repopulates the grid (still as plain text);
                          // anything else is inserted as plain text into the focused cell.
                          if (handleTablePaste(e)) return;
                          e.preventDefault();
                          let text = e.clipboardData?.getData('text/plain') || '';
                          if (!text) text = stripHtml(e.clipboardData?.getData('text/html') || '');
                          document.execCommand('insertText', false, text.replace(/\u00a0/g, ' '));
                        }}
                        onKeyDown={(e) => { if (e.ctrlKey || e.metaKey) { if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); } if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); } if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); } } }}
                      />
                      {/* Column hover controls — stay visible while color picker is open */}
                      <div className={`absolute top-1 right-1 items-center gap-0.5 z-20 ${pinnedControls === `hcol-${index}` ? 'flex' : 'hidden group-hover/hcell:flex'}`}>
                        <input type="color" value={hBg}
                          onChange={(e) => handleHeaderColorChange(index, 'bg', e.target.value)}
                          onFocus={() => setPinnedControls(`hcol-${index}`)}
                          onBlur={() => setTimeout(() => setPinnedControls(null), 150)}
                          className="w-4 h-4 rounded cursor-pointer border-0 p-0" title="Column BG" />
                        <input type="color" value={hText}
                          onChange={(e) => handleHeaderColorChange(index, 'text', e.target.value)}
                          onFocus={() => setPinnedControls(`hcol-${index}`)}
                          onBlur={() => setTimeout(() => setPinnedControls(null), 150)}
                          className="w-4 h-4 rounded cursor-pointer border-0 p-0" title="Column text" />
                        <button type="button" onClick={() => removeColumn(index)} disabled={headers.length <= 1}
                          className="w-4 h-4 flex items-center justify-center rounded-full bg-white hover:bg-red-50 text-red-400 text-[9px] border border-red-200 shadow-sm disabled:opacity-20 leading-none transition-colors"
                          title="Remove column">×</button>
                      </div>
                    </th>
                  );
                })}
                {/* Inline add-column button */}
                <th className="w-8 p-0 border-0 bg-transparent align-middle">
                  <button type="button" onClick={addColumn}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-base leading-none mx-1"
                    title="Add column">+</button>
                </th>
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={`group/row transition-colors ${striped && rowIndex % 2 === 1 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50/30`}>
                {row.map((cell, cellIndex) => {
                  const cellKey = `${rowIndex}-${cellIndex}`;
                  const cellLinkData = cellLinks[cellKey];
                  const cellLink = typeof cellLinkData === 'object' ? cellLinkData.url : cellLinkData || '';
                  const cellLinkTarget = typeof cellLinkData === 'object' ? cellLinkData.target : '_blank';
                  const cellColor = cellColors[cellKey] || { bg: '', text: '' };
                  const isFocused = focusedCell === cellKey;
                  return (
                    <td key={cellIndex}
                      className={`relative group/cell p-0 align-top transition-colors ${isFocused ? 'ring-2 ring-inset ring-blue-400 z-10' : ''}`}
                      style={{ borderRight: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className={`px-3 py-2 text-xs leading-snug text-center min-h-[32px] min-w-[90px] focus:outline-none ${TABLE_CELL_RESET}`}
                        style={{ color: cellColor.text || '#111827', backgroundColor: cellColor.bg || 'transparent' }}
                        dangerouslySetInnerHTML={{ __html: cell }}
                        onFocus={() => setFocusedCell(cellKey)}
                        onBlur={(e) => { setFocusedCell(null); handleCellChange(rowIndex, cellIndex, sanitizeTableCellHtml(e.currentTarget.innerHTML)); }}
                        onSelect={saveSelection}
                        onKeyUp={saveSelection}
                        onMouseUp={saveSelection}
                        onPaste={(e) => {
                          // A full pasted table repopulates the grid (still as plain text);
                          // anything else is inserted as plain text into the focused cell.
                          if (handleTablePaste(e)) return;
                          e.preventDefault();
                          let text = e.clipboardData?.getData('text/plain') || '';
                          if (!text) text = stripHtml(e.clipboardData?.getData('text/html') || '');
                          document.execCommand('insertText', false, text.replace(/\u00a0/g, ' '));
                        }}
                        onKeyDown={(e) => { if (e.ctrlKey || e.metaKey) { if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); } if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); } if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); } } }}
                      />
                      {/* Per-cell controls — stay visible while color picker is open */}
                      <div className={`absolute bottom-0.5 right-0.5 items-center gap-0.5 z-10 ${pinnedControls === cellKey ? 'flex' : 'hidden group-hover/cell:flex'}`}>
                        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-md px-1 py-0.5 shadow-sm">
                          <input type="color" value={cellColor.bg || '#ffffff'}
                            onChange={(e) => handleCellColorChange(rowIndex, cellIndex, 'bg', e.target.value)}
                            onFocus={() => setPinnedControls(cellKey)}
                            onBlur={() => setTimeout(() => setPinnedControls(null), 150)}
                            className="w-3.5 h-3.5 rounded cursor-pointer border-0 p-0" title="Cell BG" />
                          <input type="color" value={cellColor.text || '#000000'}
                            onChange={(e) => handleCellColorChange(rowIndex, cellIndex, 'text', e.target.value)}
                            onFocus={() => setPinnedControls(cellKey)}
                            onBlur={() => setTimeout(() => setPinnedControls(null), 150)}
                            className="w-3.5 h-3.5 rounded cursor-pointer border-0 p-0" title="Text color" />
                          <button type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const url = window.prompt('Cell link URL (leave empty to remove):', cellLink);
                              if (url !== null) handleCellLinkChange(rowIndex, cellIndex, url);
                            }}
                            className={`text-[11px] leading-none transition-colors px-0.5 ${cellLink ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                            title={cellLink ? `Link: ${cellLink}` : 'Add link'}>🔗</button>
                          {cellLink && (
                            <button type="button"
                              onMouseDown={(e) => { e.preventDefault(); handleCellLinkTargetChange(rowIndex, cellIndex, cellLinkTarget === '_blank' ? '_self' : '_blank'); }}
                              className="text-[9px] text-gray-400 hover:text-gray-700 leading-none"
                              title={cellLinkTarget === '_blank' ? 'New tab (click to change)' : 'Same tab (click to change)'}>
                              {cellLinkTarget === '_blank' ? '↗' : '→'}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
                {/* Row delete — visible on row hover only */}
                <td className="w-8 border-0 align-middle pl-1">
                  <button type="button" onClick={() => removeRow(rowIndex)} disabled={rows.length <= 1}
                    className="opacity-0 group-hover/row:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 text-xs disabled:opacity-0 leading-none"
                    title="Remove row">×</button>
                </td>
              </tr>
            ))}
            {/* Inline add-row */}
            <tr>
              <td colSpan={headers.length + 1} className="border-0 p-0">
                <button type="button" onClick={addRow}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-gray-400 hover:text-blue-600 hover:bg-blue-50/40 transition-colors border-t border-gray-100">
                  <span className="text-sm leading-none font-light">+</span> Add row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ImageContentEditor = ({
  content,
  onChange,
  mediaUploadConfig
}: {
  content: any;
  onChange: (content: any) => void;
  mediaUploadConfig?: BlockEditorMediaUploadConfig;
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const maxSizeMB = mediaUploadConfig?.maxSizeMB ?? 150;
  const enableCrop = Boolean(content.enableCrop);
  const borderRadius = typeof content.borderRadius === 'number'
    ? content.borderRadius
    : Number.parseFloat(content.borderRadius) || 0;

  const aspectRatioOptions = [
    { label: 'Freeform', value: '' },
    { label: 'Square 1:1', value: '1:1' },
    { label: 'Landscape 16:9', value: '16:9' },
    { label: 'Classic 4:3', value: '4:3' },
    { label: 'Portrait 3:4', value: '3:4' }
  ];

  const objectFitOptions = [
    { label: 'Cover (crop to fill)', value: 'cover' },
    { label: 'Contain (fit inside)', value: 'contain' },
    { label: 'Fill', value: 'fill' }
  ];

  const parseAspectRatio = (ratio?: string) => {
    if (!ratio) return undefined;
    const [w, h] = ratio.split(':').map((part) => Number(part.trim()));
    if (!w || !h) return undefined;
    return `${w}/${h}`;
  };

  const notifyError = (message: string) => {
    if (mediaUploadConfig?.onUploadError) {
      mediaUploadConfig.onUploadError(message);
    } else if (typeof window !== 'undefined') {
      window.alert(message);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !mediaUploadConfig?.onUpload) {
      event.target.value = '';
      return;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      notifyError(`Image exceeds the ${maxSizeMB}MB limit.`);
      event.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const result = await mediaUploadConfig.onUpload(file, { blockType: 'image' });
      onChange({
        ...content,
        url: result.url,
        alt: result.alt || content.alt || file.name,
        caption: content.caption || result.caption || ''
      });
      mediaUploadConfig.onUploadSuccess?.('Image uploaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      notifyError(message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleChange = (key: string, value: any) => {
    onChange({
      ...content,
      [key]: value
    });
  };

  const previewAspectRatio = enableCrop ? parseAspectRatio(content.aspectRatio) : undefined;

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2">Image URL</label>
        <input
          type="text"
          value={content.url || ''}
          onChange={(e) => handleChange('url', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
        {mediaUploadConfig && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {uploading ? 'Uploading…' : 'Upload Image'}
            </button>
            <p className="mt-1 text-xs text-gray-500">JPG, PNG, WebP up to {maxSizeMB}MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Alt Text</label>
          <input
            type="text"
            value={content.alt || ''}
            onChange={(e) => handleChange('alt', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Caption</label>
          <input
            type="text"
            value={content.caption || ''}
            onChange={(e) => handleChange('caption', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Width</label>
          <input
            type="text"
            value={content.width || '100%'}
            onChange={(e) => handleChange('width', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 100%, 640px"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Height (optional)</label>
          <input
            type="text"
            value={content.height || ''}
            onChange={(e) => handleChange('height', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Border Radius ({borderRadius.toFixed(0)}px)</label>
          <input
            type="range"
            min={0}
            max={64}
            value={borderRadius}
            onChange={(e) => handleChange('borderRadius', Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enable-crop"
            checked={enableCrop}
            onChange={(e) => handleChange('enableCrop', e.target.checked)}
          />
          <label htmlFor="enable-crop" className="text-sm font-medium">Enable crop/aspect ratio</label>
        </div>
      </div>

      {enableCrop && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
            <select
              value={content.aspectRatio || ''}
              onChange={(e) => handleChange('aspectRatio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              {aspectRatioOptions.map((option) => (
                <option key={option.value || 'free'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Fill Behavior</label>
            <select
              value={content.objectFit || 'cover'}
              onChange={(e) => handleChange('objectFit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              {objectFitOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Live Preview</label>
        <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
          {content.url ? (
            <figure className="space-y-2 text-center">
              <div
                className={`mx-auto overflow-hidden ${enableCrop ? 'relative' : ''}`}
                style={{
                  width: content.width || '100%',
                  maxWidth: '100%',
                  borderRadius,
                  aspectRatio: previewAspectRatio,
                  height: enableCrop ? undefined : content.height || undefined
                }}
              >
                <img
                  src={content.url}
                  alt={content.alt || ''}
                  className="w-full h-full object-cover"
                  style={{
                    objectFit: enableCrop ? (content.objectFit || 'cover') : undefined,
                    height: enableCrop ? '100%' : content.height || 'auto',
                    borderRadius: enableCrop ? 0 : borderRadius
                  }}
                />
              </div>
              {content.caption && <figcaption className="text-xs text-gray-500">{content.caption}</figcaption>}
            </figure>
          ) : (
            <p className="text-sm text-gray-500 text-center">Upload or paste an image URL to preview.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const VideoContentEditor = ({
  content,
  onChange,
  mediaUploadConfig
}: {
  content: any;
  onChange: (content: any) => void;
  mediaUploadConfig?: BlockEditorMediaUploadConfig;
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const maxSizeMB = mediaUploadConfig?.maxSizeMB ?? 150;

  const notifyError = (message: string) => {
    if (mediaUploadConfig?.onUploadError) {
      mediaUploadConfig.onUploadError(message);
    } else if (typeof window !== 'undefined') {
      window.alert(message);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !mediaUploadConfig?.onUpload) {
      event.target.value = '';
      return;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      notifyError(`Video exceeds the ${maxSizeMB}MB limit.`);
      event.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const result = await mediaUploadConfig.onUpload(file, { blockType: 'video' });
      onChange({
        ...content,
        url: result.url,
        caption: content.caption || result.caption || ''
      });
      mediaUploadConfig.onUploadSuccess?.('Video uploaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload video';
      notifyError(message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Embed / Video URL</label>
        <input
          type="text"
          value={content.url || ''}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
        {mediaUploadConfig && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {uploading ? 'Uploading…' : 'Upload Video'}
            </button>
            <p className="mt-1 text-xs text-gray-500">MP4, WebM, MOV up to {maxSizeMB}MB.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Caption (optional)</label>
        <input
          type="text"
          value={content.caption || ''}
          onChange={(e) => onChange({ ...content, caption: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
      </div>
    </div>
  );
};

const CardContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Title Tag</label>
      <select
        value={normalizeHeadingTag(content.headingTag, 'h3')}
        onChange={(e) => onChange({ ...content, headingTag: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      >
        {HEADING_TAG_OPTIONS.map((tag) => (
          <option key={tag} value={tag}>{tag.toUpperCase()}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Title</label>
      <input
        type="text"
        value={content.title || ''}
        onChange={(e) => onChange({ ...content, title: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />
    </div>
    <RichTextField
      label="Description"
      value={content.description || ''}
      rows={4}
      helper="Supports inline formatting for highlights or links"
      onChange={(value) => onChange({ ...content, description: value })}
    />
    <div>
      <label className="block text-sm font-medium mb-2">Image URL</label>
      <input
        type="text"
        value={content.image || ''}
        onChange={(e) => onChange({ ...content, image: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">Link Text</label>
        <input
          type="text"
          value={(content.link && content.link.text) || ''}
          onChange={(e) => onChange({ ...content, link: { ...(content.link || {}), text: e.target.value } })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Link URL</label>
        <input
          type="text"
          value={(content.link && content.link.url) || ''}
          onChange={(e) => onChange({ ...content, link: { ...(content.link || {}), url: e.target.value } })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
      </div>
    </div>
  </div>
);

interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  helper?: string;
}

const RichTextField: React.FC<RichTextFieldProps> = ({ label, value, onChange, rows = 6, helper }) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  const updateSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    selectionRef.current = {
      start: textarea.selectionStart ?? 0,
      end: textarea.selectionEnd ?? 0
    };
  };

  const applyFormat = (prefix: string, suffix: string, placeholder = 'Text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { start, end } = selectionRef.current;
    const actualStart = Math.max(0, Math.min(start, end));
    const actualEnd = Math.max(actualStart, Math.max(start, end));
    const selected = value.slice(actualStart, actualEnd) || placeholder;
    const nextValue = `${value.slice(0, actualStart)}${prefix}${selected}${suffix}${value.slice(actualEnd)}`;
    const cursorStart = actualStart + prefix.length;
    const cursorEnd = cursorStart + selected.length;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorStart, cursorEnd);
      selectionRef.current = { start: cursorStart, end: cursorEnd };
    });
  };

  const handleLink = () => {
    const url = window.prompt('Enter URL');
    if (!url) return;
    applyFormat(`<a href="${url}" target="_blank" rel="noopener noreferrer">`, '</a>', 'Link text');
  };

  const toolbarButtons = [
    { label: 'B', title: 'Bold', action: () => applyFormat('<strong>', '</strong>') },
    { label: 'I', title: 'Italic', action: () => applyFormat('<em>', '</em>') },
    { label: 'U', title: 'Underline', action: () => applyFormat('<u>', '</u>') },
    { label: '</>', title: 'Code', action: () => applyFormat('<code>', '</code>') },
    { label: 'Link', title: 'Insert link', action: handleLink }
  ];

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-1">
          {toolbarButtons.map((button) => (
            <button
              key={button.label}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={button.action}
              className="px-2 py-1 text-xs font-semibold border border-gray-200 rounded hover:bg-gray-100"
              title={button.title}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={updateSelection}
        onKeyUp={updateSelection}
        onMouseUp={updateSelection}
        onBlur={updateSelection}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 font-medium"
      />
      {helper && <p className="mt-2 text-xs text-gray-500">{helper}</p>}
    </div>
  );
};

const getDefaultBlockContent = (blockType: string): any => {
  const defaults: Record<string, any> = {
    heading: { text: 'New Heading', level: 2, alignment: 'left' },
    paragraph: { text: 'Enter your text here...', alignment: 'left' },
    list: { type: 'unordered', items: ['Item 1', 'Item 2', 'Item 3'] },
    table: {
      headers: ['Column 1', 'Column 2', 'Column 3'],
      rows: [['Data 1', 'Data 2', 'Data 3']],
      hasHeader: true,
      striped: true
    },
    image: {
      url: '',
      alt: '',
      caption: '',
      width: '100%',
      height: '',
      alignment: 'center',
      borderRadius: 12,
      enableCrop: false,
      aspectRatio: '',
      objectFit: 'cover'
    },
    quote: { text: 'Enter quote text...', author: '' },
    button: { text: 'Click Here', url: '#', variant: 'primary', size: 'medium' },
    accordion: { headingTag: 'h3', items: [{ title: 'Question 1', content: 'Answer 1' }] },
    alert: { text: 'This is an alert message', type: 'info' },
    examCards: { examIds: [], title: 'Related Exams', headingTag: 'h3', layout: 'grid', columns: 2 },
    autoExamCards: { variant: 'category', title: 'Category Exams', headingTag: 'h3', limit: 10 },
    card: { title: 'Card Title', headingTag: 'h3', description: 'Add supporting content here...' },
    adBanner: { headline: 'Banner headline', headingTag: 'h3', description: 'Banner copy goes here.' }
  };

  return defaults[blockType] || {};
};
