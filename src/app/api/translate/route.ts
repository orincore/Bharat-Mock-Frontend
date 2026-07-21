import { NextRequest, NextResponse } from 'next/server';

// Non-translatable token handling (reasoning codes, letter series, masked blanks)
// lives in one module shared with the attempt page's cache-validity check, so the
// two definitions of "must survive verbatim" cannot drift apart.
import { protectText, unprotectText } from '@/lib/noTranslateTokens';

// Run on the Node runtime and give the function generous headroom — the first
// (cold-start) call to Google can take a few seconds; a tight limit is what
// produced the intermittent 502s on production.
export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const BATCH_SIZE = 100; // Google allows max 128 strings per request

// Google also caps the REQUEST BODY at 204,800 bytes — a limit the old
// count-only batching ignored, so 100 long questions (or a single comprehension
// passage batched with others) blew past it and the whole call failed with
// "Request payload size exceeds the limit". Batch by serialized byte size too,
// with headroom for the JSON envelope and the translate="no" spans we inject.
const MAX_BATCH_BYTES = 150_000;

// A single string larger than the cap can never be sent. Rather than failing the
// whole request, we pass it through untranslated (caller renders the original).
const MAX_SINGLE_BYTES = MAX_BATCH_BYTES;

// Google rate-limits aggressive parallelism; a handful of batches at a time is
// plenty and avoids 403/429 on exams with many long questions.
const MAX_CONCURRENT_BATCHES = 4;

/** Byte cost of one item once JSON-encoded into the `q` array (quotes + escapes + comma). */
const itemBytes = (s: string) => Buffer.byteLength(JSON.stringify(s), 'utf8') + 1;

// Read the key at REQUEST time from a SERVER-ONLY var. We deliberately do NOT
// reference any NEXT_PUBLIC_* name: Next.js inlines NEXT_PUBLIC_* values into the
// client bundle wherever they're referenced, which would leak the key to browsers.
// Keeping the only reference here (server route) guarantees it stays secret.
function getApiKey(): string | undefined {
  return process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY;
}

async function translateBatch(batch: string[], target: string, apiKey: string): Promise<string[]> {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: batch, target, format: 'html' }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[translate] Google API error:', res.status, JSON.stringify(err));
    throw new Error(`Google API ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.data.translations.map((t: any) => t.translatedText);
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('[translate] No API key set — define GOOGLE_CLOUD_TRANSLATION_API_KEY (server-only)');
    return NextResponse.json(
      { error: 'Translation not configured — set GOOGLE_CLOUD_TRANSLATION_API_KEY on the server' },
      { status: 503 }
    );
  }

  let texts: string[], target: string;
  try {
    const body = await req.json();
    texts = body.texts;
    target = body.target;
    if (!Array.isArray(texts) || !target) throw new Error('bad input');
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const protectedTexts = texts.map(t => (typeof t === 'string' ? protectText(t) : t));

    // Results start as the originals, so anything we can't send (oversized single
    // item) degrades to untranslated text instead of failing the whole request.
    const translations = [...texts];

    // Batch by BOTH item count and serialized byte size. Indices are carried
    // alongside so results land back on the right slots after oversized items
    // (comprehension passages, image-heavy HTML) are skipped.
    const batches: { index: number; text: string }[][] = [];
    let current: { index: number; text: string }[] = [];
    let currentBytes = 0;

    protectedTexts.forEach((text, index) => {
      if (typeof text !== 'string') return;
      const bytes = itemBytes(text);

      if (bytes > MAX_SINGLE_BYTES) {
        console.warn(`[translate] item ${index} is ${bytes}B — exceeds the per-request cap, passing through untranslated`);
        return;
      }

      if (current.length >= BATCH_SIZE || currentBytes + bytes > MAX_BATCH_BYTES) {
        if (current.length) batches.push(current);
        current = [];
        currentBytes = 0;
      }

      current.push({ index, text });
      currentBytes += bytes;
    });
    if (current.length) batches.push(current);

    // Bounded concurrency — see MAX_CONCURRENT_BATCHES.
    for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
      const wave = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
      const waveResults = await Promise.all(
        wave.map(batch => translateBatch(batch.map(b => b.text), target, apiKey))
      );
      wave.forEach((batch, w) => {
        batch.forEach((item, b) => {
          translations[item.index] = unprotectText(waveResults[w][b]);
        });
      });
    }

    return NextResponse.json({ translations });
  } catch (e: any) {
    console.error('[translate] Failed:', e?.message);
    return NextResponse.json({ error: e?.message || 'Translation failed' }, { status: 502 });
  }
}
