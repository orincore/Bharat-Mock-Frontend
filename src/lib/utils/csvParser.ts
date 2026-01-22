/**
 * CSV Parser for Exam Import
 * 
 * CSV Format Specification:
 * - Section columns: section_name, section_order, section_duration, marks_per_question
 * - Question columns: question_type, question_text, marks, negative_marks, explanation, difficulty, requires_image
 * - Option columns: option_1_text, option_1_correct, option_1_requires_image, option_2_text, option_2_correct, option_2_requires_image, etc.
 * 
 * Example CSV structure:
 * section_name,section_order,section_duration,marks_per_question,question_type,question_text,marks,negative_marks,explanation,difficulty,requires_image,option_1_text,option_1_correct,option_1_requires_image,option_2_text,option_2_correct,option_2_requires_image,option_3_text,option_3_correct,option_3_requires_image,option_4_text,option_4_correct,option_4_requires_image
 */

export interface CSVValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

type QuestionType = 'single' | 'multiple' | 'truefalse' | 'numerical';

export interface ParsedOption {
  option_text: string;
  is_correct: boolean;
  requires_image: boolean;
  option_order: number;
  hasError?: boolean;
  errorMessage?: string;
}

export interface ParsedQuestion {
  type: QuestionType;
  text: string;
  marks: number;
  negative_marks: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  requires_image: boolean;
  options: ParsedOption[];
  hasError?: boolean;
  errorMessages?: string[];
}

export interface ParsedSection {
  name: string;
  section_order: number;
  duration: number;
  marks_per_question: number;
  questions: ParsedQuestion[];
  hasError?: boolean;
  errorMessages?: string[];
}

export interface CSVParseResult {
  sections: ParsedSection[];
  errors: CSVValidationError[];
  warnings: CSVValidationError[];
  isValid: boolean;
}

const REQUIRED_FIELDS = [
  'section_name',
  'question_type',
  'question_text',
  'marks'
];

const QUESTION_TYPES: QuestionType[] = ['single', 'multiple', 'truefalse', 'numerical'];
const QUESTION_TYPE_ALIASES: Record<string, QuestionType> = {
  mcq: 'single',
  'multiple choice': 'single',
  singlechoice: 'single',
  'single choice': 'single',
  'single-correct': 'single',
  'single correct': 'single',
  multiplechoice: 'multiple',
  'multi select': 'multiple',
  multiselect: 'multiple',
  'multi-select': 'multiple',
  'multi correct': 'multiple',
  multicorrect: 'multiple',
  'multi-correct': 'multiple',
  'multi answer': 'multiple',
  'multiple answers': 'multiple',
  'true/false': 'truefalse',
  tf: 'truefalse',
  boolean: 'truefalse',
  num: 'numerical',
  numeric: 'numerical'
};
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

function normalizeQuestionType(value?: string | null): QuestionType | null {
  if (!value) return null;
  const sanitized = value.toLowerCase().trim();
  if (!sanitized) return null;

  if (QUESTION_TYPES.includes(sanitized as QuestionType)) {
    return sanitized as QuestionType;
  }

  const collapsed = sanitized.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return QUESTION_TYPE_ALIASES[collapsed] || QUESTION_TYPE_ALIASES[sanitized] || null;
}

export function parseCSV(csvText: string): CSVParseResult {
  const errors: CSVValidationError[] = [];
  const warnings: CSVValidationError[] = [];
  const sectionsMap = new Map<string, ParsedSection>();

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'CSV file is empty or has no data rows',
      severity: 'error'
    });
    return { sections: [], errors, warnings, isValid: false };
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Validate required headers
  for (const required of REQUIRED_FIELDS) {
    if (!headers.includes(required)) {
      errors.push({
        row: 0,
        field: required,
        message: `Missing required column: ${required}`,
        severity: 'error'
      });
    }
  }

  if (errors.length > 0) {
    return { sections: [], errors, warnings, isValid: false };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    const rowNumber = i + 1;

    // Validate and parse section
    const sectionName = row['section_name'];
    if (!sectionName) {
      errors.push({
        row: rowNumber,
        field: 'section_name',
        message: 'Section name is required',
        severity: 'error'
      });
      continue;
    }

    if (!sectionsMap.has(sectionName)) {
      const sectionOrder = parseInt(row['section_order']) || sectionsMap.size + 1;
      const duration = parseInt(row['section_duration']) || 0;
      const marksPerQuestion = parseFloat(row['marks_per_question']) || 1;

      const section: ParsedSection = {
        name: sectionName,
        section_order: sectionOrder,
        duration,
        marks_per_question: marksPerQuestion,
        questions: [],
        errorMessages: []
      };

      if (!duration) {
        warnings.push({
          row: rowNumber,
          field: 'section_duration',
          message: `Section "${sectionName}" has no duration specified`,
          severity: 'warning'
        });
        section.errorMessages?.push('Duration not specified');
      }

      sectionsMap.set(sectionName, section);
    }

    const section = sectionsMap.get(sectionName)!;

    // Parse question
    const rawQuestionType = row['question_type'];
    if (!rawQuestionType?.trim()) {
      errors.push({
        row: rowNumber,
        field: 'question_type',
        message: 'Question type is required',
        severity: 'error'
      });
      continue;
    }

    const questionType = normalizeQuestionType(rawQuestionType);
    if (!questionType) {
      errors.push({
        row: rowNumber,
        field: 'question_type',
        message: `Invalid question type: ${rawQuestionType}. Must be one of: ${QUESTION_TYPES.join(', ')} (aliases: mcq, multi select, true/false, numeric, etc.)`,
        severity: 'error'
      });
      continue;
    }

    const questionText = row['question_text'];
    if (!questionText) {
      errors.push({
        row: rowNumber,
        field: 'question_text',
        message: 'Question text is required',
        severity: 'error'
      });
      continue;
    }

    const marks = parseFloat(row['marks']);
    if (isNaN(marks) || marks <= 0) {
      errors.push({
        row: rowNumber,
        field: 'marks',
        message: 'Valid marks value is required',
        severity: 'error'
      });
      continue;
    }

    const negativeMarks = parseFloat(row['negative_marks']) || 0;
    const explanation = row['explanation'] || '';
    const difficulty = (row['difficulty']?.toLowerCase() || 'medium') as any;
    const requiresImage = row['requires_image']?.toLowerCase() === 'true' || row['requires_image'] === '1';

    if (!DIFFICULTY_LEVELS.includes(difficulty)) {
      warnings.push({
        row: rowNumber,
        field: 'difficulty',
        message: `Invalid difficulty level: ${difficulty}. Defaulting to 'medium'`,
        severity: 'warning'
      });
    }

    const question: ParsedQuestion = {
      type: questionType,
      text: questionText,
      marks,
      negative_marks: negativeMarks,
      explanation,
      difficulty: DIFFICULTY_LEVELS.includes(difficulty) ? difficulty : 'medium',
      requires_image: requiresImage,
      options: [],
      errorMessages: []
    };

    if (requiresImage) {
      question.errorMessages?.push('Image upload required for question');
    }

    if (!explanation) {
      warnings.push({
        row: rowNumber,
        field: 'explanation',
        message: 'No explanation provided for question',
        severity: 'warning'
      });
    }

    // Parse options
    let optionIndex = 1;
    let hasCorrectOption = false;
    
    while (row[`option_${optionIndex}_text`] !== undefined) {
      const optionText = row[`option_${optionIndex}_text`];
      const isCorrect = row[`option_${optionIndex}_correct`]?.toLowerCase() === 'true' || row[`option_${optionIndex}_correct`] === '1';
      const optionRequiresImage = row[`option_${optionIndex}_requires_image`]?.toLowerCase() === 'true' || row[`option_${optionIndex}_requires_image`] === '1';

      if (optionText) {
        const option: ParsedOption = {
          option_text: optionText,
          is_correct: isCorrect,
          requires_image: optionRequiresImage,
          option_order: optionIndex
        };

        if (isCorrect) {
          hasCorrectOption = true;
        }

        if (optionRequiresImage) {
          option.hasError = true;
          option.errorMessage = 'Image upload required';
        }

        question.options.push(option);
      }

      optionIndex++;
    }

    // Validate options
    if (questionType !== 'numerical' && question.options.length === 0) {
      errors.push({
        row: rowNumber,
        field: 'options',
        message: 'At least one option is required for this question type',
        severity: 'error'
      });
      question.hasError = true;
      question.errorMessages?.push('No options provided');
    }

    if (questionType !== 'numerical' && !hasCorrectOption) {
      errors.push({
        row: rowNumber,
        field: 'options',
        message: 'At least one option must be marked as correct',
        severity: 'error'
      });
      question.hasError = true;
      question.errorMessages?.push('No correct option specified');
    }

    if (questionType === 'single' && question.options.filter(o => o.is_correct).length > 1) {
      errors.push({
        row: rowNumber,
        field: 'options',
        message: 'Single choice questions can only have one correct option',
        severity: 'error'
      });
      question.hasError = true;
      question.errorMessages?.push('Multiple correct options for single choice');
    }

    if (question.errorMessages && question.errorMessages.length > 0) {
      question.hasError = true;
    }

    section.questions.push(question);
  }

  const sections = Array.from(sectionsMap.values()).sort((a, b) => a.section_order - b.section_order);

  // Mark sections with errors
  sections.forEach(section => {
    if (section.questions.some(q => q.hasError)) {
      section.hasError = true;
    }
  });

  return {
    sections,
    errors,
    warnings,
    isValid: errors.length === 0
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function generateCSVTemplate(): string {
  const headers = [
    'section_name',
    'section_order',
    'section_duration',
    'marks_per_question',
    'question_type',
    'question_text',
    'marks',
    'negative_marks',
    'explanation',
    'difficulty',
    'requires_image',
    'option_1_text',
    'option_1_correct',
    'option_1_requires_image',
    'option_2_text',
    'option_2_correct',
    'option_2_requires_image',
    'option_3_text',
    'option_3_correct',
    'option_3_requires_image',
    'option_4_text',
    'option_4_correct',
    'option_4_requires_image'
  ];

  const exampleRow = [
    'General Knowledge',
    '1',
    '1800',
    '1',
    'single',
    'What is the capital of India?',
    '1',
    '0.25',
    'New Delhi is the capital city of India',
    'easy',
    'false',
    'Mumbai',
    'false',
    'false',
    'New Delhi',
    'true',
    'false',
    'Kolkata',
    'false',
    'false',
    'Chennai',
    'false',
    'false'
  ];

  return headers.join(',') + '\n' + exampleRow.join(',');
}
