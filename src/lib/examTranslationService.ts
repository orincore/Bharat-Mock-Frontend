const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export interface TranslatedQuestion {
  id: string;
  text_translated: string;
  options: { id: string; text_translated: string }[];
}

export interface TranslatedSection {
  id: string;
  name_translated: string;
}

export interface TranslatedPassage {
  id: string;
  title_translated?: string | null;
  content_translated: string;
}

export interface ExamTranslations {
  questions: TranslatedQuestion[];
  sections: TranslatedSection[];
  /** Comprehension passages. Absent on rows saved before passage caching existed. */
  passages?: TranslatedPassage[];
}

/**
 * Fetch pre-saved translations from the backend (DB → Redis).
 * Returns null if not found (caller should fall back to Google API).
 */
export async function fetchExamTranslations(
  examId: string,
  lang: string
): Promise<ExamTranslations | null> {
  try {
    const res = await fetch(`${API_BASE}/exam-translations/${examId}?lang=${lang}`, {
      cache: 'no-store',
    });
    // 404 = no translations saved yet — expected on first use, not an error
    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn(`[translate] DB fetch returned ${res.status} — falling back to Google API`);
      return null;
    }
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Save freshly Google-translated content to the backend so future users
 * get it from DB/Redis instead of hitting the Translation API again.
 */
export async function saveExamTranslations(
  examId: string,
  lang: string,
  data: ExamTranslations
): Promise<void> {
  try {
    await fetch(`${API_BASE}/exam-translations/${examId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, ...data }),
    });
  } catch {
    // Fire-and-forget — saving to DB is best-effort
  }
}
