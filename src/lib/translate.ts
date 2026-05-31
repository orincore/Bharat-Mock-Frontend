'use client';

const CACHE_PREFIX = 'bm_tx_';
const CACHE_VERSION = 'v1';

function cacheKey(text: string, target: string) {
  // Simple hash: length + first 20 + last 10 chars
  const sig = `${text.length}_${text.slice(0, 20)}_${text.slice(-10)}`;
  return `${CACHE_PREFIX}${CACHE_VERSION}_${target}_${sig}`;
}

function readCache(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeCache(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage full — silently ignore
  }
}

/**
 * Translate an array of HTML/plain strings to `target` language.
 * Results are cached in localStorage so the same text is never
 * sent to the API twice on the same device.
 */
export async function translateTexts(
  texts: string[],
  target: string
): Promise<string[]> {
  if (target === 'en') return texts;

  const results: string[] = new Array(texts.length);
  const uncachedIndexes: number[] = [];
  const uncachedTexts: string[] = [];

  // Check cache first
  texts.forEach((text, i) => {
    const key = cacheKey(text, target);
    const cached = readCache(key);
    if (cached !== null) {
      results[i] = cached;
    } else {
      uncachedIndexes.push(i);
      uncachedTexts.push(text);
    }
  });

  if (uncachedTexts.length === 0) return results;

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: uncachedTexts, target }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(`/api/translate ${res.status}: ${errBody.error || res.statusText}`);
    }

    const data = await res.json();
    const translations: string[] = data.translations;

    translations.forEach((translated, idx) => {
      const originalIndex = uncachedIndexes[idx];
      results[originalIndex] = translated;
      writeCache(cacheKey(texts[originalIndex], target), translated);
    });
  } catch {
    // On failure, fall back to originals
    uncachedIndexes.forEach((i) => { results[i] = texts[i]; });
  }

  return results;
}

/** Translate a single string. Convenience wrapper. */
export async function translateText(text: string, target: string): Promise<string> {
  if (!text || target === 'en') return text;
  const [result] = await translateTexts([text], target);
  return result;
}
