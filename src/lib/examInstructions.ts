/**
 * Candidate instructions shown on the exam attempt screen and printed on the
 * generated question-paper PDF.
 *
 * An exam may carry its own rich-text `instructions`; when that is null/empty we
 * fall back to the generated default set below. Both surfaces import from here so
 * the wording can't drift between what a candidate reads on screen and what the
 * PDF says.
 */

export interface DefaultInstructionParams {
  sectionCount: number;
  totalQuestions: number;
  /** Exam duration in minutes. */
  durationMinutes: number;
  /** Marks awarded per correct answer, when uniform across the paper. */
  marksPerQuestion?: number | null;
  /** Marks deducted per wrong answer; 0/null means no negative marking. */
  negativeMarks?: number | null;
}

/** "1 Hour 30 Minutes" / "45 Minutes" / "-" for an unset duration. */
export function formatDuration(durationMinutes: number): string {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return '-';
  const hrs = Math.floor(durationMinutes / 60);
  const mins = Math.round(durationMinutes % 60);
  return [
    hrs ? `${hrs} Hour${hrs > 1 ? 's' : ''}` : '',
    mins ? `${mins} Minutes` : '',
  ].filter(Boolean).join(' ');
}

/**
 * Build the default instruction lines for an exam. Values are interpolated from
 * the exam itself rather than hardcoded — the previous attempt-screen copy always
 * claimed "60 minutes" and "2 marks / 0.5 negative" regardless of the actual exam.
 */
export function buildDefaultInstructions(params: DefaultInstructionParams): string[] {
  const { sectionCount, totalQuestions, durationMinutes, marksPerQuestion, negativeMarks } = params;

  const lines: string[] = [];

  lines.push(
    `The test contains ${sectionCount} section${sectionCount === 1 ? '' : 's'} having ${totalQuestions} questions.`
  );
  lines.push('Each question has 4 options out of which only one is correct.');

  const duration = formatDuration(durationMinutes);
  if (duration !== '-') lines.push(`You have to finish the test in ${duration}.`);

  const hasNegative = Number.isFinite(Number(negativeMarks)) && Number(negativeMarks) > 0;
  if (Number.isFinite(Number(marksPerQuestion)) && Number(marksPerQuestion) > 0) {
    lines.push(
      hasNegative
        ? `You will be awarded ${marksPerQuestion} marks for each correct answer and ${negativeMarks} will be deducted for each wrong answer.`
        : `You will be awarded ${marksPerQuestion} marks for each correct answer. There is no negative marking.`
    );
  }
  if (hasNegative) {
    lines.push('There is no negative marking for the questions that you have not attempted.');
  }

  lines.push(
    'You can write this test only once. Make sure that you complete the test before you submit the test and/or close the browser.'
  );

  return lines;
}

/** True when an exam supplied its own instructions (ignoring empty rich-text markup). */
export function hasCustomInstructions(instructions?: string | null): boolean {
  if (!instructions) return false;
  // Strip tags/entities so "<p><br></p>" from the rich-text editor counts as empty.
  const plain = instructions.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  return plain.length > 0;
}
