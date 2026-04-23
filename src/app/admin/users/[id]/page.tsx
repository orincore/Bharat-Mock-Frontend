"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Calendar, Mail, Phone, Shield, Activity, Target,
  ListChecks, Pencil, X, Save, Crown, Bell, BellOff, CheckCircle2,
  Ban, ShieldCheck, AlertTriangle, Trash2, RotateCcw,
} from "lucide-react";
import { adminService, AdminUserDetails, SubscriptionPlan } from "@/lib/api/adminService";
import { LoadingSpinner } from "@/components/common/LoadingStates";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'author', label: 'Author' },
  { value: 'user', label: 'User' },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]['value'];

export default function AdminUserDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<AdminUserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [blockSaving, setBlockSaving] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReasonInput, setBlockReasonInput] = useState('');

  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [restoreSaving, setRestoreSaving] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', bio: '', is_verified: false, is_blocked: false, block_reason: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editingSubscription, setEditingSubscription] = useState(false);
  const [subForm, setSubForm] = useState({ plan_id: '', expires_at: '', is_premium: false, auto_renew: false, send_notification: true });
  const [subSaving, setSubSaving] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [subSuccess, setSubSuccess] = useState(false);

  const userId = params?.id;

  const loadDetails = async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminService.getUserDetails(userId);
      setData(result);
      const u = result.user;
      setProfileForm({
        name: u.name || '',
        phone: u.phone || '',
        bio: u.bio || '',
        is_verified: u.is_verified || false,
        is_blocked: u.is_blocked || false,
        block_reason: u.block_reason || '',
      });
      setSubForm({
        plan_id: u.subscription_plan_id || '',
        expires_at: u.subscription_expires_at ? u.subscription_expires_at.slice(0, 16) : '',
        is_premium: u.is_premium || false,
        auto_renew: u.subscription_auto_renew || false,
        send_notification: true,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load user details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDetails(); }, [userId]);

  useEffect(() => {
    adminService.getSubscriptionPlans()
      .then(setPlans)
      .catch(() => {});
  }, []);

  const handleToggleBlock = async () => {
    if (!userId || !data) return;
    const isCurrentlyBlocked = data.user.is_blocked;
    if (!isCurrentlyBlocked) {
      setBlockReasonInput('');
      setShowBlockModal(true);
      return;
    }
    setBlockSaving(true);
    setBlockError(null);
    try {
      await adminService.toggleUserBlock(userId);
      await loadDetails();
    } catch (err: any) {
      setBlockError(err?.message || 'Failed to update block status');
    } finally {
      setBlockSaving(false);
    }
  };

  const handleConfirmBlock = async () => {
    if (!userId) return;
    if (!blockReasonInput.trim()) return;
    setBlockSaving(true);
    setBlockError(null);
    try {
      await adminService.toggleUserBlock(userId, blockReasonInput.trim());
      setShowBlockModal(false);
      await loadDetails();
    } catch (err: any) {
      setBlockError(err?.message || 'Failed to block user');
    } finally {
      setBlockSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userId) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await adminService.deleteUser(userId);
      setShowDeleteModal(false);
      await loadDetails();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete user');
      setDeleteSaving(false);
    }
  };

  const handleRestoreUser = async () => {
    if (!userId) return;
    setRestoreSaving(true);
    setRestoreError(null);
    try {
      await adminService.restoreUser(userId);
      await loadDetails();
    } catch (err: any) {
      setRestoreError(err?.message || 'Failed to restore user');
    } finally {
      setRestoreSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      await adminService.updateUser(userId, {
        name: profileForm.name,
        phone: profileForm.phone || undefined,
        bio: profileForm.bio || undefined,
        is_verified: profileForm.is_verified,
        is_blocked: profileForm.is_blocked,
        block_reason: profileForm.is_blocked ? profileForm.block_reason : undefined,
      });
      setProfileSuccess(true);
      setEditingProfile(false);
      await loadDetails();
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update user');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveSubscription = async () => {
    if (!userId) return;
    setSubSaving(true);
    setSubError(null);
    setSubSuccess(false);
    try {
      await adminService.adminUpdateUserSubscription(userId, {
        plan_id: subForm.plan_id || null,
        expires_at: subForm.expires_at ? new Date(subForm.expires_at).toISOString() : null,
        is_premium: subForm.is_premium,
        auto_renew: subForm.auto_renew,
        send_notification: subForm.send_notification,
      });
      setSubSuccess(true);
      setEditingSubscription(false);
      await loadDetails();
      setTimeout(() => setSubSuccess(false), 3000);
    } catch (err: any) {
      setSubError(err?.message || 'Failed to update subscription');
    } finally {
      setSubSaving(false);
    }
  };

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
  const activePlan = plans.find(p => p.id === user.subscription_plan_id);

  return (
    <div className="space-y-8">
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-background border border-border rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Delete {user?.name}&apos;s account?</h2>
                <p className="text-xs text-muted-foreground">This will soft-delete the account. No data is removed from the database.</p>
              </div>
            </div>
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setShowDeleteModal(false); setDeleteError(null); }} disabled={deleteSaving}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={deleteSaving}
                className="gap-1"
              >
                {deleteSaving ? <LoadingSpinner /> : <Trash2 className="h-4 w-4" />}
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-background border border-border rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Block {user.name}?</h2>
                <p className="text-xs text-muted-foreground">This will immediately restrict all access for this user.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block-reason-input">Reason (shown to user)</Label>
              <Input
                id="block-reason-input"
                value={blockReasonInput}
                onChange={e => setBlockReasonInput(e.target.value)}
                placeholder="e.g. Violation of terms of service"
                autoFocus
              />
            </div>
            {blockError && (
              <p className="text-sm text-destructive">{blockError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setShowBlockModal(false); setBlockError(null); }} disabled={blockSaving}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmBlock}
                disabled={blockSaving || !blockReasonInput.trim()}
                className="gap-1"
              >
                {blockSaving ? <LoadingSpinner /> : <Ban className="h-4 w-4" />}
                Block User
              </Button>
            </div>
          </div>
        </div>
      )}

      <div>
        <Button variant="ghost" className="mb-4" asChild>
          <Link href="/admin/users" className="flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Users
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-bold text-foreground">User Details</h1>
        <p className="text-muted-foreground">View and edit this user's profile, subscription, and activity.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Profile</CardTitle>
            <div className="flex items-center gap-2">
              {!editingProfile && (
                <>
                  <Button
                    variant={user.is_blocked ? 'outline' : 'destructive'}
                    size="sm"
                    onClick={handleToggleBlock}
                    disabled={blockSaving}
                    className={`gap-1 ${user.is_blocked ? 'text-success border-success/30 hover:bg-success/10' : ''}`}
                  >
                    {blockSaving ? <LoadingSpinner /> : user.is_blocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    {user.is_blocked ? 'Unblock' : 'Block'}
                  </Button>
                  {user.deleted_at ? (
                    <>
                      {restoreError && <span className="text-xs text-destructive">{restoreError}</span>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRestoreUser}
                        disabled={restoreSaving}
                        className="gap-1 text-success border-success/30 hover:bg-success/10"
                      >
                        {restoreSaving ? <LoadingSpinner /> : <RotateCcw className="h-4 w-4" />}
                        Restore
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => { setDeleteError(null); setShowDeleteModal(true); }}
                      disabled={deleteSaving}
                      className="gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </>
              )}
              {!editingProfile ? (
                <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)} className="gap-1">
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditingProfile(false); setProfileError(null); }} disabled={profileSaving}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={profileSaving} className="gap-1">
                  {profileSaving ? <LoadingSpinner /> : <Save className="h-4 w-4" />} Save
                </Button>
              </div>
            )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-5">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg shrink-0">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={user.name || "User avatar"} />
                ) : null}
                <AvatarFallback className="text-2xl font-bold">
                  {user.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{user.role}</Badge>
                {user.is_verified && <Badge className="bg-success/10 text-success border-success/20">Verified</Badge>}
                {user.is_blocked && <Badge className="bg-destructive/10 text-destructive border-destructive/20">Blocked</Badge>}
                {user.deleted_at && <Badge className="bg-zinc-100 text-zinc-500 border-zinc-300"><Trash2 className="h-3 w-3 mr-1" />Deleted</Badge>}
                {user.is_premium && <Badge className="bg-amber-50 text-amber-600 border-amber-200"><Crown className="h-3 w-3 mr-1" />Premium</Badge>}
              </div>
            </div>

            {profileSuccess && (
              <div className="flex items-center gap-2 text-sm text-success bg-success/10 border border-success/20 rounded-lg px-4 py-2">
                <CheckCircle2 className="h-4 w-4" /> Profile updated successfully
              </div>
            )}
            {profileError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2">
                {profileError}
              </div>
            )}

            {editingProfile ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="Optional" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Optional" />
                </div>
                <div className="flex items-center gap-6 sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={profileForm.is_verified}
                      onChange={e => setProfileForm(p => ({ ...p, is_verified: e.target.checked }))}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-sm font-medium">Email Verified</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={profileForm.is_blocked}
                      onChange={e => setProfileForm(p => ({ ...p, is_blocked: e.target.checked }))}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-sm font-medium text-destructive">Blocked</span>
                  </label>
                </div>
                {profileForm.is_blocked && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="block_reason">Block Reason</Label>
                    <Input
                      id="block_reason"
                      value={profileForm.block_reason}
                      onChange={e => setProfileForm(p => ({ ...p, block_reason: e.target.value }))}
                      placeholder="Required when blocking"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" /> {user.email}
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" /> {user.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" /> Joined {new Date(user.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4 shrink-0" /> Auth: {user.auth_provider || "email"}
                </div>
                {user.bio && (
                  <p className="text-foreground">{user.bio}</p>
                )}
                {user.is_blocked && user.block_reason && (
                  <p className="text-destructive text-xs">Block reason: {user.block_reason}</p>
                )}
              </div>
            )}
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" /> Subscription
          </CardTitle>
          {!editingSubscription ? (
            <Button variant="outline" size="sm" onClick={() => setEditingSubscription(true)} className="gap-1">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingSubscription(false); setSubError(null); }} disabled={subSaving}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSaveSubscription} disabled={subSaving} className="gap-1">
                {subSaving ? <LoadingSpinner /> : <Save className="h-4 w-4" />} Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {subSuccess && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 border border-success/20 rounded-lg px-4 py-2">
              <CheckCircle2 className="h-4 w-4" /> Subscription updated successfully
            </div>
          )}
          {subError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2">
              {subError}
            </div>
          )}

          {editingSubscription ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plan_id">Subscription Plan</Label>
                <select
                  id="plan_id"
                  value={subForm.plan_id}
                  onChange={e => setSubForm(p => ({ ...p, plan_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— No Plan —</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.duration_days}d)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expires_at">Expires At</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={subForm.expires_at}
                  onChange={e => setSubForm(p => ({ ...p, expires_at: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-6 sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={subForm.is_premium}
                    onChange={e => setSubForm(p => ({ ...p, is_premium: e.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm font-medium">Premium Access</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={subForm.auto_renew}
                    onChange={e => setSubForm(p => ({ ...p, auto_renew: e.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm font-medium">Auto Renew</span>
                </label>
              </div>
              <div className="sm:col-span-2 border border-border rounded-lg p-4 bg-muted/30">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={subForm.send_notification}
                    onChange={e => setSubForm(p => ({ ...p, send_notification: e.target.checked }))}
                    className="h-4 w-4 rounded border-border mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {subForm.send_notification ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                      Send subscription activation email to user
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      If checked, the user will receive an email notifying them of the subscription change.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Plan</p>
                <p className="font-semibold">{activePlan?.name || (user.subscription_plan_id ? 'Unknown Plan' : 'No active plan')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Expires</p>
                <p className="font-semibold">
                  {user.subscription_expires_at
                    ? new Date(user.subscription_expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Premium</p>
                <p className={`font-semibold ${user.is_premium ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {user.is_premium ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Auto Renew</p>
                <p className="font-semibold">{user.subscription_auto_renew ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                      <p className="font-semibold">{new Date(result.created_at).toLocaleDateString()}</p>
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
