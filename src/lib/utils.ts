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
  return decodeHtmlText(removeStandaloneHeadingMarkers(value))
    .replace(/^<\s*\/?\s*h[1-6]\b[^>]*>?/gi, "")
    .replace(/<\s*\/?\s*h[1-6]\s*>$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
