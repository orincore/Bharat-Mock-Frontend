'use client';

const CACHE_PREFIX = 'bm_tx_';
// v3: protection widened beyond all-caps letter codes to masked blanks
// ("_RQ_PR_S"), letter series ("P Q R S P R") and alphanumeric codes ("uu993").
// v1/v2 entries may hold text mangled under the narrower rules.
const CACHE_VERSION = 'v3';

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POST to /api/translate with retries. Serverless cold starts can return a
 * transient 502/503/504 (or a network blip) on the first hit — retrying with a
 * short backoff lets that first call recover instead of silently failing, which
 * is what previously forced users to refresh the page.
 *
 * Throws if it ultimately fails so the caller can avoid caching untranslated text.
 */
async function postTranslate(texts: string[], target: string): Promise<string[]> {
  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, target }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.translations as string[];
      }

      const errBody = await res.json().catch(() => ({}));
      const err = new Error(`/api/translate ${res.status}: ${errBody.error || res.statusText}`);

      // Retry transient server errors (cold start / overload); fail fast on 4xx.
      if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
        console.warn(`[translate] attempt ${attempt} got ${res.status} — retrying…`);
        lastErr = err;
        await sleep(700 * attempt);
        continue;
      }
      throw err;
    } catch (e) {
      lastErr = e;
      // Network error — retry; otherwise (4xx thrown above) rethrow.
      const isHttpErr = e instanceof Error && /\/api\/translate \d{3}:/.test(e.message);
      if (!isHttpErr && attempt < MAX_ATTEMPTS) {
        console.warn(`[translate] attempt ${attempt} network error — retrying…`, e);
        await sleep(700 * attempt);
        continue;
      }
      if (attempt >= MAX_ATTEMPTS) break;
      throw e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Translation failed');
}

/**
 * Translate an array of HTML/plain strings to `target` language.
 * Successful results are cached in localStorage so the same text is never
 * sent to the API twice on the same device.
 *
 * Throws on failure (after retries) — the caller is responsible for falling back
 * to the original text for display. We deliberately do NOT swallow the error or
 * cache originals, so a transient failure doesn't get "stuck" as untranslated.
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

  const translations = await postTranslate(uncachedTexts, target);

  translations.forEach((translated, idx) => {
    const originalIndex = uncachedIndexes[idx];
    const original = texts[originalIndex];
    results[originalIndex] = translated;
    // The route passes an item through unchanged when it is too large for a single
    // Google request. Caching that would permanently pin the English original as
    // this text's "translation", so only cache results that actually changed.
    if (translated !== original) {
      writeCache(cacheKey(original, target), translated);
    }
  });

  return results;
}

/** Translate a single string. Convenience wrapper. */
export async function translateText(text: string, target: string): Promise<string> {
  if (!text || target === 'en') return text;
  const [result] = await translateTexts([text], target);
  return result;
}
