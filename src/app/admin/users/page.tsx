"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Ban, CheckCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { adminService } from '@/lib/api/adminService';
import { User } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'author', label: 'Author' },
  { value: 'user', label: 'User' }
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]['value'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const roleFilterOptions = useMemo(() => [{ value: '', label: 'All Roles' }, ...ROLE_OPTIONS], []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllUsers(page, limit, search, roleFilter);
      setUsers(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: RoleValue) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    try {
      await adminService.updateUserRole(userId, newRole);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  const handleToggleBlock = async (user: User) => {
    try {
      let reason: string | undefined;
      if (!user.is_blocked) {
        reason = prompt('Enter the suspension reason to show the user:') || '';
        if (!reason.trim()) {
          alert('Block reason is required. Suspension aborted.');
          return;
        }
      }

      await adminService.toggleUserBlock(user.id, reason);
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user block:', error);
      alert('Failed to update user status. Please try again.');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Breadcrumbs 
          items={[
            AdminBreadcrumb(),
            { label: 'Users' }
          ]}
          className="mb-3"
        />
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Manage Users
        </h1>
        <p className="text-muted-foreground">
          View and manage all platform users
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {roleFilterOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoadingSpinner />
              <span>Refreshing user list...</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Joined</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {user.avatar_url ? (
                            <AvatarImage src={user.avatar_url} alt={user.name || 'User avatar'} />
                          ) : null}
                          <AvatarFallback className="font-semibold">
                            {user.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          {user.is_verified && (
                            <span className="text-xs text-success flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {user.phone || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as RoleValue)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                          user.role === 'admin'
                            ? 'bg-secondary/10 text-secondary border-secondary/20'
                            : user.role === 'editor'
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : user.role === 'author'
                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }`}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        user.is_blocked 
                          ? 'bg-destructive/10 text-destructive' 
                          : 'bg-success/10 text-success'
                      }`}>
                        {user.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                      {user.is_blocked && user.block_reason && (
                        <p className="mt-1 text-xs text-destructive">Reason: {user.block_reason}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/admin/users/${user.id}`} className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleBlock(user)}
                          className={user.is_blocked ? 'text-success hover:text-success' : 'text-destructive hover:text-destructive'}
                        >
                          {user.is_blocked ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Unblock
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4 mr-1" />
                              Block
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} users
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
