"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Mail, Phone, Shield, User, Activity, Target, Timer, ListChecks } from "lucide-react";
import { adminService, AdminUserDetails } from "@/lib/api/adminService";
import { LoadingSpinner } from "@/components/common/LoadingStates";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminUserDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<AdminUserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = params?.id;
    if (!userId) return;

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await adminService.getUserDetails(userId);
        setData(result);
      } catch (err: any) {
        setError(err?.message || "Failed to load user details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [params?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-14">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-6">
        <p className="font-medium mb-4">{error || "User not found"}</p>
        <Button onClick={() => router.push("/admin/users")}>Back to Users</Button>
      </div>
    );
  }

  const { user, stats, recentResults, recentAttempts } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" className="mb-4" asChild>
            <Link href="/admin/users" className="flex items-center gap-2 text-sm">
              <ArrowLeft className="h-4 w-4" /> Back to Users
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-bold text-foreground">User Overview</h1>
          <p className="text-muted-foreground">Dive into this learner's activity, performance, and account health.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6 flex items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user.name || "User avatar"} />
              ) : null}
              <AvatarFallback className="text-3xl font-bold">
                {user.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold text-foreground">{user.name}</h2>
                {user.role === "admin" && <Badge variant="secondary">Admin</Badge>}
                {user.is_verified && (
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    Verified
                  </Badge>
                )}
                {user.is_blocked && (
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                    Blocked
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {user.email}
                </span>
                {user.phone && (
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> {user.phone}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Joined {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" /> Auth Provider: {user.auth_provider || "email"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Exams Attempted</p>
              <p className="text-2xl font-bold">{stats.totalExamsTaken}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className="text-2xl font-bold">{stats.averageScore}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Best Score</p>
              <p className="text-2xl font-bold">{stats.bestScore}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Active</p>
              <p className="text-lg font-semibold">
                {stats.lastActive ? new Date(stats.lastActive).toLocaleDateString() : "No activity"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Recent Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published results yet.</p>
            ) : (
              recentResults.map((result) => (
                <div key={result.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-foreground">{result.exam?.title || "Exam"}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.exam?.category || "General"} • {result.exam?.difficulty || "N/A"}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={result.status === "passed" ? "bg-success/10 text-success border-success/20" : ''}
                    >
                      {result.status}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="font-semibold">{result.score}/{result.total_marks}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Percent</p>
                      <p className="font-semibold">{result.percentage}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-semibold">
                        {new Date(result.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" /> Recent Attempts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAttempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attempts found.</p>
            ) : (
              recentAttempts.map((attempt) => (
                <div key={attempt.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-foreground">{attempt.exam?.title || "Exam"}</p>
                      <p className="text-xs text-muted-foreground">
                        Started {new Date(attempt.started_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={attempt.is_submitted ? "secondary" : "outline"}>
                      {attempt.is_submitted ? "Submitted" : "In progress"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Time Taken</p>
                      <p className="font-semibold">{attempt.time_taken ? `${attempt.time_taken}s` : "--"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="font-semibold">
                        {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Overall Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Marks Earned</p>
            <p className="text-2xl font-bold">{stats.totalMarksEarned}</p>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Marks Possible</p>
            <p className="text-2xl font-bold">{stats.totalMarksPossible}</p>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground">Average Score</p>
            <p className="text-2xl font-bold">{stats.averageScore}%</p>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground">Best Score</p>
            <p className="text-2xl font-bold">{stats.bestScore}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
