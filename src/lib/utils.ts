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
