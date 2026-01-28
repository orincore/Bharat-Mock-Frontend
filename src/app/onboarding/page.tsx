"use client";

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Phone, Tag, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { taxonomyService, Category } from '@/lib/api/taxonomyService';
import { authService } from '@/lib/api/authService';
import { LoadingPage } from '@/components/common/LoadingStates';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    phone: '',
    date_of_birth: '',
    interested_categories: [] as string[],
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [shouldShowForm, setShouldShowForm] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);

  const countryOptions = [
    { label: 'India (+91)', value: '+91' },
    { label: 'United States (+1)', value: '+1' },
    { label: 'United Kingdom (+44)', value: '+44' },
    { label: 'United Arab Emirates (+971)', value: '+971' },
    { label: 'Singapore (+65)', value: '+65' },
    { label: 'Australia (+61)', value: '+61' }
  ];

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');
    
    if (token && refresh) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('refresh_token', refresh);
    }

    const initialize = async () => {
      try {
        const profile = await authService.getProfile();
        if (!profile) {
          router.replace('/login?error=auth_required');
          return;
        }

        const needsOnboarding =
          !profile.is_onboarded ||
          !profile.phone ||
          !profile.date_of_birth;

        if (!needsOnboarding) {
          router.replace('/');
          return;
        }

        if (profile.auth_provider === 'google' && !profile.password_hash) {
          setRequiresPassword(true);
        }

        if (profile.phone) {
          const phoneMatch = profile.phone.match(/^(\+\d{1,4})(\d+)$/);
          if (phoneMatch) {
            setCountryCode(phoneMatch[1]);
            setFormData(prev => ({
              ...prev,
              phone: phoneMatch[2]
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              phone: profile.phone.replace(/[^\d]/g, '')
            }));
          }
        }

        if (profile.date_of_birth) {
          setFormData(prev => ({
            ...prev,
            date_of_birth: profile.date_of_birth.split('T')[0]
          }));
        }

        setShouldShowForm(true);
      } catch (profileError) {
        console.error('Failed to load profile for onboarding:', profileError);
        router.replace('/login?error=auth_required');
      } finally {
        setIsCheckingEligibility(false);
      }
    };

    initialize();
    fetchCategories();
  }, [searchParams, router]);

  const fetchCategories = async () => {
    try {
      const cats = await taxonomyService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      interested_categories: prev.interested_categories.includes(categoryId)
        ? prev.interested_categories.filter(id => id !== categoryId)
        : [...prev.interested_categories, categoryId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.phone || !formData.date_of_birth || formData.interested_categories.length === 0) {
      setError('Please fill in all fields and select at least one category');
      return;
    }

    if (requiresPassword) {
      if (!formData.password || !formData.confirmPassword) {
        setError('Please set and confirm your password');
        return;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      const cleanedPhone = formData.phone.replace(/[^\d]/g, '');
      const payload = {
        ...formData,
        phone: `${countryCode}${cleanedPhone}`,
        password: requiresPassword ? formData.password : undefined
      };

      await authService.completeOnboarding(payload);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingEligibility) {
    return <LoadingPage message="Preparing your personalized setup..." />;
  }

  if (!shouldShowForm) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-card rounded-2xl border border-border shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Complete Your Profile
            </h1>
            <p className="text-muted-foreground">
              Help us personalize your learning experience
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Phone className="inline h-4 w-4 mr-2" />
                Phone Number *
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  className="w-full sm:w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  {countryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="tel"
                  placeholder="1234567890"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar className="inline h-4 w-4 mr-2" />
                Date of Birth *
              </label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                required
              />
            </div>

            {requiresPassword && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Lock className="inline h-4 w-4 mr-2" />
                    Create Password *
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter a strong password"
                    value={formData.password}
                    minLength={8}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Lock className="inline h-4 w-4 mr-2" />
                    Confirm Password *
                  </label>
                  <Input
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    minLength={8}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                <Tag className="inline h-4 w-4 mr-2" />
                Interested Categories * (Select at least one)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryToggle(category.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      formData.interested_categories.includes(category.id)
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border hover:border-primary/50 text-foreground'
                    }`}
                  >
                    <div className="font-medium">{category.name}</div>
                    {category.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {category.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Completing...' : 'Complete Profile'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingPage message="Preparing your personalized setup..." />}>
      <OnboardingContent />
    </Suspense>
  );
}
