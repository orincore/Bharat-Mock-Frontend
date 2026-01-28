"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User as UserIcon, Mail, Phone, Calendar, GraduationCap, Save, Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import type { Education, User as UserType } from '@/types';
import { resultService } from '@/lib/api/resultService';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, updateProfile } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({ examsTaken: 0, daysActive: 0, avgScore: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    education: {
      level: '',
      institution: '',
      year: new Date().getFullYear(),
      percentage: 0
    }
  });

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
        date_of_birth: user.date_of_birth || '',
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
    }
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload: Partial<UserType> = {
        name: formData.name,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth || undefined,
        education: {
          id: user?.education?.id,
          user_id: user?.education?.user_id || user?.id || '',
          level: formData.education.level || undefined,
          institution: formData.education.institution || undefined,
          year: formData.education.year || undefined,
          percentage: formData.education.percentage || undefined,
        } as Education,
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

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
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
  };

  if (authLoading) {
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
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container-main">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              My Profile
            </h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences
            </p>
          </div>

          {/* Profile Card */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Avatar Section */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-8">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  {user?.avatar_url ? (
                    <AvatarImage src={user.avatar_url} alt={user?.name || 'User avatar'} />
                  ) : null}
                  <AvatarFallback className="text-3xl font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
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
                </div>
                <div className="ml-auto">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <Button onClick={handleCancel} variant="ghost">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="p-8">
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
                        disabled={!isEditing || isSaving}
                        required
                      />
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
                        disabled={!isEditing || isSaving}
                        placeholder="+91 9876543210"
                      />
                    </div>

                    <div>
                      <label htmlFor="date_of_birth" className="block text-sm font-medium text-foreground mb-2">
                        Date of Birth
                      </label>
                      <Input
                        id="date_of_birth"
                        name="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        disabled={!isEditing || isSaving}
                      />
                    </div>
                  </div>
                </div>

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
