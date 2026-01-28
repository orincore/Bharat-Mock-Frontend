import { Exam, Question, Section } from '@/types';

export const mockExams: Exam[] = [
  {
    id: '1',
    title: 'JEE Main 2024 - Mock Test',
    description: 'Practice for Joint Entrance Examination Main with this comprehensive mock test covering Physics, Chemistry, and Mathematics.',
    duration: 180,
    total_marks: 300,
    totalMarks: 300,
    total_questions: 90,
    totalQuestions: 90,
    category: 'Engineering',
    difficulty: 'hard',
    status: 'ongoing',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    syllabus: [
      'Physics: Mechanics, Thermodynamics, Electromagnetism, Optics, Modern Physics',
      'Chemistry: Physical Chemistry, Organic Chemistry, Inorganic Chemistry',
      'Mathematics: Algebra, Calculus, Coordinate Geometry, Trigonometry'
    ],
    pass_percentage: 40,
    passPercentage: 40,
    is_free: true,
    price: 0,
    image_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
    pattern: {
      sections: [
        { id: 'physics', name: 'Physics', totalQuestions: 30, marksPerQuestion: 4, duration: 60 },
        { id: 'chemistry', name: 'Chemistry', totalQuestions: 30, marksPerQuestion: 4, duration: 60 },
        { id: 'mathematics', name: 'Mathematics', totalQuestions: 30, marksPerQuestion: 4, duration: 60 }
      ],
      negativeMarking: true,
      negativeMarkValue: 1
    },
    negative_marking: true,
    negative_mark_value: 1,
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
    attempts: 15234,
    is_published: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z'
  },
  {
    id: '2',
    title: 'NEET 2024 - Full Length Test',
    description: 'Complete mock test for National Eligibility cum Entrance Test covering Biology, Physics, and Chemistry.',
    duration: 200,
    total_marks: 720,
    totalMarks: 720,
    total_questions: 180,
    totalQuestions: 180,
    category: 'Medical',
    difficulty: 'hard',
    status: 'ongoing',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    syllabus: [
      'Biology: Botany, Zoology, Human Physiology, Genetics',
      'Physics: Mechanics, Thermodynamics, Electromagnetism',
      'Chemistry: Physical, Organic, Inorganic Chemistry'
    ],
    pass_percentage: 50,
    passPercentage: 50,
    is_free: true,
    price: 0,
    image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    pattern: {
      sections: [
        { id: 'physics', name: 'Physics', totalQuestions: 45, marksPerQuestion: 4, duration: 50 },
        { id: 'chemistry', name: 'Chemistry', totalQuestions: 45, marksPerQuestion: 4, duration: 50 },
        { id: 'biology', name: 'Biology', totalQuestions: 90, marksPerQuestion: 4, duration: 100 }
      ],
      negativeMarking: true,
      negativeMarkValue: 1
    },
    negative_marking: true,
    negative_mark_value: 1,
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    attempts: 23456,
    is_published: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z'
  },
  {
    id: '3',
    title: 'CAT 2024 - Practice Test',
    description: 'Prepare for Common Admission Test with this practice test covering VARC, DILR, and QA sections.',
    duration: 120,
    total_marks: 198,
    totalMarks: 198,
    total_questions: 66,
    totalQuestions: 66,
    category: 'Management',
    difficulty: 'hard',
    status: 'upcoming',
    start_date: '2024-11-01',
    end_date: '2024-11-30',
    startDate: '2024-11-01',
    endDate: '2024-11-30',
    syllabus: [
      'VARC: Reading Comprehension, Verbal Ability, Reasoning',
      'DILR: Data Interpretation, Logical Reasoning',
      'QA: Arithmetic, Algebra, Number System, Geometry'
    ],
    pass_percentage: 35,
    passPercentage: 35,
    is_free: true,
    price: 0,
    image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
    pattern: {
      sections: [
        { id: 'varc', name: 'VARC', totalQuestions: 24, marksPerQuestion: 3, duration: 40 },
        { id: 'dilr', name: 'DILR', totalQuestions: 20, marksPerQuestion: 3, duration: 40 },
        { id: 'qa', name: 'Quantitative Ability', totalQuestions: 22, marksPerQuestion: 3, duration: 40 }
      ],
      negativeMarking: true,
      negativeMarkValue: 1
    },
    negative_marking: true,
    negative_mark_value: 1,
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
    attempts: 8765,
    is_published: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z'
  },
  {
    id: '4',
    title: 'GATE 2024 - CS Mock Test',
    description: 'Graduate Aptitude Test in Engineering mock test for Computer Science and Information Technology.',
    duration: 180,
    total_marks: 100,
    totalMarks: 100,
    total_questions: 65,
    totalQuestions: 65,
    category: 'Engineering',
    difficulty: 'hard',
    status: 'ongoing',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    syllabus: [
      'Engineering Mathematics, Discrete Mathematics',
      'Digital Logic, Computer Organization',
      'Programming and Data Structures',
      'Algorithms, Theory of Computation',
      'Compiler Design, Operating Systems',
      'Databases, Computer Networks'
    ],
    pass_percentage: 25,
    passPercentage: 25,
    is_free: true,
    price: 0,
    image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    pattern: {
      sections: [
        { id: 'ga', name: 'General Aptitude', totalQuestions: 10, marksPerQuestion: 1.5, duration: 20 },
        { id: 'cs', name: 'Computer Science', totalQuestions: 55, marksPerQuestion: 2, duration: 160 }
      ],
      negativeMarking: true,
      negativeMarkValue: 0.33
    },
    negative_marking: true,
    negative_mark_value: 0.33,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    attempts: 12345,
    is_published: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z'
  },
  {
    id: '5',
    title: 'UPSC Prelims - GS Paper 1',
    description: 'Practice test for UPSC Civil Services Preliminary Examination General Studies Paper 1.',
    duration: 120,
    total_marks: 200,
    totalMarks: 200,
    total_questions: 100,
    totalQuestions: 100,
    category: 'Civil Services',
    difficulty: 'hard',
    status: 'upcoming',
    start_date: '2024-06-01',
    end_date: '2024-06-30',
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    syllabus: [
      'Indian History and Culture',
      'Indian and World Geography',
      'Indian Polity and Governance',
      'Economic and Social Development',
      'Environmental Ecology',
      'General Science'
    ],
    pass_percentage: 33,
    passPercentage: 33,
    is_free: true,
    price: 0,
    image_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
    pattern: {
      sections: [
        { id: 'gs', name: 'General Studies', totalQuestions: 100, marksPerQuestion: 2, duration: 120 }
      ],
      negativeMarking: true,
      negativeMarkValue: 0.66
    },
    negative_marking: true,
    negative_mark_value: 0.66,
    image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
    attempts: 45678,
    is_published: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z'
  },
  {
    id: '6',
    title: 'SSC CGL Tier 1 - Practice Set',
    description: 'Staff Selection Commission Combined Graduate Level Tier 1 practice test.',
    duration: 60,
    total_marks: 200,
    totalMarks: 200,
    total_questions: 100,
    totalQuestions: 100,
    category: 'Government Jobs',
    difficulty: 'medium',
    status: 'ongoing',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    syllabus: [
      'General Intelligence and Reasoning',
      'General Awareness',
      'Quantitative Aptitude',
      'English Comprehension'
    ],
    pass_percentage: 40,
    passPercentage: 40,
    is_free: true,
    price: 0,
    image_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
    pattern: {
      sections: [
        { id: 'reasoning', name: 'Reasoning', totalQuestions: 25, marksPerQuestion: 2, duration: 15 },
        { id: 'gk', name: 'General Awareness', totalQuestions: 25, marksPerQuestion: 2, duration: 15 },
        { id: 'quant', name: 'Quantitative Aptitude', totalQuestions: 25, marksPerQuestion: 2, duration: 15 },
        { id: 'english', name: 'English', totalQuestions: 25, marksPerQuestion: 2, duration: 15 }
      ],
      negativeMarking: true,
      negativeMarkValue: 0.5
    },
    negative_marking: true,
    negative_mark_value: 0.5,
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
    attempts: 34567,
    is_published: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z'
  }
];

export const mockQuestions: Question[] = [
  // Physics Section - JEE Main
  {
    id: 'q1',
    examId: '1',
    sectionId: 'physics',
    type: 'single',
    text: 'A ball is thrown vertically upward with initial velocity 20 m/s. What is the maximum height reached by the ball? (Take g = 10 m/s²)',
    options: [
      { id: 'a', text: '10 m' },
      { id: 'b', text: '20 m' },
      { id: 'c', text: '30 m' },
      { id: 'd', text: '40 m' }
    ],
    correctAnswer: 'b',
    marks: 4,
    negativeMarks: 1,
    explanation: 'Using v² = u² - 2gh, at maximum height v = 0. So h = u²/2g = (20)²/(2×10) = 20 m'
  },
  {
    id: 'q2',
    examId: '1',
    sectionId: 'physics',
    type: 'single',
    text: 'The SI unit of electric permittivity is:',
    options: [
      { id: 'a', text: 'C²/N·m²' },
      { id: 'b', text: 'N·m²/C²' },
      { id: 'c', text: 'C/N·m' },
      { id: 'd', text: 'N/C·m' }
    ],
    correctAnswer: 'a',
    marks: 4,
    negativeMarks: 1,
    explanation: 'Electric permittivity ε₀ = 8.85 × 10⁻¹² C²/N·m²'
  },
  {
    id: 'q3',
    examId: '1',
    sectionId: 'physics',
    type: 'numerical',
    text: 'A wire of resistance 10Ω is stretched to double its length. What is the new resistance in ohms?',
    correctAnswer: 40,
    marks: 4,
    explanation: 'When wire is stretched, R ∝ l². If length doubles, resistance becomes 4 times. New R = 4 × 10 = 40Ω'
  },
  {
    id: 'q4',
    examId: '1',
    sectionId: 'physics',
    type: 'multiple',
    text: 'Which of the following are vector quantities?',
    options: [
      { id: 'a', text: 'Force' },
      { id: 'b', text: 'Velocity' },
      { id: 'c', text: 'Mass' },
      { id: 'd', text: 'Acceleration' }
    ],
    correctAnswer: ['a', 'b', 'd'],
    marks: 4,
    negativeMarks: 1,
    explanation: 'Force, Velocity, and Acceleration are vector quantities. Mass is a scalar quantity.'
  },
  {
    id: 'q5',
    examId: '1',
    sectionId: 'physics',
    type: 'truefalse',
    text: 'The escape velocity from Earth is independent of the mass of the escaping object.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' }
    ],
    correctAnswer: 'true',
    marks: 4,
    negativeMarks: 1,
    explanation: 'Escape velocity = √(2GM/R), which depends only on Earth\'s mass and radius, not on the object\'s mass.'
  },
  // Chemistry Section
  {
    id: 'q6',
    examId: '1',
    sectionId: 'chemistry',
    type: 'single',
    text: 'Which of the following has the highest ionization energy?',
    options: [
      { id: 'a', text: 'Sodium (Na)' },
      { id: 'b', text: 'Magnesium (Mg)' },
      { id: 'c', text: 'Aluminum (Al)' },
      { id: 'd', text: 'Neon (Ne)' }
    ],
    correctAnswer: 'd',
    marks: 4,
    negativeMarks: 1,
    explanation: 'Noble gases have the highest ionization energy due to their stable electronic configuration.'
  },
  {
    id: 'q7',
    examId: '1',
    sectionId: 'chemistry',
    type: 'single',
    text: 'The IUPAC name of CH₃-CH=CH-CHO is:',
    options: [
      { id: 'a', text: 'But-2-enal' },
      { id: 'b', text: 'But-3-enal' },
      { id: 'c', text: 'Crotonaldehyde' },
      { id: 'd', text: 'Butanal' }
    ],
    correctAnswer: 'a',
    marks: 4,
    negativeMarks: 1,
    explanation: 'The compound has 4 carbons with a double bond at position 2 and aldehyde group, hence But-2-enal.'
  },
  // Mathematics Section
  {
    id: 'q8',
    examId: '1',
    sectionId: 'mathematics',
    type: 'single',
    text: 'What is the derivative of ln(sin x)?',
    options: [
      { id: 'a', text: 'cot x' },
      { id: 'b', text: 'tan x' },
      { id: 'c', text: 'sec x' },
      { id: 'd', text: 'cosec x' }
    ],
    correctAnswer: 'a',
    marks: 4,
    negativeMarks: 1,
    explanation: 'd/dx[ln(sin x)] = (1/sin x) × cos x = cot x'
  },
  {
    id: 'q9',
    examId: '1',
    sectionId: 'mathematics',
    type: 'numerical',
    text: 'If the sum of first n natural numbers is 55, find the value of n.',
    correctAnswer: 10,
    marks: 4,
    explanation: 'Sum = n(n+1)/2 = 55. So n(n+1) = 110 = 10 × 11. Therefore n = 10.'
  },
  {
    id: 'q10',
    examId: '1',
    sectionId: 'mathematics',
    type: 'single',
    text: 'The equation of a circle with center (2, -3) and radius 5 is:',
    options: [
      { id: 'a', text: '(x-2)² + (y+3)² = 25' },
      { id: 'b', text: '(x+2)² + (y-3)² = 25' },
      { id: 'c', text: '(x-2)² + (y-3)² = 25' },
      { id: 'd', text: '(x+2)² + (y+3)² = 25' }
    ],
    correctAnswer: 'a',
    marks: 4,
    negativeMarks: 1,
    explanation: 'Standard form: (x-h)² + (y-k)² = r² where (h,k) is center and r is radius.'
  }
];

export const getExamById = (id: string): Exam | undefined => {
  return mockExams.find(exam => exam.id === id);
};

export const getQuestionsByExamId = (examId: string): Question[] => {
  return mockQuestions.filter(q => q.examId === examId);
};

export const getExamsByStatus = (status: Exam['status']): Exam[] => {
  return mockExams.filter(exam => exam.status === status);
};

export const getExamsByCategory = (category: string): Exam[] => {
  return mockExams.filter(exam => exam.category.toLowerCase() === category.toLowerCase());
};
