import { apiClient } from './client';

export interface ExamPDFData {
  exam: {
    id: string;
    title: string;
    description?: string;
    duration?: number;
    total_questions?: number;
    total_marks?: number;
    exam_categories?: { name: string; slug: string };
    exam_subcategories?: { name: string; slug: string };
    exam_difficulties?: { name: string };
  };
  sections: Array<{
    id: string;
    name: string;
    description?: string;
    display_order: number;
  }>;
  questions: Array<{
    id: string;
    section_id: string;
    passage_id?: string | null;
    passage?: { id: string; title?: string | null; content: string; content_hi?: string | null } | null;
    question_text: string;
    question_type: string;
    marks: number;
    negative_marks?: number;
    correct_answer?: string;
    explanation?: string;
    image_url?: string;
    display_order: number;
    options: Array<{
      id: string;
      option_text: string;
      is_correct: boolean;
      display_order: number;
      image_url?: string;
    }>;
  }>;
}

export const examPdfService = {
  async getExamForPDF(examId: string): Promise<ExamPDFData> {
    const response = await apiClient.get<{ success: boolean; data: ExamPDFData }>(
      `/exams/${examId}/download-pdf`
    );
    return response.data;
  }
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

function authHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Pull "name.pdf" out of a Content-Disposition header, if present.
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return m ? decodeURIComponent(m[1]) : null;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadPdfResponse(res: Response, fallbackName: string) {
  if (!res.ok) {
    // Backend returns JSON { message } on failure — surface it.
    let msg = `PDF request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
    } catch { /* non-JSON body */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  if (blob.type && !blob.type.includes('pdf')) {
    throw new Error('Server did not return a PDF');
  }
  const name = filenameFromDisposition(res.headers.get('Content-Disposition')) || fallbackName;
  triggerBlobDownload(blob, name);
}

export interface PublicPdfOptions {
  language?: 'en' | 'hi';
  showAnswers?: boolean;
  showExplanations?: boolean;
  showWatermark?: boolean;
  showCoverPage?: boolean;
}

/**
 * Public download: server-rendered question-paper PDF for a published exam.
 * Streams the file straight from the backend (no client-side rasterisation).
 */
export async function downloadExamPdfFile(
  examId: string,
  opts: PublicPdfOptions = {},
  fallbackName = 'exam.pdf'
): Promise<void> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts)) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/exams/${examId}/pdf-file${qs ? `?${qs}` : ''}`, {
    headers: authHeader(),
  });
  await downloadPdfResponse(res, fallbackName);
}

export interface AdminPdfOptions {
  showAnswers?: boolean;
  showExplanations?: boolean;
  language?: 'en' | 'hi';
  showWatermark?: boolean;
  showCoverPage?: boolean;
  headerText?: string;
  footerText?: string;
  coverBanner?: string | null;
  footerBanner?: string | null;
  backCoverBanner?: string | null;
}

/**
 * Admin download: server-rendered PDF for ANY exam with full option control
 * (banners, header/footer, watermark). Banners are sent as data URLs in the body.
 */
export async function generateExamPdfAdmin(
  examId: string,
  options: AdminPdfOptions,
  fallbackName = 'exam.pdf'
): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/exams/${examId}/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(options),
  });
  await downloadPdfResponse(res, fallbackName);
}
