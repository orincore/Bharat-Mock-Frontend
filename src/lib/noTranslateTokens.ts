/**
 * Tokens that must survive translation verbatim.
 *
 * Reasoning / coding-decoding / series questions are full of symbolic tokens that
 * are not words in any language. Google mangles them when it treats them as words:
 * it invents meanings ("AVUAG" → "बहुत बढ़िया"), transliterates them ("AVAUG" →
 * "एवाग"), swaps letters ("AVUUG" → "AWUUG"), or silently drops the spacing that
 * carries the puzzle ("P Q R S" → "PQRS"). Any of those makes the question
 * unanswerable, so these tokens are wrapped in `translate="no"` spans before being
 * sent and unwrapped from the response.
 *
 * Shared by the /api/translate route (which does the wrapping) and the attempt page
 * (which rejects cached rows where a token failed to survive) so the two can't drift.
 */

// Reasoning blanks and masked series: "_RQ_PR_S", "__", "QSPRQ_". Underscore is a
// word character, so \b never fires next to one — these need their own rule and
// cannot be picked up by the all-caps pattern below.
const UNDERSCORE_TOKEN = String.raw`[A-Za-z0-9]*_[A-Za-z0-9_]*`;

// Letter series: "P Q R S P R". Matched as one run so the spacing between letters
// (which IS the question) survives. Each element must be a standalone letter, so
// ordinary prose like "I am" cannot match. &nbsp; is common in pasted CMS content.
const LETTER_RUN = String.raw`\b[A-Za-z]\b(?:(?:\s|&nbsp;)+\b[A-Za-z]\b)+`;

// Mixed letter+digit codes: "uu993", "A1B2". Ordinals ("1st", "2nd") are excluded —
// those are real words that should translate.
const ALNUM_MIXED = String.raw`\b(?![0-9]+(?:st|nd|rd|th)\b)(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*[0-9])[A-Za-z0-9]+\b`;

// All-caps answer codes: "AVAUG", "OG-NAM". Gated by shouldProtectCaps below.
const CAPS_CODE = String.raw`\b[A-Z][A-Z0-9]+(?:[-/][A-Z0-9]+)*\b`;

// Order matters: the underscore and letter-run rules are listed first so they claim
// their (longer) match before a narrower rule can bite off part of it.
const ALWAYS = [UNDERSCORE_TOKEN, LETTER_RUN, ALNUM_MIXED];

const buildPattern = (includeCaps: boolean) =>
  new RegExp((includeCaps ? [...ALWAYS, CAPS_CODE] : ALWAYS).join('|'), 'g');

const BMTX_SPAN = /<span[^>]*\bdata-bmtx\b[^>]*>([\s\S]*?)<\/span>/g;

const stripMarkup = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

/**
 * Whether the all-caps rule should apply. A long all-caps sentence is just shouting
 * and should translate normally; a short one is an answer code.
 */
function shouldProtectCaps(text: string): boolean {
  const plain = stripMarkup(text);
  // Mixed-case text: all-caps tokens stand out as codes/acronyms — protect them.
  if (/[a-z]/.test(plain)) return true;
  return plain.trim().split(/\s+/).filter(Boolean).length <= 4;
}

/**
 * Wrap non-translatable tokens so Google leaves them alone. Requires the request to
 * use format:'html' — that is what makes translate="no" spans meaningful.
 *
 * All rules are applied in ONE pass. Applying them in sequence would let a later
 * rule match inside the markup an earlier rule had just inserted.
 */
export function protectText(text: string): string {
  const pattern = buildPattern(shouldProtectCaps(text));
  // Transform only the segments outside HTML tags so attributes stay untouched.
  return text
    .split(/(<[^>]*>)/)
    .map(part =>
      part.startsWith('<')
        ? part
        : part.replace(pattern, m => `<span translate="no" data-bmtx>${m}</span>`)
    )
    .join('');
}

/** Strip only the spans we added — author-supplied translate="no" spans stay. */
export function unprotectText(text: string): string {
  return text.replace(BMTX_SPAN, '$1');
}

/**
 * True when the visible text is made up ENTIRELY of protected tokens (plus
 * whitespace and punctuation) — i.e. a correct translation must equal the original.
 *
 * Used to detect poisoned cache rows: if such a string came back changed, some
 * earlier build translated it, and that row must be re-translated rather than shown.
 */
export function isVerbatimOnly(text: string): boolean {
  const plain = stripMarkup(text).trim();
  if (!plain) return false;
  const pattern = buildPattern(shouldProtectCaps(text));
  const remainder = plain.replace(pattern, ' ').replace(/[\s\-/,.()]+/g, '');
  return remainder.length === 0;
}
