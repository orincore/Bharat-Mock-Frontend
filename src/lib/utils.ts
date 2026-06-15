import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripLineBreakTags(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/&lt;\s*br\s*\/?\s*&gt;/gi, " ")
    .replace(/<\s*br\s*\/?\s*>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function removeStandaloneHeadingMarkers(value?: string | null): string {
  if (!value) return "";

  return value
    .replace(/<p>\s*(?:&lt;)?\/?\s*h[1-6]\s*(?:&gt;)?\s*<\/p>/gi, "")
    .replace(/<div>\s*(?:&lt;)?\/?\s*h[1-6]\s*(?:&gt;)?\s*<\/div>/gi, "")
    .replace(/(^|>|\n)\s*(?:&lt;)?\/?\s*h[1-6]\s*(?:&gt;)?\s*(?=<|$|\n)/gi, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function decodeHtmlEntitiesOnce(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function fullyDecodeHtmlEntities(value: string): string {
  let decoded = value;

  for (let i = 0; i < 4; i += 1) {
    const next = decodeHtmlEntitiesOnce(decoded);
    if (next === decoded) {
      break;
    }
    decoded = next;
  }

  return decoded;
}

function stripHtmlToText(value: string): string {
  if (!value) return "";

  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    return (doc.body.textContent || "").trim();
  }

  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .trim();
}

export function decodeHtmlText(value?: string | null): string {
  const normalized = fullyDecodeHtmlEntities(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|section|article|ul|ol)>/gi, " ")
    .replace(/<\s*h[1-6]\b[^>]*>/gi, " ")
    .replace(/<\s*\/\s*h[1-6]\s*>/gi, " ")
    .replace(/<\s*h[1-6]\b[^>]*$/gi, " ");

  return stripHtmlToText(normalized)
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCleanContentLabel(value?: string | null): string {
  if (!value) return "";

  // First fully decode HTML entities
  let cleaned = fullyDecodeHtmlEntities(value);

  // Strip inline style attributes FIRST. Editor content can carry huge Tailwind
  // CSS-variable blobs (e.g. <strong style="--tw-scale-x: 1; …">) and the tag
  // is sometimes malformed/unclosed, so removing the style attribute up front
  // guarantees the blob is gone even when the tag itself can't be matched.
  cleaned = cleaned
    .replace(/\sstyle\s*=\s*"[^"]*"?/gi, " ")
    .replace(/\sstyle\s*=\s*'[^']*'?/gi, " ");

  // Remove style/script blocks, then any complete or partial (unclosed) HTML tags
  cleaned = cleaned
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")   // complete tags
    .replace(/<[^>]*$/g, " ");  // trailing unclosed tag start

  // Strip any residual CSS leftovers from malformed markup so they never show as text
  cleaned = cleaned
    .replace(/--[\w-]+\s*:\s*[^;]*;?/gi, " ") // CSS custom-property declarations
    .replace(/--[\w-]+/gi, " ")               // stray custom-property names
    .replace(/#[0-9a-fA-F]{3,8}\b/g, " ")      // stray hex colors
    .replace(/\b\d+px\b/gi, " ");              // stray px values

  // Clean up whitespace
  return cleaned
    .replace(/\s+/g, " ")
    .trim();
}

// High-signal tokens that only appear when raw HTML/CSS was slugified into a
// section_key (e.g. a pasted "<div class='row' style='...'>" title becomes
// "div-class-row-style-...-jsx-3766058341-fw-bold"). De-slugifying such a key produced
// the markup gibberish that leaked into the Table of Contents. A genuine section_key
// never contains these.
// Only CSS/markup-specific tokens — NOT plain English words like "important", "style"
// or "class", which legitimately appear in headings ("Important Dates", "Class 10").
// The real garbage key is also 500+ chars, so the length guard in humanizeSectionKey
// catches it independently.
const SECTION_KEY_GARBAGE_RE = /(--tw-|font[\s-]?family|line[\s-]?height|display[\s-]+flex|flex[\s-]?wrap|bs[\s-]?gutter|gutter[\s-]?y|\bjsx[\s-]?\d|\brgb\b|#[a-f0-9]{6}|\b\d+px\b|\b\d+rem\b)/i;

// Humanize a section_key for use as a TOC label fallback — but only when the key is a
// real slug. Keys auto-generated from a pasted-HTML title are giant slugified blobs;
// de-slugifying those is what put raw markup text into the TOC. Reject anything that
// looks like markup or is absurdly long for a heading.
export function humanizeSectionKey(sectionKey?: string | null): string {
  const humanized = (sectionKey || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!humanized || humanized.length > 80 || SECTION_KEY_GARBAGE_RE.test(humanized)) return "";
  return humanized;
}
