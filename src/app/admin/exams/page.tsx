"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, FileText, Loader2, Sparkles, Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminService } from '@/lib/api/adminService';
import { Exam } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatExamSummary } from '@/lib/utils/examSummary';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
  const [vanishingExamId, setVanishingExamId] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<{ title: string; subtitle: string } | null>(null);
  const limit = 10;

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await adminService.getExams({
        page,
        limit,
        search: search || undefined
      });
      setExams(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [page, search]);

  const handleDelete = async (exam: Exam) => {
    if (!confirm(`Ready to retire "${exam.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingExamId(exam.id);
      setDeleteToast({
        title: 'Sending exam off✨',
        subtitle: 'Just a moment while we tidy things up...'
      });

      await adminService.deleteExam(exam.id);

      setDeletingExamId(null);
      setVanishingExamId(exam.id);
      setDeleteToast({
        title: 'Delete complete',
        subtitle: `"${exam.title}" gracefully left the stage.`
      });

      setTimeout(() => {
        fetchExams();
        setVanishingExamId(null);
        setTimeout(() => setDeleteToast(null), 2000);
      }, 600);
    } catch (error) {
      console.error('Failed to delete exam:', error);
      setDeletingExamId(null);
      setVanishingExamId(null);
      setDeleteToast({
        title: 'Could not delete exam',
        subtitle: 'Please try again in a moment.'
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Breadcrumbs 
            items={[
              AdminBreadcrumb(),
              { label: 'Exams' }
            ]}
            className="mb-3"
          />
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Manage Exams
          </h1>
          <p className="text-muted-foreground">
            Create, edit, and manage all exams
          </p>
        </div>
        <Link href="/admin/exams/new">
          <Button className="bg-secondary hover:bg-secondary/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Exam
          </Button>
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exams by title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {deleteToast && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary">
              {deletingExamId ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{deleteToast.title}</p>
              <p className="text-xs text-muted-foreground">{deleteToast.subtitle}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="border-b border-border bg-muted/50 px-6 py-4">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="px-6 py-4 grid grid-cols-7 gap-4">
                <Skeleton className="h-4 w-full col-span-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-20 justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">No exams found</p>
          <Link href="/admin/exams/new">
            <Button>Create Your First Exam</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Title</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Exam Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Questions</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Duration</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Published</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {exams.map((exam) => {
                  const isDeleting = deletingExamId === exam.id;
                  const isVanishing = vanishingExamId === exam.id;
                  return (
                    <tr
                      key={exam.id}
                      className={`transition-all duration-500 ease-out ${
                        isDeleting ? 'bg-primary/5 opacity-70 blur-[0.5px] shadow-inner' : ''
                      } ${isVanishing ? 'opacity-0 scale-95 -translate-x-4 pointer-events-none' : 'hover:bg-muted/50'}`}
                    >
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{exam.title}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {exam.duration} mins
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5" />
                              {exam.total_questions} Qs / {exam.total_marks} Marks
                            </span>
                            <span>{formatExamSummary(exam)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded capitalize">
                          {exam.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                          exam.status === 'ongoing' ? 'bg-success/10 text-success' :
                          exam.status === 'upcoming' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {exam.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-foreground/5 text-foreground text-xs font-medium rounded capitalize">
                          {exam.exam_type?.replace('_', ' ') || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {exam.total_questions}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {exam.duration} min
                      </td>
                      <td className="px-6 py-4">
                        {exam.is_published ? (
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-success" />
                            <span className="text-xs font-medium text-success">Published</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />
                            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-full">Draft</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/exams/${exam.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(exam)}
                            className={`text-destructive hover:text-destructive hover:bg-destructive/10 relative ${isDeleting ? 'pointer-events-none' : ''}`}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} exams
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
