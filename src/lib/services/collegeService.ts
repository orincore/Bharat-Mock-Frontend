import { College, Course, FilterOptions, PaginatedResponse } from '@/types';
import { mockColleges, mockCourses, getCollegeById, getCourseById, getCollegesByType } from '@/lib/mock/colleges';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const collegeService = {
  async getColleges(options?: FilterOptions): Promise<PaginatedResponse<College>> {
    await delay(300);
    
    let filteredColleges = [...mockColleges];
    
    if (options?.search) {
      const search = options.search.toLowerCase();
      filteredColleges = filteredColleges.filter(college => 
        college.name.toLowerCase().includes(search) ||
        college.location.toLowerCase().includes(search)
      );
    }
    
    if (options?.type) {
      filteredColleges = filteredColleges.filter(college => college.type === options.type);
    }
    
    if (options?.location) {
      filteredColleges = filteredColleges.filter(college => 
        college.location.toLowerCase().includes(options.location!.toLowerCase())
      );
    }
    
    if (options?.sortBy === 'ranking') {
      filteredColleges.sort((a, b) => 
        options.sortOrder === 'desc' ? b.ranking - a.ranking : a.ranking - b.ranking
      );
    } else if (options?.sortBy === 'rating') {
      filteredColleges.sort((a, b) => 
        options.sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating
      );
    }
    
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      data: filteredColleges.slice(startIndex, endIndex),
      total: filteredColleges.length,
      page,
      limit,
      totalPages: Math.ceil(filteredColleges.length / limit)
    };
  },
  
  async getCollegeById(id: string): Promise<College | null> {
    await delay(200);
    return getCollegeById(id) || null;
  },
  
  async getFeaturedColleges(): Promise<College[]> {
    await delay(200);
    return mockColleges.slice(0, 4);
  },
  
  async getCourses(options?: FilterOptions): Promise<PaginatedResponse<Course>> {
    await delay(300);
    
    let filteredCourses = [...mockCourses];
    
    if (options?.search) {
      const search = options.search.toLowerCase();
      filteredCourses = filteredCourses.filter(course => 
        course.name.toLowerCase().includes(search) ||
        course.description.toLowerCase().includes(search)
      );
    }
    
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      data: filteredCourses.slice(startIndex, endIndex),
      total: filteredCourses.length,
      page,
      limit,
      totalPages: Math.ceil(filteredCourses.length / limit)
    };
  },
  
  async getCourseById(id: string): Promise<Course | null> {
    await delay(200);
    return getCourseById(id) || null;
  },
  
  async getCollegeTypes(): Promise<string[]> {
    await delay(100);
    return ['government', 'private', 'deemed'];
  },
  
  async getLocations(): Promise<string[]> {
    await delay(100);
    return [...new Set(mockColleges.map(college => college.location.split(', ')[1]))];
  }
};
