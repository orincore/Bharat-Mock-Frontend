import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_TRANSLATION_API_KEY;
const BATCH_SIZE = 100; // Google allows max 128 strings per request

async function translateBatch(batch: string[], target: string): Promise<string[]> {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: batch, target, format: 'html' }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[translate] Google API error:', JSON.stringify(err));
    throw new Error(`Google API ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.data.translations.map((t: any) => t.translatedText);
}

export async function POST(req: NextRequest) {
  if (!GOOGLE_API_KEY) {
    console.error('[translate] NEXT_PUBLIC_GOOGLE_CLOUD_TRANSLATION_API_KEY is not set');
    return NextResponse.json({ error: 'Translation not configured — add NEXT_PUBLIC_GOOGLE_CLOUD_TRANSLATION_API_KEY to .env.local' }, { status: 503 });
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

    const results = await Promise.all(batches.map(batch => translateBatch(batch, target)));
    const translations = results.flat();

    return NextResponse.json({ translations });
  } catch (e: any) {
    console.error('[translate] Failed:', e?.message);
    return NextResponse.json({ error: e?.message || 'Translation failed' }, { status: 502 });
  }
}
