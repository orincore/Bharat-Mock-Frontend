// Shared helpers to decide whether a page-content block / section actually has
// something to render. The public page wraps every section in a styled card and
// every block in a spacing div, so an empty section (no blocks, or only blank
// blocks) shows up as an empty white card. These predicates let the renderers
// skip them so nothing blank is shown.

interface BlockLike {
  block_type?: string;
  content?: any;
  blocks?: any[];
}

interface SectionLike {
  blocks?: BlockLike[];
}

// Tags that count as content even when there's no text (media / structural).
const MEDIA_RE = /<(img|iframe|table|svg|video|audio|math|source|embed|object)\b/i;

const stripToText = (html: string): string =>
  html
    .replace(/<br\s*\/?>(?=\s*)/gi, '')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/[ ​﻿]/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// True when an HTML string has no visible text and no embedded media.
const htmlIsBlank = (html?: unknown): boolean => {
  if (typeof html !== 'string') return !html;
  if (MEDIA_RE.test(html)) return false;
  return stripToText(html).length === 0;
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Returns true when a block has no renderable content and should be skipped.
 * Structural / intentional blocks (divider, spacer, dynamic card lists, etc.)
 * are never considered empty.
 */
export function isBlockEmpty(block: BlockLike | null | undefined): boolean {
  if (!block) return true;
  const c = block.content || {};

  switch (block.block_type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
    case 'html':
    case 'rich_text':
      return htmlIsBlank(c.text ?? c.html ?? c.content);

    case 'code':
      return str(c.code ?? c.text).trim().length === 0;

    case 'list':
      return !(Array.isArray(c.items) && c.items.some((item: unknown) => !htmlIsBlank(item)));

    case 'table':
      return !(Array.isArray(c.headers) && c.headers.length) &&
        !(Array.isArray(c.rows) && c.rows.length);

    case 'image':
    case 'video':
      return str(c.url ?? c.src).trim().length === 0;

    case 'embed':
      return str(c.html ?? c.url ?? c.code).trim().length === 0;

    case 'button':
      return htmlIsBlank(c.text ?? c.label) && str(c.url ?? c.href).trim().length === 0;

    // Divider/spacer are intentional visual elements; dynamic and structural
    // blocks (cards, alerts, accordion, tabs, columns, examCards, autoExamCards,
    // tableOfContents, …) render their own content/empty states — never hide them.
    default:
      return false;
  }
}

/** True when a section has at least one renderable (non-empty) block. */
export function sectionHasContent(section: SectionLike | null | undefined): boolean {
  if (!section) return false;
  const blocks = Array.isArray(section.blocks) ? section.blocks : [];
  return blocks.some((block) => !isBlockEmpty(block));
}
