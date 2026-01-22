"use client";

import { useEffect, useState } from 'react';
import { FileText, Users, CheckCircle, Clock } from 'lucide-react';
import { examService } from '@/lib/api/examService';
import { adminService } from '@/lib/api/adminService';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalExams: 0,
    totalUsers: 0,
    publishedExams: 0,
    upcomingExams: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [examsResponse, usersResponse] = await Promise.all([
          examService.getExams({ page: 1, limit: 1 }),
          adminService.getAllUsers(1, 1)
        ]);

        setStats({
          totalExams: examsResponse.total,
          totalUsers: usersResponse.pagination.total,
          publishedExams: 0,
          upcomingExams: 0
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Exams',
      value: stats.totalExams,
      icon: FileText,
      color: 'bg-primary/10 text-primary'
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-secondary/10 text-secondary'
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage exams, users, and platform settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`h-12 w-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">
              {loading ? '...' : stat.value}
            </p>
            <p className="text-sm text-muted-foreground">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <a
              href="/admin/exams/create"
              className="block px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-center font-medium"
            >
              Create New Exam
            </a>
            <a
              href="/admin/exams"
              className="block px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-center font-medium"
            >
              Manage Exams
            </a>
            <a
              href="/admin/users"
              className="block px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-center font-medium"
            >
              Manage Users
            </a>
          </div>
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
    </div>
  );
}
