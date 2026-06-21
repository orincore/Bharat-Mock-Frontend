"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Mail, Phone, Calendar, GraduationCap, Save, Edit2, X, Crown, FileText, Trash2, AlertTriangle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { ChangePasswordDialog } from '@/components/common/ChangePasswordDialog';
import type { Education, User as UserType } from '@/types';
import { resultService } from '@/lib/api/resultService';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { validateName, validatePhoneInternational } from '@/lib/validation';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, updateProfile, refreshProfile, deleteAccount } = useAuth();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [stats, setStats] = useState({ examsTaken: 0, daysActive: 0, avgScore: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Always fetch fresh profile so bio and other fields are up-to-date
    refreshProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDateLabel = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? null
      : date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
  };
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    education: {
      level: '',
      institution: '',
      year: new Date().getFullYear(),
      percentage: 0
    }
  });

  const canEditBio = ['admin', 'editor', 'author'].includes(user?.role || '');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        education: {
          level: user.education?.level || '',
          institution: user.education?.institution || '',
          year: user.education?.year || new Date().getFullYear(),
          percentage: user.education?.percentage || 0
        }
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!isAuthenticated) return;
      setIsStatsLoading(true);
      setStatsError('');

      try {
        const data = await resultService.getUserStats();
        setStats(data);
      } catch (err: any) {
        console.error('Failed to load stats:', err);
        setStatsError(err.message || 'Unable to load exam statistics');
      } finally {
        setIsStatsLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('education.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        education: {
          ...prev.education,
          [field]: field === 'year' || field === 'percentage' ? Number(value) : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      if (name === 'name' || name === 'phone') {
        setFieldErrors(prev => (prev[name as 'name' | 'phone'] ? { ...prev, [name]: undefined } : prev));
      }
    }
    setError('');
    setSuccess('');
  };

  const validateFields = () => {
    const errors: { name?: string; phone?: string } = {};
    const nameErr = validateName(formData.name);
    if (nameErr) errors.name = nameErr;
    const phoneErr = validatePhoneInternational(formData.phone);
    if (phoneErr) errors.phone = phoneErr;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFields()) {
      setError('Please fix the highlighted fields before saving');
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload: Partial<UserType> & { bio?: string } = {
        name: formData.name,
        phone: formData.phone,
        education: {
          id: user?.education?.id,
          user_id: user?.education?.user_id || user?.id || '',
          level: formData.education.level || undefined,
          institution: formData.education.institution || undefined,
          year: formData.education.year || undefined,
          percentage: formData.education.percentage || undefined,
        } as Education,
        ...(canEditBio && { bio: formData.bio }),
      };

      await updateProfile(payload);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        education: {
          level: user.education?.level || '',
          institution: user.education?.institution || '',
          year: user.education?.year || new Date().getFullYear(),
          percentage: user.education?.percentage || 0
        }
      });
    }
    setIsEditing(false);
    setError('');
    setSuccess('');
    setFieldErrors({});
  };

  if (!mounted || authLoading) {
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
    <div className="min-h-screen bg-muted/30 py-8 sm:py-12">
      <ChangePasswordDialog
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => {
          setSuccess('Password changed successfully!');
          setTimeout(() => setSuccess(''), 3000);
        }}
      />
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-background border border-border rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Delete your account?</h2>
                <p className="text-xs text-muted-foreground">This will permanently delete your account. You cannot undo this.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm</p>
              <Input
                value={deleteConfirmInput}
                onChange={e => setDeleteConfirmInput(e.target.value)}
                placeholder="DELETE"
                autoFocus
              />
            </div>
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmInput !== 'DELETE'}
                className="gap-1"
              >
                {isDeleting ? <LoadingSpinner /> : <Trash2 className="h-4 w-4" />}
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="container-main">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
              My Profile
            </h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences
            </p>
          </div>

          {/* Profile Card */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Avatar Section */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5 sm:p-8">
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-4 sm:gap-6">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-white shadow-lg shrink-0">
                  {user?.avatar_url ? (
                    <AvatarImage src={user.avatar_url} alt={user?.name || 'User avatar'} />
                  ) : null}
                  <AvatarFallback className="text-3xl font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {user?.name}
                  </h2>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Member since{' '}
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'Not available'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                    <Badge
                      variant={user?.is_premium ? 'default' : 'secondary'}
                      className={user?.is_premium ? 'bg-amber-500/10 text-amber-600 border-amber-200' : ''}
                    >
                      <Crown className="h-3.5 w-3.5 mr-1" />
                      {user?.is_premium ? 'Premium Member' : 'Free Account'}
                    </Badge>
                    {user?.is_premium ? (
                      <p className="text-sm text-muted-foreground">
                        {user?.subscription_plan?.name || 'Active plan'}
                        {user?.subscription_expires_at
                          ? ` • Expires ${formatDateLabel(user.subscription_expires_at)}`
                          : ''}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Unlock unlimited mock tests and analytics by upgrading to premium.
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
                    {!user?.is_premium ? (
                      <Button asChild size="sm" className="bg-primary text-primary-foreground">
                        <Link href="/subscriptions">Upgrade Plan</Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link href="/subscriptions/manage">Manage Plan</Link>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/subscriptions">View Benefits</Link>
                    </Button>
                  </div>
                </div>
                <div className="w-full sm:w-auto sm:ml-auto">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full sm:w-auto">
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <Button onClick={handleCancel} variant="ghost" className="w-full sm:w-auto">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="p-5 sm:p-8">
              {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-success text-sm">{success}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary" />
                    Personal Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                        Full Name
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={() => setFieldErrors(prev => ({ ...prev, name: validateName(formData.name) || undefined }))}
                        disabled={!isEditing || isSaving}
                        className={cn(fieldErrors.name && 'border-destructive focus-visible:ring-destructive')}
                        aria-invalid={!!fieldErrors.name}
                        required
                      />
                      {fieldErrors.name && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.name}</p>}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                        Email Address
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        disabled={true}
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Email cannot be changed
                      </p>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                        Phone Number
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={() => setFieldErrors(prev => ({ ...prev, phone: validatePhoneInternational(formData.phone) || undefined }))}
                        disabled={!isEditing || isSaving}
                        placeholder="+91 9876543210"
                        className={cn(fieldErrors.phone && 'border-destructive focus-visible:ring-destructive')}
                        aria-invalid={!!fieldErrors.phone}
                      />
                      {fieldErrors.phone && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.phone}</p>}
                    </div>
                  </div>
                </div>

                {/* Bio — only for admin/editor/author */}
                {canEditBio && (
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Bio
                    </h3>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      value={formData.bio}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, bio: e.target.value }));
                        setError('');
                        setSuccess('');
                      }}
                      disabled={!isEditing || isSaving}
                      placeholder="Write a short bio about yourself..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>
                )}

                {/* Education Information */}
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Education Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="education.level" className="block text-sm font-medium text-foreground mb-2">
                        Education Level
                      </label>
                      <Input
                        id="education.level"
                        name="education.level"
                        type="text"
                        value={formData.education.level}
                        onChange={handleChange}
                        disabled={!isEditing || isSaving}
                        placeholder="e.g., 12th Pass, Graduate"
                      />
                    </div>

                    <div>
                      <label htmlFor="education.institution" className="block text-sm font-medium text-foreground mb-2">
                        Institution Name
                      </label>
                      <Input
                        id="education.institution"
                        name="education.institution"
                        type="text"
                        value={formData.education.institution}
                        onChange={handleChange}
                        disabled={!isEditing || isSaving}
                        placeholder="e.g., Delhi Public School"
                      />
                    </div>

                    <div>
                      <label htmlFor="education.year" className="block text-sm font-medium text-foreground mb-2">
                        Year of Completion
                      </label>
                      <Input
                        id="education.year"
                        name="education.year"
                        type="number"
                        value={formData.education.year}
                        onChange={handleChange}
                        disabled={!isEditing || isSaving}
                        min="1950"
                        max="2030"
                      />
                    </div>

                    <div>
                      <label htmlFor="education.percentage" className="block text-sm font-medium text-foreground mb-2">
                        Percentage/CGPA
                      </label>
                      <Input
                        id="education.percentage"
                        name="education.percentage"
                        type="number"
                        value={formData.education.percentage}
                        onChange={handleChange}
                        disabled={!isEditing || isSaving}
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="e.g., 85.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                {isEditing && (
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Security */}
          <div className="mt-8 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Password
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Change your password. We&apos;ll email a verification code to confirm it&apos;s you.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto shrink-0"
                onClick={() => setShowChangePassword(true)}
              >
                Change Password
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-8 bg-card rounded-xl border border-destructive/30 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  Delete Account
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete your account. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full sm:w-auto shrink-0"
                onClick={() => { setDeleteConfirmInput(''); setDeleteError(''); setShowDeleteModal(true); }}
              >
                Delete Account
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {isStatsLoading ? '—' : stats.examsTaken}
                  </p>
                  <p className="text-sm text-muted-foreground">Exams Taken</p>
                </div>
              </div>
              {statsError && (
                <p className="text-xs text-destructive">{statsError}</p>
              )}
            </div>

            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {isStatsLoading ? '—' : stats.daysActive}
                  </p>
                  <p className="text-sm text-muted-foreground">Days Active</p>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {isStatsLoading ? '—' : `${stats.avgScore}%`}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Score</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
