"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { examService } from '@/lib/api/examService';
import { ExamHistoryEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import {
  Clock,
  History,
  Target,
  BookOpen,
  Play,
  Eye,
  ArrowLeft,
  PauseCircle
} from 'lucide-react';

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' }
];

export default function ExamHistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [history, setHistory] = useState<ExamHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [metrics, setMetrics] = useState({
    totalAttempts: 0,
    completed: 0,
    inProgress: 0
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated, pagination.page, selectedStatus]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await examService.getExamHistory({
        page: pagination.page,
        status: selectedStatus !== 'all' ? selectedStatus : undefined
      });
      setHistory(response.entries);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0,
        totalPages: response.pagination?.totalPages || 0
      }));
      setMetrics({
        totalAttempts: response.metrics?.totalAttempts || 0,
        completed: response.metrics?.completed || 0,
        inProgress: response.metrics?.inProgress || 0
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load exam history');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyles = (status: ExamHistoryEntry['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'in-progress':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-border/60';
    }
  };

  const handleResume = (entry: ExamHistoryEntry) => {
    router.push(`/exams/${entry.examId}/attempt/${entry.attemptId}`);
  };

  if (authLoading || (isLoading && history.length === 0)) {
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
      <section className="gradient-hero py-14">
        <div className="container-main flex flex-col gap-4">
          <Link href="/profile" className="inline-flex items-center text-background/80">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Link>
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-3">
              Exam History
            </h1>
            <p className="text-lg text-background/80">
              Resume in-progress exams, monitor your attempts, and review detailed records.
            </p>
          </div>
        </div>
      </section>

      <div className="container-main py-10 space-y-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold text-foreground">{metrics.totalAttempts}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Exams</p>
                <p className="text-2xl font-bold text-foreground">{metrics.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <PauseCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">{metrics.inProgress}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="inline-flex rounded-xl border border-border bg-card p-1">
            {STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setPagination(prev => ({ ...prev, page: 1 }));
                  setSelectedStatus(option.value);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  selectedStatus === option.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Link href="/exams" className="flex items-center gap-2 text-sm font-medium text-primary">
            <BookOpen className="h-4 w-4" />
            Browse new exams
          </Link>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchHistory} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && !error && history.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">No exam history yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your first exam to see progress here.
            </p>
            <Link href="/exams">
              <Button>Start an Exam</Button>
            </Link>
          </div>
        )}

        {isLoading && history.length === 0 ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4">
            {history.map(entry => (
              <div key={entry.attemptId} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span
                        className={`text-xs px-3 py-1 rounded-full border font-semibold uppercase tracking-wide ${getStatusStyles(entry.status)}`}
                      >
                        {entry.status === 'in-progress' ? 'In Progress' : entry.status === 'completed' ? 'Completed' : 'Upcoming'}
                      </span>
                      <span className="text-sm text-muted-foreground">{entry.category}</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground mb-3">{entry.examTitle}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Started {new Date(entry.startedAt).toLocaleString()}</span>
                      </div>
                      {entry.timeSpent !== undefined && (
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4" />
                          <span>{Math.round((entry.timeSpent || 0) / 60)} mins spent</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {entry.status === 'in-progress' && entry.resumeAllowed && (
                      <Button onClick={() => handleResume(entry)} className="flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Resume Exam
                      </Button>
                    )}
                    {entry.status === 'completed' && (
                      <Link href={`/results/${entry.attemptId}`}>
                        <Button variant="outline" className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          View Result
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min((prev.totalPages || 1), prev.page + 1) }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
