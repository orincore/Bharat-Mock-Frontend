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

  return (
    <>
      {/* ── Static HTML for Google indexing ─────────────────────────────── */}
      <div className="sr-only" aria-hidden="false">
        <h1>{examData.title}</h1>
        {summary && <p>{summary}</p>}
        {examData.category && <p>Category: {examData.category}</p>}
        {examData.status && <p>Status: {examData.status}</p>}
        {examData.exam_type && <p>Type: {examData.exam_type}</p>}
        {examData.total_questions && <p>Total Questions: {examData.total_questions}</p>}
        {examData.total_marks && <p>Total Marks: {examData.total_marks}</p>}
        {examData.duration && <p>Duration: {examData.duration} minutes</p>}
        {examData.negative_marking && <p>Negative Marking: Yes ({examData.negative_mark_value})</p>}
        {examData.supports_hindi && <p>Available in Hindi and English</p>}
        {examData.is_free ? <p>This exam is free.</p> : <p>This exam requires a premium subscription.</p>}
        {syllabusTopics.length > 0 && (
          <section>
            <h2>Syllabus</h2>
            <ul>{syllabusTopics.map((topic, i) => <li key={i}>{topic}</li>)}</ul>
          </section>
        )}
      </div>

      {/* ── Full interactive client component — skip its own API fetch via initialExamData ── */}
      <ExamDetailPage urlPath={urlPath} initialExamData={examData as any} />
    </>
  );
}
