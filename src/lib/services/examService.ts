import { Exam, Question, FilterOptions, PaginatedResponse } from '@/types';
import { mockExams, getExamById, getQuestionsByExamId, getExamsByStatus, getExamsByCategory } from '@/lib/mock/exams';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const examService = {
  async getExams(options?: FilterOptions): Promise<PaginatedResponse<Exam>> {
    await delay(300);
    
    let filteredExams = [...mockExams];
    
    if (options?.search) {
      const search = options.search.toLowerCase();
      filteredExams = filteredExams.filter(exam => 
        exam.title.toLowerCase().includes(search) ||
        exam.description.toLowerCase().includes(search)
      );
    }
    
    if (options?.status) {
      filteredExams = filteredExams.filter(exam => exam.status === options.status);
    }
    
    if (options?.category) {
      filteredExams = filteredExams.filter(exam => 
        exam.category.toLowerCase() === options.category?.toLowerCase()
      );
    }
    
    if (options?.difficulty) {
      filteredExams = filteredExams.filter(exam => exam.difficulty === options.difficulty);
    }
    
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      data: filteredExams.slice(startIndex, endIndex),
      total: filteredExams.length,
      page,
      limit,
      totalPages: Math.ceil(filteredExams.length / limit)
    };
  },
  
  async getExamById(id: string): Promise<Exam | null> {
    await delay(200);
    return getExamById(id) || null;
  },
  
  async getQuestionsByExamId(examId: string): Promise<Question[]> {
    await delay(300);
    return getQuestionsByExamId(examId);
  },
  
  async getFeaturedExams(): Promise<Exam[]> {
    await delay(200);
    return mockExams.slice(0, 4);
  },
  
  async getExamsByStatus(status: Exam['status']): Promise<Exam[]> {
    await delay(200);
    return getExamsByStatus(status);
  },
  
  async getExamCategories(): Promise<string[]> {
    await delay(100);
    return [...new Set(mockExams.map(exam => exam.category))];
  }
};
