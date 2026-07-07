// Shared helpers for keeping table-block cells clean and uniform.
//
// Root cause this guards against: a table pasted from an external source (Word,
// Google Docs, another website) brings cell content wrapped in block elements
// (<p>, <div>) and tagged with inline font-size / line-height / font-family.
// Stored verbatim and rendered with dangerouslySetInnerHTML this produces:
//   • a header that consumes ~2 lines for a single line (the <p> margin adds a
//     phantom blank line), and
//   • inconsistent font sizes between cells (inline font-size overrides).
//
// We fix it at two levels:
//   1. sanitizeTableCellHtml() — strips the layout-breaking markup on paste/save
//      while keeping bold / italic / underline / colour / links that the table
//      toolbar legitimately produces, and preserves intentional line breaks.
//   2. TABLE_CELL_RESET — defensive Tailwind classes applied wherever a cell is
//      rendered, so tables already saved with dirty HTML still display uniformly
//      without needing to be re-pasted.

// Inline style properties that break cell layout/typography. Kept-out list rather
// than an allow-list so colour (color) and other harmless styles survive.
const LAYOUT_STYLE_PROPS = [
  'font-size',
  'line-height',
  'font-family',
  'margin',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'padding',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'text-indent',
  'min-height',
  'height',
  'width',
];

// Strip the markup that wrecks table cells (block wrappers, inline font sizing,
// embedded media) while keeping inline formatting (b/i/u/strike/color) and links.
// Block elements (<p>, <div>, <li>) are unwrapped and separated with <br> so
// genuine multi-line cells (e.g. "Tier 1" / "Tier 2") keep their line breaks.
//
// opts.stripAlign — when true (used on paste) any text-align coming from the
// source is dropped so the cell falls back to the centered default. When false
// (used on blur while editing) an explicit text-align is preserved as a clean
// alignment-only block, so the left/center/right toolbar buttons persist.
export const sanitizeTableCellHtml = (
  html: string,
  opts: { stripAlign?: boolean } = {},
): string => {
  const { stripAlign = false } = opts;
  if (!html) return '';
  if (typeof document === 'undefined') return html;

  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // Drop non-content / layout-wrecking nodes entirely.
  tmp
    .querySelectorAll('meta, link, style, script, xml, img, svg, iframe, canvas, video, audio, table, thead, tbody, tr, th, td')
    .forEach((node) => node.remove());

  // Handle block-level elements: keep ones carrying an explicit alignment (so the
  // align toolbar sticks), otherwise unwrap to inline content separated by <br>.
  tmp.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, blockquote').forEach((block) => {
    const el = block as HTMLElement;
    const rawAlign = stripAlign ? '' : (el.style.textAlign || el.getAttribute('align') || '').trim();
    // Normalize the logical values execCommand can produce ('start'/'end') to their
    // physical equivalent. The cell's own default alignment is CENTER (not left), so
    // an explicit "left" is a real override that must be preserved too — treating it
    // as a no-op (as this used to) silently discarded the "Align left" toolbar button.
    const align = rawAlign === 'start' ? 'left' : rawAlign === 'end' ? 'right' : rawAlign;
    if (align) {
      // Reduce to a clean alignment-only <div>; margins are zeroed by TABLE_CELL_RESET.
      el.removeAttribute('class');
      el.removeAttribute('id');
      el.removeAttribute('align');
      el.setAttribute('style', `text-align:${align}`);
      return;
    }
    if (block.nextSibling) block.parentNode?.insertBefore(document.createElement('br'), block.nextSibling);
    while (block.firstChild) block.parentNode?.insertBefore(block.firstChild, block);
    block.remove();
  });

  // Remove layout-breaking inline styles and stray attributes from what's left.
  const styleProps = stripAlign ? [...LAYOUT_STYLE_PROPS, 'text-align'] : LAYOUT_STYLE_PROPS;
  tmp.querySelectorAll('*').forEach((element) => {
    const el = element as HTMLElement;
    if (el.tagName === 'DIV' && el.style.textAlign) return; // preserve alignment wrappers
    const style = el.style;
    if (style) {
      styleProps.forEach((prop) => style.removeProperty(prop));
      if (!style.cssText.trim()) el.removeAttribute('style');
    }
    ['class', 'id', 'dir', 'align', 'data-start', 'data-end', 'data-offset-key'].forEach((attr) => {
      if (el.hasAttribute(attr)) el.removeAttribute(attr);
    });
  });

  // Collapse runs of <br> and trim leading/trailing ones left by unwrapping.
  const out = tmp.innerHTML
    .replace(/(\s*<br\s*\/?>\s*){2,}/gi, '<br>')
    .replace(/^(\s*<br\s*\/?>)+/i, '')
    .replace(/(<br\s*\/?>\s*)+$/i, '')
    .replace(/ /g, ' ');

  return out.trim();
};

// Defensive reset applied to every contentEditable cell and every rendered cell.
// Forces all descendants to inherit the cell's font-size / line-height / font and
// drops block margins, so any dirty HTML already saved in a table still renders as
// a single uniform line instead of a double-height, mixed-size cell.
export const TABLE_CELL_RESET =
  '[&_*]:![font-size:inherit] [&_*]:!leading-[inherit] [&_*]:!font-[inherit] ' +
  '[&_p]:!m-0 [&_div]:!m-0 [&_ul]:!my-0 [&_ol]:!my-0 [&_li]:!m-0 [&_h1]:!m-0 [&_h2]:!m-0 [&_h3]:!m-0';
