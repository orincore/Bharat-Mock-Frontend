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
