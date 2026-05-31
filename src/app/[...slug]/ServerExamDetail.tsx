import { ExamDetailPage } from '@/components/pages/ExamDetailPage';

interface ServerExamDetailProps {
  urlPath: string;
  examData: any;
}

function formatExamSummaryText(exam: any): string {
  const parts: string[] = [];
  if (exam?.category) parts.push(exam.category);
  if (exam?.total_questions) parts.push(`${exam.total_questions} Questions`);
  if (exam?.total_marks) parts.push(`${exam.total_marks} Marks`);
  if (exam?.duration) parts.push(`${exam.duration} Minutes`);
  if (exam?.difficulty) parts.push(`Difficulty: ${exam.difficulty}`);
  return parts.join(' • ');
}

// SSR shell — renders all key exam info as static HTML so Google can index it.
// ExamDetailPage (interactive CTA, start/resume, language picker) hydrates on client.
export default function ServerExamDetail({ urlPath, examData }: ServerExamDetailProps) {
  if (!examData) {
    // No server data — fall back to client-only render
    return <ExamDetailPage urlPath={urlPath} />;
  }

  const summary = formatExamSummaryText(examData);
  const syllabusTopics: string[] = Array.isArray(examData.syllabus) ? examData.syllabus : [];

  return <ExamDetailPage urlPath={urlPath} initialExamData={examData as any} />;
}
