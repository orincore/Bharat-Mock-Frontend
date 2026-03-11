"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Users, CheckCircle, Clock } from 'lucide-react';
import { examService } from '@/lib/api/examService';
import { adminService } from '@/lib/api/adminService';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';
import { useAuth } from '@/context/AuthContext';
import ActivityLogsSection from '@/components/admin/ActivityLogsSection';
import ActivityLogsViewer from '@/components/admin/ActivityLogsViewer';

export default function AdminDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalExams: 0,
    totalUsers: 0,
    publishedExams: 0,
    upcomingExams: 0
  });
  const [loading, setLoading] = useState(true);
  const [showLogsViewer, setShowLogsViewer] = useState(false);

  const allowedRoles = ['admin', 'editor', 'author'];
  const hasDashboardAccess = useMemo(
    () => (user?.role ? allowedRoles.includes(user.role) : false),
    [user?.role]
  );
  const isAdmin = user?.role === 'admin';
  const canViewActivityLogs = isAdmin;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!hasDashboardAccess) {
      setLoading(false);
      return;
    }
    const fetchStats = async () => {
      try {
        const examsResponse = await examService.getExams({ page: 1, limit: 1 });
        let totalUsers = 0;

        if (isAdmin) {
          try {
            const usersResponse = await adminService.getAllUsers(1, 1);
            totalUsers = usersResponse.pagination.total;
          } catch (userError) {
            console.warn('User stats unavailable for current role:', userError);
          }
        }

        setStats((prev) => ({
          ...prev,
          totalExams: examsResponse.total,
          totalUsers
        }));
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [hasDashboardAccess, isAdmin]);

  const statCards = useMemo(() => {
    const baseCards = [
      {
        title: 'Total Exams',
        value: stats.totalExams,
        icon: FileText,
        color: 'bg-primary/10 text-primary'
      },
      {
        title: 'Published Exams',
        value: stats.publishedExams,
        icon: CheckCircle,
        color: 'bg-success/10 text-success'
      },
      {
        title: 'Upcoming Exams',
        value: stats.upcomingExams,
        icon: Clock,
        color: 'bg-warning/10 text-warning'
      }
    ];

    if (isAdmin) {
      baseCards.splice(1, 0, {
        title: 'Total Users',
        value: stats.totalUsers,
        icon: Users,
        color: 'bg-secondary/10 text-secondary'
      });
    }

    return baseCards;
  }, [stats, isAdmin]);

  if (!isLoading && isAuthenticated && !hasDashboardAccess) {
    return (
      <div className="bg-card border border-destructive/40 rounded-2xl p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Access Restricted</h1>
        <p className="text-muted-foreground">
          This workspace is available only for Admin, Editor, or Author roles. You currently have the <strong>{user?.role}</strong> role.
        </p>
        <p className="text-sm text-muted-foreground">Please contact support if you need access to the content tools.</p>
      </div>
    );
  }

  if (isLoading || !hasDashboardAccess) {
    return (
      <div className="flex justify-center py-16">
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Breadcrumbs 
          items={[
            AdminBreadcrumb()
          ]}
          className="mb-3"
        />
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage exams, users, and platform settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-card rounded-xl border border-border p-6">
                <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))
          : statCards.map((stat) => (
              <div key={stat.title} className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-12 w-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            Quick Actions
          </h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <Link
                href="/admin/exams/new"
                className="block px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-center font-medium"
              >
                Create New Exam
              </Link>
              <Link
                href="/admin/exams"
                className="block px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-center font-medium"
              >
                Manage Exams
              </Link>
              <Link
                href="/admin/users"
                className="block px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-center font-medium"
              >
                Manage Users
              </Link>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>No recent activity to display</p>
          </div>
        </div>
      </div>

      {canViewActivityLogs && (
        <div className="mt-8">
          <ActivityLogsSection onViewAll={() => setShowLogsViewer(true)} />
        </div>
      )}

      {canViewActivityLogs && showLogsViewer && (
        <ActivityLogsViewer onClose={() => setShowLogsViewer(false)} />
      )}
    </div>
  );
}
