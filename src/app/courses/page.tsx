"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, GraduationCap, BookOpen, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { courseService } from '@/lib/api/courseService';
import { Course } from '@/types';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    search: '',
    level: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchCourses();
  }, [filters, pagination.page]);

  const fetchCourses = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await courseService.getCourses({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      
      setCourses(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchCourses();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      level: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Section */}
      <section className="gradient-hero py-10">
        <div className="container-main">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
              Explore Courses
            </h1>
            <p className="text-lg text-background/80 mb-8">
              Discover the right course for your career goals
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search courses..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 bg-background"
                />
              </div>
              <Button type="submit" size="lg">
                Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      <div className="container-main py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Filters
                </h3>
                {filters.level && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                {/* Level Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Course Level
                  </label>
                  <select
                    value={filters.level}
                    onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Levels</option>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Certificate">Certificate</option>
                  </select>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Courses</span>
                    <span className="font-semibold text-foreground">{pagination.total}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {filters.level ? 'Filtered Results' : 'All Courses'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Showing {courses.length} of {pagination.total} courses
                </p>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchCourses} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && courses.length === 0 && (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  No courses found
                </h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your filters or search query
                </p>
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            )}

            {/* Courses Grid */}
            {!isLoading && !error && courses.length > 0 && (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <Link key={course.id} href={`/courses/${course.id}`}>
                      <div className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all cursor-pointer h-full">
                        <div className="flex items-start justify-between mb-4">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-primary" />
                          </div>
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                            {course.level}
                          </span>
                        </div>
                        
                        <h3 className="font-display text-lg font-bold text-foreground mb-2">
                          {course.name}
                        </h3>
                        
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {course.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {course.duration}
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {course.subjects?.length || 0} subjects
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-12">
                    <Button
                      variant="outline"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={pagination.page === pageNum ? 'default' : 'outline'}
                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
