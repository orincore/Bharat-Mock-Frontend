'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Save,
  Undo,
  Redo,
  ChevronDown,
  UploadCloud,
  Loader2,
  Bold,
  Italic,
  Underline,
  Palette
} from 'lucide-react';
import { BlockRenderer, getBlockIcon } from './BlockRenderer';

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
  text_color?: string;
  background_color?: string;
}

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

const FONT_OPTIONS = [
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
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<{ id: string; title: string; category?: string; status?: string }[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const searchExams = React.useCallback(async (term: string) => {
    if (!term.trim()) { setResults([]); return; }
    try {
      setSearching(true);
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '') || '/api/v1';
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null;
      const res = await fetch(`${apiBase}/exams?search=${encodeURIComponent(term.trim())}&limit=10`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      const exams = data.data || [];
      setResults(exams.map((e: any) => ({ id: e.id, title: e.title, category: e.category, status: e.status })));
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

  const addExam = (exam: { id: string; title: string }) => {
    if (examIds.includes(exam.id)) return;
    onChange({
      ...content,
      examIds: [...examIds, exam.id],
      examNames: { ...examNames, [exam.id]: exam.title }
    });
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const removeExam = (id: string) => {
    const nextNames = { ...examNames };
    delete nextNames[id];
    onChange({
      ...content,
      examIds: examIds.filter((eid: string) => eid !== id),
      examNames: nextNames
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
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
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
                      <p className="text-xs text-gray-500">{[exam.category, exam.status].filter(Boolean).join(' · ')}</p>
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
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
              No exams found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
        {examIds.length > 0 && (
          <div className="mt-3 space-y-2">
            {examIds.map((id: string, index: number) => (
              <div key={id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
                <span className="text-sm text-gray-700 truncate flex-1">
                  {index + 1}. {examNames[id] || id}
                </span>
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
    is_sidebar: section.is_sidebar ?? false
  }));

const snapshotSections = (source: Section[]): Section[] =>
  normalizeSections(source).map((section) => ({
    ...section,
    blocks: section.blocks.map((block) => ({
      ...block,
      content: deepClone(block.content)
    }))
  }));

const AUTOSAVE_PREFIX = 'block-editor-autosave:';

const buildAutosaveStorageKey = (autosaveKey: string) => `${AUTOSAVE_PREFIX}${autosaveKey}`;

export const clearBlockEditorAutosave = (autosaveKey?: string) => {
  if (!autosaveKey || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(buildAutosaveStorageKey(autosaveKey));
  } catch (error) {
    console.warn('Failed to clear autosave draft', error);
  }
};

interface BlockEditorProps {
  sections: Section[];
  onSave: (sections: Section[]) => void;
  autosaveKey?: string;
  onSectionsChange?: (sections: Section[]) => void;
  tabLabel?: string;
  mediaUploadConfig?: BlockEditorMediaUploadConfig;
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
}

export const InlineRichTextEditor: React.FC<InlineRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  rows = 4,
  className = '',
  label,
  helperText,
  variant = 'full',
  onImagePaste
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    code: false,
    link: false,
    color: TEXT_COLOR_OPTIONS[0].value,
    highlight: '',
    font: FONT_OPTIONS[0].value,
    bulletList: false,
    numberedList: false
  });

  useEffect(() => {
    if (editorRef.current) {
      const sanitized = value || '';
      if (editorRef.current.innerHTML !== sanitized) {
        editorRef.current.innerHTML = sanitized;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    const nextValue = editorRef.current.innerHTML.replace(/\u200B/g, '');
    onChange(nextValue);
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
        bulletList: false,
        numberedList: false
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

    setActiveFormats({
      bold,
      italic,
      underline,
      code,
      link,
      color,
      highlight,
      font: computedStyle?.fontFamily || FONT_OPTIONS[0].value,
      bulletList,
      numberedList
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
    const url = window.prompt('Enter URL');
    if (!url) return;
    exec('createLink', url);
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
    if (!onImagePaste || !event.clipboardData) return;

    const items = Array.from(event.clipboardData.items || []);
    let file = items.find(item => item.type.startsWith('image/'))?.getAsFile() || null;

    if (!file) {
      const files = Array.from(event.clipboardData.files || []);
      file = files.find(f => f.type.startsWith('image/')) || null;
    }

    if (file) {
      event.preventDefault();
      onImagePaste(file);
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

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleSelectionChange = () => updateActiveFormats();
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateActiveFormats]);

  const buttons = [
    { label: 'B', title: 'Bold', action: () => exec('bold'), key: 'bold' as const },
    { label: 'I', title: 'Italic', action: () => exec('italic'), key: 'italic' as const },
    { label: 'U', title: 'Underline', action: () => exec('underline'), key: 'underline' as const },
    { label: '</>', title: 'Code', action: insertCode, key: 'code' as const },
    { label: 'Link', title: 'Insert link', action: insertLink, key: 'link' as const },
    { label: '•', title: 'Bulleted list', action: () => exec('insertUnorderedList'), key: 'bulletList' as const },
    { label: '1.', title: 'Numbered list', action: () => exec('insertOrderedList'), key: 'numberedList' as const },
    { label: '↵', title: 'Insert line break', action: insertLineBreak },
    { label: 'Clear', title: 'Remove formatting', action: () => exec('removeFormat'), key: undefined }
  ];

  const minHeight = Math.max(48, rows * 24);

  return (
    <div className="w-full space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="border border-gray-200 rounded-xl bg-white">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-100">
          <div className="flex flex-wrap gap-1">
            {buttons.map((button) => {
              const isActive = button.key ? activeFormats[button.key] : false;
              return (
                <button
                  key={button.label}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={button.action}
                  className={`px-2 py-1 text-xs font-semibold rounded hover:bg-gray-100 ${
                    isActive ? 'bg-gray-200 text-blue-600' : ''
                  }`}
                  title={button.title}
                >
                  {button.label}
                </button>
              );
            })}
          </div>
          {variant === 'full' && (
            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-1 text-xs text-gray-500">
                Font
                <select
                  value={activeFormats.font}
                  onChange={(event) => applyFontFamily(event.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-500">
                Text
                <select
                  value={activeFormats.color}
                  onChange={(event) => applyTextColor(event.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                >
                  {TEXT_COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="color"
                  value={activeFormats.color}
                  onChange={(event) => applyTextColor(event.target.value)}
                  className="w-8 h-6 border border-gray-200 rounded"
                  title="Custom text color"
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-500">
                Highlight
                <select
                  value={activeFormats.highlight}
                  onChange={(event) => applyHighlightColor(event.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                >
                  {HIGHLIGHT_COLOR_OPTIONS.map((option) => (
                    <option key={option.value || 'none'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="color"
                  value={activeFormats.highlight || '#ffffff'}
                  onChange={(event) => applyHighlightColor(event.target.value)}
                  className="w-8 h-6 border border-gray-200 rounded"
                  title="Custom highlight color"
                />
              </label>
            </div>
          )}
        </div>
        <div className="relative">
          {(!value || value === '<p></p>' || value === '<br>') && (
            <span className="absolute left-3 top-3 text-gray-400 text-sm pointer-events-none">{placeholder}</span>
          )}
          <div
            ref={editorRef}
            className={`px-3 py-3 focus:outline-none text-sm rich-text-editor ${className}`}
            style={{ minHeight }}
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
      <div className="text-xs text-gray-500 space-y-1">
        {helperText && <p>{helperText}</p>}
        <p>Tip: Press Shift + Enter to add a new line (press Enter normally inside lists).</p>
        {onImagePaste && <p>Tip: Paste images (Ctrl/⌘ + V) to auto-upload.</p>}
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
      1: 'text-4xl',
      2: 'text-3xl',
      3: 'text-2xl',
      4: 'text-xl',
      5: 'text-lg',
      6: 'text-base'
    };

    return (
      <div className="border border-blue-100 bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase text-blue-600">Heading block</span>
          <select
            value={level}
            onChange={(e) => onContentChange({ ...content, level: Number(e.target.value) })}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1"
          >
            {[1, 2, 3, 4, 5, 6].map((lvl) => (
              <option key={lvl} value={lvl}>
                H{lvl}
              </option>
            ))}
          </select>
        </div>
        <InlineRichTextEditor
          value={content.text || ''}
          onChange={(value) => onContentChange({ ...content, text: value })}
          placeholder="Heading text"
          rows={level <= 3 ? 2 : 3}
          className={`${headingSizes[level] || 'text-2xl'} font-semibold text-gray-900 leading-tight`}
        />
      </div>
    );
  }

  if (block.block_type === 'paragraph') {
    return (
      <div className="border border-gray-200 bg-white rounded-xl p-4 shadow-sm">
        <span className="text-xs font-semibold uppercase text-gray-500">Paragraph</span>
        <InlineRichTextEditor
          value={content.text || ''}
          onChange={(value) => onContentChange({ ...content, text: value })}
          placeholder="Add paragraph text"
          rows={4}
          className="text-base leading-relaxed text-gray-800"
        />
      </div>
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
      <div className="border border-amber-100 bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase text-amber-700">
            {listType === 'ordered' ? 'Numbered list' : 'Bulleted list'}
          </span>
          <div className="inline-flex rounded-full border border-amber-200 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => onContentChange({ ...content, type: 'unordered' })}
              className={`px-3 py-1 ${listType === 'unordered' ? 'bg-amber-500 text-white' : 'text-amber-700'}`}
            >
              Bullets
            </button>
            <button
              type="button"
              onClick={() => onContentChange({ ...content, type: 'ordered' })}
              className={`px-3 py-1 ${listType === 'ordered' ? 'bg-amber-500 text-white' : 'text-amber-700'}`}
            >
              Numbers
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex gap-3 items-start bg-amber-50/60 border border-amber-100 rounded-lg p-3">
              <span className="text-amber-700 mt-2 min-w-[16px] text-sm">
                {listType === 'ordered' ? `${index + 1}.` : '•'}
              </span>
              <div className="flex-1">
                <InlineRichTextEditor
                  value={item}
                  onChange={(value) => handleItemChange(index, value)}
                  placeholder={`List item ${index + 1}`}
                  rows={2}
                  className="text-base leading-relaxed text-gray-800"
                />
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-amber-600 text-sm hover:underline disabled:text-gray-400"
                disabled={items.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 text-sm font-semibold text-amber-700 hover:text-amber-900"
        >
          + Add item
        </button>
      </div>
    );
  }

  if (block.block_type === 'quote') {
    return (
      <div className="border border-purple-100 bg-white rounded-xl p-4 shadow-sm">
        <span className="text-xs font-semibold uppercase text-purple-700">Quote</span>
        <InlineRichTextEditor
          value={content.text || ''}
          onChange={(value) => onContentChange({ ...content, text: value })}
          placeholder="Quote text"
          rows={3}
          className="text-lg italic text-gray-800"
        />
        <div className="mt-3">
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Author</label>
          <input
            type="text"
            value={content.author || ''}
            onChange={(e) => onContentChange({ ...content, author: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-purple-200"
            placeholder="Attribution"
          />
        </div>
      </div>
    );
  }

  if (block.block_type === 'alert') {
    return (
      <div className="border border-rose-100 bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase text-rose-600">Alert</span>
          <select
            value={content.type || 'info'}
            onChange={(e) => onContentChange({ ...content, type: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1"
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
          </select>
        </div>
        <InlineRichTextEditor
          value={content.text || ''}
          onChange={(value) => onContentChange({ ...content, text: value })}
          placeholder="Alert message"
          rows={3}
          className="text-base leading-relaxed text-gray-800"
        />
      </div>
    );
  }

  if (block.block_type === 'card') {
    return (
      <div className="border border-emerald-100 bg-white rounded-xl p-4 shadow-sm">
        <span className="text-xs font-semibold uppercase text-emerald-600">Card</span>
        <div className="mt-3 space-y-3">
          <input
            type="text"
            value={content.title || ''}
            onChange={(e) => onContentChange({ ...content, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded"
            placeholder="Card title"
          />
          <InlineRichTextEditor
            value={content.description || ''}
            onChange={(value) => onContentChange({ ...content, description: value })}
            placeholder="Card description"
            rows={3}
            className="text-base leading-relaxed text-gray-800"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={content.image || ''}
              onChange={(e) => onContentChange({ ...content, image: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded"
              placeholder="Image URL"
            />
            <input
              type="text"
              value={content.subtitle || ''}
              onChange={(e) => onContentChange({ ...content, subtitle: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded"
              placeholder="Subtitle (optional)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={content.link?.text || ''}
              onChange={(e) => onContentChange({ ...content, link: { ...(content.link || {}), text: e.target.value } })}
              className="px-3 py-2 border border-gray-200 rounded"
              placeholder="Button text"
            />
            <input
              type="text"
              value={content.link?.url || ''}
              onChange={(e) => onContentChange({ ...content, link: { ...(content.link || {}), url: e.target.value } })}
              className="px-3 py-2 border border-gray-200 rounded"
              placeholder="Button link"
            />
          </div>
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
  { type: 'examCards', label: 'Exam Cards', description: 'Attach and display exam cards' }
];

const INLINE_EDITABLE_BLOCKS = new Set([
  'heading',
  'paragraph',
  'list',
  'quote',
  'alert',
  'card'
]);

export const BlockEditor: React.FC<BlockEditorProps> = ({ 
  sections: initialSections, 
  onSave,
  autosaveKey,
  onSectionsChange,
  tabLabel,
  mediaUploadConfig
}) => {
  const [sections, setSections] = useState<Section[]>(() => normalizeSections(initialSections));
  const parentSectionsSignatureRef = useRef<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const isPreview = false;
  const [showBlockPicker, setShowBlockPicker] = useState<string | null>(null);
  const [openBlockEditor, setOpenBlockEditor] = useState<string | null>(null);
  const historyRef = useRef<Section[][]>([snapshotSections(initialSections)]);
  const historyIndexRef = useRef(0);
  const [historyIndex, setHistoryIndex] = useState(0);
  const syncingFromParentRef = useRef(false);
  const suppressHistoryRef = useRef(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<{ sectionId: string; blockId: string } | null>(null);
  const [dragOverBlock, setDragOverBlock] = useState<{ sectionId: string; blockId: string } | null>(null);

  useEffect(() => {
    if (!parentSectionsSignatureRef.current || parentSectionsSignatureRef.current === JSON.stringify(initialSections)) {
      return;
    }
    parentSectionsSignatureRef.current = JSON.stringify(initialSections);
    syncingFromParentRef.current = true;
    const normalized = normalizeSections(initialSections);
    setSections(normalized);
    historyRef.current = [snapshotSections(normalized)];
    historyIndexRef.current = 0;
    setHistoryIndex(0);
  }, [initialSections]);

  useEffect(() => {
    if (typeof window === 'undefined' || !autosaveKey) return;
    try {
      const stored = localStorage.getItem(buildAutosaveStorageKey(autosaveKey));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.sections) {
          setSections(parsed.sections);
        }
      }
    } catch (error) {
      console.warn('Failed to load autosave draft', error);
    }
  }, [autosaveKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !autosaveKey) return;
    try {
      const payload = {
        sections,
        updatedAt: Date.now()
      };
      localStorage.setItem(buildAutosaveStorageKey(autosaveKey), JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to persist autosave draft', error);
    }
  }, [sections, autosaveKey]);

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
      onSectionsChange?.(sections);
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

    onSectionsChange?.(sections);
  }, [sections, onSectionsChange]);

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
          ? { ...section, is_sidebar: !(section.is_sidebar ?? false) }
          : section
      )
    );
  };

  const addSection = () => {
    const newSection: Section = {
      id: `temp-${Date.now()}`,
      title: 'New Section',
      display_order: sections.length,
      blocks: [],
      is_sidebar: false
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

  const handleSectionDragStart = (event: React.DragEvent<HTMLDivElement>, sectionId: string) => {
    if (isPreview) return;
    setDraggingSectionId(sectionId);
    setDragOverSectionId(null);
    event.dataTransfer.setData('text/plain', sectionId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleSectionDragOver = (event: React.DragEvent<HTMLDivElement>, sectionId: string) => {
    if (!draggingSectionId || draggingSectionId === sectionId) return;
    event.preventDefault();
    setDragOverSectionId(sectionId);
  };

  const handleSectionDrop = (event: React.DragEvent<HTMLDivElement>, sectionId: string) => {
    if (!draggingSectionId) return;
    event.preventDefault();
    reorderSections(draggingSectionId, sectionId);
    setDraggingSectionId(null);
    setDragOverSectionId(null);
  };

  const handleSectionDragEnd = () => {
    setDraggingSectionId(null);
    setDragOverSectionId(null);
  };

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, ...updates } : section
    ));
  };

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter(section => section.id !== sectionId));
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

  const handleBlockDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    sectionId: string,
    blockId: string
  ) => {
    if (isPreview) return;
    setDraggingBlock({ sectionId, blockId });
    setDragOverBlock(null);
    event.dataTransfer.setData('text/plain', blockId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleBlockDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    sectionId: string,
    blockId: string
  ) => {
    if (!draggingBlock || draggingBlock.sectionId !== sectionId || draggingBlock.blockId === blockId) {
      return;
    }
    event.preventDefault();
    setDragOverBlock({ sectionId, blockId });
  };

  const handleBlockDrop = (
    event: React.DragEvent<HTMLDivElement>,
    sectionId: string,
    blockId: string
  ) => {
    if (!draggingBlock || draggingBlock.sectionId !== sectionId) return;
    event.preventDefault();
    reorderBlocks(sectionId, draggingBlock.blockId, blockId);
    setDraggingBlock(null);
    setDragOverBlock(null);
  };

  const handleBlockDragEnd = () => {
    setDraggingBlock(null);
    setDragOverBlock(null);
  };

  const handleSave = () => {
    onSave(sections);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              className={`p-2 rounded ${canUndo ? 'hover:bg-gray-100' : 'opacity-40 cursor-not-allowed'}`}
              title="Undo"
              onClick={handleUndo}
              disabled={!canUndo}
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              className={`p-2 rounded ${canRedo ? 'hover:bg-gray-100' : 'opacity-40 cursor-not-allowed'}`}
              title="Redo"
              onClick={handleRedo}
              disabled={!canRedo}
            >
              <Redo className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            {tabLabel && <span className="text-sm font-medium text-gray-500">Editing tab: {tabLabel}</span>}
            <button
              onClick={addSection}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Section</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8">
            {sections.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No sections yet. Add a section to get started.</p>
                <button
                  onClick={addSection}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add First Section
                </button>
              </div>
            ) : (
              sections.map((section, sectionIndex) => (
                <div
                  key={section.id}
                  className={`mb-8 bg-white rounded-lg shadow-sm border transition-colors ${
                    dragOverSectionId === section.id ? 'border-blue-400 shadow-md' : 'border-gray-200'
                  } ${draggingSectionId === section.id ? 'opacity-70' : ''}`}
                  draggable={!isPreview}
                  onDragStart={(event) => handleSectionDragStart(event, section.id)}
                  onDragOver={(event) => handleSectionDragOver(event, section.id)}
                  onDrop={(event) => handleSectionDrop(event, section.id)}
                  onDragEnd={handleSectionDragEnd}
                >
                  {/* Section Header */}
                  {!isPreview && (
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSectionCollapse(section.id)}
                            className="p-2 rounded-full hover:bg-white border border-gray-200"
                            aria-label={collapsedSections.has(section.id) ? 'Expand section' : 'Collapse section'}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${collapsedSections.has(section.id) ? '' : 'rotate-180'}`}
                            />
                          </button>
                          <div className="flex items-center gap-1">
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              dangerouslySetInnerHTML={{ __html: section.title || '' }}
                              onBlur={(e) => updateSection(section.id, { title: e.currentTarget.innerHTML })}
                              className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 min-w-[120px] max-w-[400px] outline-none"
                              data-placeholder="Section Title"
                              style={{ minHeight: '1.5em', color: section.text_color || undefined }}
                            />
                            <div className="flex items-center gap-0.5 ml-1 border border-gray-200 rounded-md bg-white px-1 py-0.5">
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold'); }}
                                className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                                title="Bold"
                              >
                                <Bold className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic'); }}
                                className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                                title="Italic"
                              >
                                <Italic className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline'); }}
                                className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                                title="Underline"
                              >
                                <Underline className="w-3.5 h-3.5" />
                              </button>
                              <div className="w-px h-4 bg-gray-200 mx-0.5" />
                              <div className="relative group/color">
                                <button
                                  type="button"
                                  className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                                  title="Title Color"
                                >
                                  <Palette className="w-3.5 h-3.5" />
                                </button>
                                <div className="absolute top-full left-0 mt-1 hidden group-hover/color:flex flex-wrap gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 w-[160px]">
                                  {[
                                    { label: 'Default', value: '' },
                                    { label: 'Gray', value: '#111827' },
                                    { label: 'Blue', value: '#1d4ed8' },
                                    { label: 'Green', value: '#15803d' },
                                    { label: 'Orange', value: '#d97706' },
                                    { label: 'Red', value: '#b91c1c' },
                                    { label: 'Purple', value: '#7c3aed' },
                                    { label: 'Teal', value: '#0d9488' },
                                    { label: 'Pink', value: '#db2777' },
                                    { label: 'Indigo', value: '#4338ca' }
                                  ].map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => updateSection(section.id, { text_color: opt.value || undefined })}
                                      className={`w-6 h-6 rounded-full border-2 flex-shrink-0 ${
                                        (section.text_color || '') === opt.value ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                                      }`}
                                      style={{ backgroundColor: opt.value || '#f3f4f6' }}
                                      title={opt.label}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${
                              section.is_sidebar ? 'border-amber-400 text-amber-600 bg-amber-50' : 'border-blue-300 text-blue-600 bg-blue-50'
                            }`}
                          >
                            {section.is_sidebar ? 'Sidebar' : 'Main content'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleSectionSidebar(section.id)}
                            className={`px-3 py-1 rounded text-sm border ${
                              section.is_sidebar
                                ? 'border-amber-500 text-amber-600 bg-amber-50'
                                : 'border-gray-200 text-gray-700'
                            }`}
                          >
                            {section.is_sidebar ? 'Use as main' : 'Use as sidebar'}
                          </button>
                          <button
                            onClick={() => setShowBlockPicker(showBlockPicker === section.id ? null : section.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            <Plus className="w-4 h-4 inline mr-1" />
                            Add Block
                          </button>
                          <button
                            onClick={() => deleteSection(section.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {section.subtitle !== undefined && !collapsedSections.has(section.id) && (
                        <input
                          type="text"
                          value={section.subtitle ?? ''}
                          onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                          className="mt-2 text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 w-full"
                          placeholder="Section Subtitle (optional)"
                        />
                      )}
                    </div>
                  )}

                  {/* Block Picker Dropdown */}
                  {showBlockPicker === section.id && !isPreview && !collapsedSections.has(section.id) && (
                    <div className="p-4 bg-blue-50 border-b border-blue-200">
                      <p className="text-sm font-semibold mb-3">Choose a block type:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {BLOCK_TYPES.map(blockType => {
                          const Icon = getBlockIcon(blockType.type);
                          return (
                            <button
                              key={blockType.type}
                              onClick={() => addBlock(section.id, blockType.type)}
                              className="p-3 bg-white border border-gray-200 rounded hover:border-blue-500 hover:bg-blue-50 text-left"
                            >
                              <Icon className="w-5 h-5 text-blue-600 mb-1" />
                              <div className="text-sm font-medium">{blockType.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section Blocks */}
                  {collapsedSections.has(section.id) ? (
                    <div className="p-6 text-sm text-gray-500 italic">Section collapsed. Expand to edit blocks.</div>
                  ) : (
                    <div className="p-6">
                      {section.blocks.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                          No blocks in this section. Click "Add Block" to add content.
                        </div>
                      ) : (
                        section.blocks.map((block, blockIndex) => {
                          const isSelected = selectedBlock === block.id;
                          const isTableBlock = block.block_type === 'table';
                          const isTableEditing = !isPreview && isTableBlock && openBlockEditor === block.id;
                          const isInlineEditable = INLINE_EDITABLE_BLOCKS.has(block.block_type);
                          const showSideEditor = !isTableBlock && !isInlineEditable && !isPreview && openBlockEditor === block.id;

                          return (
                            <div
                              key={block.id}
                              className={`relative group mb-4 rounded border transition-colors ${
                                isSelected ? 'ring-2 ring-blue-500' : 'border-transparent'
                              } ${
                                dragOverBlock &&
                                dragOverBlock.sectionId === section.id &&
                                dragOverBlock.blockId === block.id
                                  ? 'border-blue-300' : ''
                              } ${
                                draggingBlock &&
                                draggingBlock.sectionId === section.id &&
                                draggingBlock.blockId === block.id
                                  ? 'opacity-70' : ''
                              }`}
                              onClick={() => setSelectedBlock(block.id)}
                              draggable={!isPreview}
                              onDragStart={(event) => handleBlockDragStart(event, section.id, block.id)}
                              onDragOver={(event) => handleBlockDragOver(event, section.id, block.id)}
                              onDrop={(event) => handleBlockDrop(event, section.id, block.id)}
                              onDragEnd={handleBlockDragEnd}
                            >
                              {/* Block Controls */}
                              {!isPreview && (
                                <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1">
                                  <button
                                    onClick={() => moveBlock(section.id, block.id, 'up')}
                                    disabled={blockIndex === 0}
                                    className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteBlock(section.id, block.id)}
                                    className="p-1 bg-white border border-red-300 rounded hover:bg-red-50 text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  {!isTableBlock && !isInlineEditable && (
                                    <button
                                      onClick={() =>
                                        setOpenBlockEditor((prev) => (prev === block.id ? null : block.id))
                                      }
                                      className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      {showSideEditor ? 'Close' : 'Edit'}
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Block Content */}
                              {isTableBlock && !isPreview && (
                                <div className="flex justify-end gap-2 mb-3">
                                  <button
                                    type="button"
                                    onClick={() => setOpenBlockEditor((prev) => (prev === block.id ? null : prev))}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                                      !isTableEditing ? 'bg-white text-blue-600 border-blue-600' : 'text-gray-500 border-gray-200'
                                    }`}
                                  >
                                    Preview Table
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setOpenBlockEditor(block.id)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                                      isTableEditing ? 'bg-blue-600 text-white border-blue-600' : 'text-blue-600 border-blue-600'
                                    }`}
                                  >
                                    Edit Table
                                  </button>
                                </div>
                              )}

                              {isTableBlock && isTableEditing && (
                                <InlineTableEditor
                                  content={block.content}
                                  onChange={(updatedContent) =>
                                    updateBlock(section.id, block.id, { content: updatedContent })
                                  }
                                />
                              )}

                              {!isPreview && isInlineEditable ? (
                                <InlineTextBlockEditor
                                  block={block}
                                  onContentChange={(nextContent) =>
                                    updateBlock(section.id, block.id, { content: nextContent })
                                  }
                                />
                              ) : (
                                <BlockRenderer block={block} isEditing={!isPreview} />
                              )}

                              {showSideEditor && (
                                <div className="mt-4 border border-blue-200 bg-blue-50/40 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                                      <Settings className="w-4 h-4" />
                                      Configure {block.block_type} block
                                    </div>
                                    <button
                                      className="text-blue-600 text-sm font-medium"
                                      onClick={() => setOpenBlockEditor(null)}
                                    >
                                      Done
                                    </button>
                                  </div>
                                  <BlockContentEditor
                                    blockType={block.block_type}
                                    content={block.content}
                                    onChange={(updatedContent) =>
                                      updateBlock(section.id, block.id, { content: updatedContent })
                                    }
                                    mediaUploadConfig={mediaUploadConfig}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BlockContentEditor: React.FC<{
  blockType: string;
  content: any;
  onChange: (content: any) => void;
  mediaUploadConfig?: BlockEditorMediaUploadConfig;
}> = ({ blockType, content, onChange, mediaUploadConfig }) => {
  switch (blockType) {
    case 'heading':
      return (
        <>
          <RichTextField
            label="Text"
            value={content.text || ''}
            onChange={(value) => onChange({ ...content, text: value })}
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
    update({ headers: nextHeaders, rows: nextRows });
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

  const addRow = () => update({ rows: [...rows, headers.map(() => '')] });
  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    update({ rows: rows.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
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
              <input
                type="text"
                value={header}
                onChange={(e) => handleHeaderChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
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
                {headers.map((_, colIndex) => (
                  <textarea
                    key={colIndex}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    value={row[colIndex] || ''}
                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => update({ hasHeader: e.target.checked })}
          />
          Show header row
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={striped}
            onChange={(e) => update({ striped: e.target.checked })}
          />
          Striped rows
        </label>
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

const AccordionContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const items = Array.isArray(content.items) && content.items.length ? content.items : [{ title: 'Accordion Title', content: 'Accordion content' }];

  const updateItems = (next: any[]) => onChange({ ...content, items: next });

  const addItem = () => updateItems([...items, { title: `Item ${items.length + 1}`, content: '' }]);
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    updateItems(items.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, key: 'title' | 'content', value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [key]: value };
    updateItems(next);
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={addItem} className="text-blue-600 text-sm font-semibold">
        + Add Accordion Item
      </button>
      {items.map((item, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Item {index + 1}</p>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-red-600 text-sm"
              disabled={items.length === 1}
            >
              Remove
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={item.title || ''}
              onChange={(e) => handleChange(index, 'title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              rows={4}
              value={item.content || ''}
              onChange={(e) => handleChange(index, 'content', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const TabsContentEditor = ({ content, onChange }: { content: any; onChange: (content: any) => void }) => {
  const tabs = Array.isArray(content.tabs) && content.tabs.length ? content.tabs : [{ title: 'Tab 1', content: '' }];

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
      {tabs.map((tab, index) => (
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
    update({ headers: nextHeaders, rows: nextRows });
  };

  const addRow = () => {
    if (!headers.length) return;
    update({ rows: [...rows, headers.map(() => '')] });
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    update({ rows: rows.filter((_, i) => i !== index) });
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

  const ensureStructure = () => {
    if (!headers.length) {
      update({ headers: ['Column 1'], rows: [['']] });
    } else if (!rows.length) {
      update({ rows: [headers.map(() => '')] });
    }
  };

  React.useEffect(() => {
    ensureStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!headers.length || !rows.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={addColumn} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
          + Column
        </button>
        <button type="button" onClick={addRow} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
          + Row
        </button>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasHeader} onChange={(e) => update({ hasHeader: e.target.checked })} />
          Header Row
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={striped} onChange={(e) => update({ striped: e.target.checked })} />
          Striped Rows
        </label>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          {hasHeader && (
            <thead className="bg-gray-100">
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="border border-gray-200 p-2 align-top">
                    <div className="flex flex-col gap-2">
                      <input
                        value={header}
                        onChange={(e) => handleHeaderChange(index, e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeColumn(index)}
                        className="text-xs text-red-600 hover:underline"
                        disabled={headers.length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={striped && rowIndex % 2 === 1 ? 'bg-gray-50' : ''}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-gray-200 p-2">
                    <textarea
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      rows={2}
                    />
                  </td>
                ))}
                <td className="p-2 align-top">
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    className="text-xs text-red-600 hover:underline"
                    disabled={rows.length <= 1}
                  >
                    Remove Row
                  </button>
                </td>
              </tr>
            ))}
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
    accordion: { items: [{ title: 'Question 1', content: 'Answer 1' }] },
    alert: { text: 'This is an alert message', type: 'info' },
    examCards: { examIds: [], title: 'Related Exams', layout: 'grid', columns: 2 }
  };
  
  return defaults[blockType] || {};
};
