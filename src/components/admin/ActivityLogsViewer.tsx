'use client';

import { useState, useEffect } from 'react';
import { X, Search, Filter, Download, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { activityLogService, ActivityLog } from '@/lib/api/activityLogService';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface ActivityLogsViewerProps {
  onClose: () => void;
}

type LogFilters = {
  search: string;
  action: string;
  resourceType: string;
  startDate: string;
  endDate: string;
};

type LogQueryParams = {
  page: number;
  limit: number;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
};

export default function ActivityLogsViewer({ onClose }: ActivityLogsViewerProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<LogFilters>({
    search: '',
    action: '',
    resourceType: '',
    startDate: '',
    endDate: ''
  });

  const itemsPerPage = 50;

  const formatLabel = (label: string) =>
    label
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
  };

  const getDetailString = (details: Record<string, unknown> | undefined, key: string) => {
    if (!details) return undefined;
    const value = details[key];
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  };

  const getObjectDetail = (
    details: Record<string, unknown> | undefined,
    key: string
  ): Record<string, unknown> | undefined => {
    if (!details) return undefined;
    const value = details[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return undefined;
  };

  const getBooleanDetail = (details: Record<string, unknown> | undefined, key: string) => {
    if (!details) return undefined;
    const value = details[key];
    return typeof value === 'boolean' ? value : undefined;
  };

  const renderKeyValueSection = (title: string, data?: Record<string, unknown>) => {
    if (!data || Object.keys(data).length === 0) return null;

    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground tracking-wide uppercase">{title}</p>
        <div className="rounded-lg border border-border/60 bg-muted/40 p-3 space-y-1 text-xs">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-3">
              <span className="font-medium text-foreground">{formatLabel(key)}</span>
              <span className="text-muted-foreground text-right break-all">
                {formatValue(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: LogQueryParams = {
        page: currentPage,
        limit: itemsPerPage,
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
        ...(filters.startDate ? { startDate: filters.startDate } : {}),
        ...(filters.endDate ? { endDate: filters.endDate } : {})
      };

      const response = await activityLogService.getActivityLogs(params);

      if (response.success) {
        setLogs(response.logs);
        setTotalPages(response.pagination.totalPages);
        setTotal(response.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof LogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchLogs();
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      action: '',
      resourceType: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
    setTimeout(fetchLogs, 100);
  };

  const exportLogs = () => {
    const csv = [
      ['ID', 'User Email', 'Role', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Created At'].join(','),
      ...logs.map(log => [
        log.id,
        log.user_email,
        log.user_role,
        log.action,
        log.resource_type || '',
        log.resource_id || '',
        log.ip_address || '',
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400';
    if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400';
    if (action.includes('BLOCK')) return 'text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400';
    return 'text-gray-600 bg-gray-50 dark:bg-gray-950 dark:text-gray-400';
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredLogs = logs.filter(log => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        log.user_email.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        (log.resource_type && log.resource_type.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Activity Logs</h2>
              <p className="text-sm text-muted-foreground">
                Showing {filteredLogs.length} of {total} total activities
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by email, action, or resource..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="px-4 py-2 bg-muted rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Actions</option>
              <option value="CREATE_EXAM">Create Exam</option>
              <option value="UPDATE_EXAM">Update Exam</option>
              <option value="DELETE_EXAM">Delete Exam</option>
              <option value="UPDATE_USER_ROLE">Update User Role</option>
              <option value="TOGGLE_USER_BLOCK">Toggle User Block</option>
              <option value="CREATE_NAVIGATION">Create Navigation</option>
              <option value="UPDATE_NAVIGATION">Update Navigation</option>
              <option value="DELETE_NAVIGATION">Delete Navigation</option>
            </select>

            <select
              value={filters.resourceType}
              onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              className="px-4 py-2 bg-muted rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Resources</option>
              <option value="exam">Exam</option>
              <option value="user">User</option>
              <option value="navigation">Navigation</option>
              <option value="blog">Blog</option>
            </select>

            <button
              onClick={applyFilters}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Apply
            </button>

            <button
              onClick={resetFilters}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="px-3 py-1.5 bg-muted rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="px-3 py-1.5 bg-muted rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={exportLogs}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground">No logs found</p>
                <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-11 w-11 border border-border/50 shadow-sm">
                      {log.user_avatar_url ? (
                        <AvatarImage src={log.user_avatar_url} alt={log.user_email} />
                      ) : (
                        <AvatarFallback>{log.user_email.charAt(0).toUpperCase()}</AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-1">User</p>
                        <p className="text-sm text-muted-foreground">{log.user_email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full capitalize">
                            {log.user_role}
                          </span>
                          <div className={`px-3 py-1 rounded-full text-[11px] font-semibold ${getActionColor(log.action)}`}>
                            {formatAction(log.action)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Resource</p>
                        {log.resource_type ? (
                          <>
                            <p className="text-sm text-muted-foreground capitalize">{log.resource_type}</p>
                            {log.resource_id && (
                              <p className="text-xs text-muted-foreground mt-1">ID: {log.resource_id}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">N/A</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Details</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </p>
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground mt-1">IP: {log.ip_address}</p>
                        )}
                        {(() => {
                          const method = getDetailString(log.details, 'method');
                          const path = getDetailString(log.details, 'path');
                          if (!method || !path) return null;
                          return (
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              {method} {path}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    if (!log.details || Object.keys(log.details).length === 0) {
                      return null;
                    }

                    return (
                      <details className="mt-3 pt-3 border-t">
                        <summary className="text-xs font-medium cursor-pointer hover:text-primary">
                          View Full Details
                        </summary>
                        {(() => {
                          const method = getDetailString(log.details, 'method');
                          const path = getDetailString(log.details, 'path');
                          const success = getBooleanDetail(log.details, 'success');
                          const body = getObjectDetail(log.details, 'body');
                          const params = getObjectDetail(log.details, 'params');
                          const query = getObjectDetail(log.details, 'query');

                          if (!method && !path && success === undefined && !body && !params && !query) {
                            return (
                              <p className="mt-3 text-xs text-muted-foreground">
                                No additional details available for this entry.
                              </p>
                            );
                          }

                          return (
                            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                              {method && path && (
                                <div>
                                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Request</p>
                                  <p className="mt-1 font-mono text-xs">
                                    {method} {path}
                                  </p>
                                </div>
                              )}

                              {success !== undefined && (
                                <div>
                                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Result</p>
                                  <p className="mt-1">
                                    {success
                                      ? 'Action completed successfully'
                                      : 'Action failed or was rolled back'}
                                  </p>
                                </div>
                              )}

                              {renderKeyValueSection('Sent Fields', body)}
                              {renderKeyValueSection('Route Params', params)}
                              {renderKeyValueSection('Query Params', query)}
                            </div>
                          );
                        })()}
                      </details>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border-t px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              {itemsPerPage * (currentPage - 1) + 1}-{Math.min(itemsPerPage * currentPage, total)} of {total}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
