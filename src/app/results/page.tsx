"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Award, Calendar, Clock, TrendingUp, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { useAuth } from '@/context/AuthContext';
import { resultService } from '@/lib/api/resultService';
import { Result } from '@/types';

export default function ResultsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchResults();
    }
  }, [isAuthenticated, pagination.page]);

  const fetchResults = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await resultService.getResults(pagination.page, pagination.limit);
      setResults(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 75) return 'text-success';
    if (percentage >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBgColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-success/10 border-success/20';
    if (percentage >= 50) return 'bg-warning/10 border-warning/20';
    return 'bg-destructive/10 border-destructive/20';
  };

  if (authLoading || (isLoading && results.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <section className="gradient-hero py-16">
        <div className="container-main">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-4">
              My Results
            </h1>
            <p className="text-lg text-background/80">
              Track your performance and progress across all exams
            </p>
          </div>
        </div>
      </section>

      <div className="container-main py-12">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pagination.total}</p>
                <p className="text-sm text-muted-foreground">Total Exams</p>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {results.length > 0 
                    ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / results.length)
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {results.filter(r => r.percentage >= 75).length}
                </p>
                <p className="text-sm text-muted-foreground">High Scores</p>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {results.length > 0
                    ? Math.round(results.reduce((acc, r) => acc + (r.time_taken || 0), 0) / results.length / 60)
                    : 0}m
                </p>
                <p className="text-sm text-muted-foreground">Avg Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center mb-8">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchResults} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && results.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              No results yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start taking exams to see your results here
            </p>
            <Link href="/exams">
              <Button>Browse Exams</Button>
            </Link>
          </div>
        )}

        {/* Results List */}
        {!isLoading && !error && results.length > 0 && (
          <>
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-bold text-foreground mb-2">
                        {result.examTitle}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(result.submittedAt || result.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {Math.round((result.time_taken || 0) / 60)} minutes
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {result.correct_answers}/{result.correct_answers + result.wrong_answers + result.unattempted} correct
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getScoreBgColor(result.percentage)}`}>
                          <span className={getScoreColor(result.percentage)}>
                            Score: {result.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="px-3 py-1 rounded-full border border-border bg-muted text-sm">
                          Rank: #{result.rank || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link href={`/results/${result.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Performance</span>
                      <span className="font-medium text-foreground">
                        {result.score}/{result.total_marks} marks
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          result.percentage >= 75 ? 'bg-success' :
                          result.percentage >= 50 ? 'bg-warning' :
                          'bg-destructive'
                        }`}
                        style={{ width: `${result.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
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
      </div>
    </div>
  );
}
