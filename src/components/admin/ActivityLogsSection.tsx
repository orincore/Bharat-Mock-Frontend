'use client';

import { useState, useEffect } from 'react';
import { Activity, Eye, Calendar, User, Filter } from 'lucide-react';
import { activityLogService, ActivityLog } from '@/lib/api/activityLogService';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLogsSectionProps {
  onViewAll: () => void;
}

export default function ActivityLogsSection({ onViewAll }: ActivityLogsSectionProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({
    total_activities: 0,
    active_users: 0,
    last_24h: 0,
    last_7d: 0,
    last_30d: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [logsResponse, statsResponse] = await Promise.all([
        activityLogService.getRecentActivity(10),
        activityLogService.getActivityStats()
      ]);

      if (logsResponse.success) {
        setLogs(logsResponse.logs);
      }

      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50';
    if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
    if (action.includes('BLOCK')) return 'text-orange-600 bg-orange-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Activity Logs</h2>
            <p className="text-sm text-muted-foreground">Track all admin, editor, and author actions</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Eye className="h-4 w-4" />
          View All Logs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Last 24 Hours</span>
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.last_24h}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Last 7 Days</span>
            <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.last_7d}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Last 30 Days</span>
            <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.last_30d}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Active Users</span>
            <User className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.active_users}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Recent Activity
        </h3>
        
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity logs found
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <Avatar className="h-10 w-10 border border-border/40">
                  {log.user_avatar_url ? (
                    <AvatarImage src={log.user_avatar_url} alt={log.user_email} />
                  ) : (
                    <AvatarFallback>{log.user_email.charAt(0).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{log.user_email}</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full capitalize">
                      {log.user_role}
                    </span>
                    <div className={`px-3 py-1 rounded-full text-[11px] font-semibold ${getActionColor(log.action)}`}>
                      {formatAction(log.action)}
                    </div>
                  </div>

                  {log.resource_type && (
                    <p className="text-sm text-muted-foreground">
                      {log.resource_type} {log.resource_id && `#${log.resource_id}`}
                    </p>
                  )}

                  {log.details?.path && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {String(log.details.method)} {String(log.details.path)}
                    </p>
                  )}
                </div>

                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
