'use client';

import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

// katex is ~280 KB — load it dynamically so it never blocks the initial bundle.
// It's only needed on exam attempt / review pages.
type KatexType = { renderToString: (tex: string, opts?: object) => string };
let _katex: KatexType | null = null;
async function getKatex(): Promise<KatexType> {
  if (!_katex) {
    const katexModule = await import('katex');
    // Inject the katex CSS once, lazily — ignore if it fails (SSR/test env)
    import('katex/dist/katex.min.css' as string).catch(() => null);
    _katex = (katexModule.default ?? katexModule) as unknown as KatexType;
  }
  return _katex;
}

const MATHML_TAGS = [
  'math', 'mrow', 'mi', 'mn', 'mo', 'mfrac', 'msup', 'msub', 'msubsup',
  'msqrt', 'mroot', 'mtext', 'mspace', 'mtable', 'mtr', 'mtd', 'mover',
  'munder', 'munderover', 'menclose', 'mstyle', 'merror', 'mpadded',
  'mphantom', 'mmultiscripts', 'none', 'mprescripts', 'semantics', 'annotation',
];

const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['font', 'code', 'sup', 'sub', ...MATHML_TAGS],
  ADD_ATTR: [
    'style', 'class', 'size', 'target', 'rel', 'data-inline-break',
    'xmlns', 'display', 'mathvariant', 'mathsize', 'stretchy', 'fence',
    'separator', 'lspace', 'rspace', 'linethickness', 'numalign', 'denomalign',
    'bevelled', 'columnalign', 'rowalign', 'columnspacing', 'rowspacing',
    'displaystyle', 'scriptlevel', 'notation', 'encoding',
  ],
  FORBID_ATTR: ['color', 'face'],
};

/**
 * Strip color/font-size from HTML DOM nodes (skip MathML).
 */
function stripStyling(container: HTMLElement) {
  container.querySelectorAll('*').forEach((el) => {
    if (el.namespaceURI === 'http://www.w3.org/1998/Math/MathML') return;
    const s = (el as HTMLElement).style;
    if (s) {
      s.removeProperty('color');
      s.removeProperty('background-color');
      s.removeProperty('font-size');
      s.removeProperty('font-family');
      if (!s.cssText.trim()) (el as HTMLElement).removeAttribute('style');
    }
    el.removeAttribute('color');
    el.removeAttribute('face');
  });
}

/**
 * Process HTML: sanitize, strip colors, then render any $...$ LaTeX inline.
 * katex is loaded lazily — returns a Promise<string>.
 */
async function processHtml(html: string): Promise<string> {
  if (typeof window === 'undefined') return html;

  // 1. Sanitize
  const clean = DOMPurify.sanitize(html, SANITIZE_CONFIG);

  // 2. Parse into DOM and strip styling
  const tmp = document.createElement('div');
  tmp.innerHTML = clean;
  stripStyling(tmp);

  // 3. Check if there's any LaTeX before loading katex
  const hasLatex = tmp.textContent?.includes('$') ?? false;
  if (!hasLatex) return tmp.innerHTML;

  // 4. Load katex lazily, then walk text nodes
  const katex = await getKatex();

  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if ((node as Text).textContent?.includes('$')) {
      textNodes.push(node as Text);
    }
  }

  textNodes.forEach((textNode) => {
    const text = textNode.textContent || '';
    if (!/\$/.test(text)) return;
    const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
    if (!regex.test(text)) return;
    regex.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const raw = m[0];
      const isDisplay = raw.startsWith('$$');
      const latex = isDisplay ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();
      try {
        const span = document.createElement(isDisplay ? 'div' : 'span');
        span.innerHTML = katex.renderToString(latex, {
          displayMode: isDisplay,
          throwOnError: false,
          output: 'html',
        });
        if (isDisplay) span.style.textAlign = 'center';
        frag.appendChild(span);
      } catch {
        frag.appendChild(document.createTextNode(raw));
      }
      last = m.index + raw.length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    textNode.parentNode?.replaceChild(frag, textNode);
  });

  return tmp.innerHTML;
}

interface MathRendererProps {
  html: string;
  className?: string;
}

/**
 * Drop-in replacement for dangerouslySetInnerHTML that also renders:
 * - MathML (<math> tags)
 * - LaTeX ($...$ and $$...$$)
 * - Regular HTML with sup/sub/fractions
 * All in black color, no source styling.
 * katex is loaded lazily — zero cost on pages that don't use it.
 */
export function MathRenderer({ html, className = '' }: MathRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;
    processHtml(html).then((processed) => {
      if (ref.current) ref.current.innerHTML = processed;
    });
  }, [html]);

  return <div ref={ref} className={className} />;
}

/**
 * Exported helper — same processing, returns cleaned HTML string (async).
 */
export async function sanitizeAndRenderMath(html?: string): Promise<string> {
  if (!html) return '';
  if (typeof window === 'undefined') return html;
  return processHtml(html);
}
