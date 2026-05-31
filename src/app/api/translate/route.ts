import { NextRequest, NextResponse } from 'next/server';

// Run on the Node runtime and give the function generous headroom — the first
// (cold-start) call to Google can take a few seconds; a tight limit is what
// produced the intermittent 502s on production.
export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const BATCH_SIZE = 100; // Google allows max 128 strings per request

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
    // Split into batches of BATCH_SIZE to stay within Google API limits
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      batches.push(texts.slice(i, i + BATCH_SIZE));
    }

    const results = await Promise.all(batches.map(batch => translateBatch(batch, target, apiKey)));
    const translations = results.flat();

    return NextResponse.json({ translations });
  } catch (e: any) {
    console.error('[translate] Failed:', e?.message);
    return NextResponse.json({ error: e?.message || 'Translation failed' }, { status: 502 });
  }
}
