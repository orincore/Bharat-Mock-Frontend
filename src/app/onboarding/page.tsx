"use client";

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/lib/api/authService';
import { LoadingPage } from '@/components/common/LoadingStates';
import { PasswordStrength } from '@/components/common/PasswordStrength';
import { cn } from '@/lib/utils';
import {
  validatePhone,
  validatePasswordStrength,
  validateConfirmPassword,
} from '@/lib/validation';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  type OnbField = 'phone' | 'password' | 'confirmPassword';
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OnbField, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [shouldShowForm, setShouldShowForm] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  // Set when arriving from Google OAuth as a brand-new signup whose account has NOT been
  // created yet. In this mode the account is created only on submit (no profile, no
  // login until complete details are provided).
  const [pendingToken, setPendingToken] = useState<string | null>(null);

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
    const pending = searchParams.get('pending');

    // Pre-registration mode: a brand-new Google signup with NO account yet. We only have
    // a short-lived onboarding token — there is no session to validate. Show the form
    // (password required, since the account is created here) and create the account on submit.
    if (pending) {
      setPendingToken(pending);
      setRequiresPassword(true);
      setShouldShowForm(true);
      setIsCheckingEligibility(false);
      return;
    }

    if (token && refresh) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('refresh_token', refresh);
      // Clear any stale cached user so AuthProvider fetches a fresh profile.
      localStorage.removeItem('auth_user');
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
          !profile.phone;

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
              phone: profile.phone!.replace(/[^\d]/g, '')
            }));
          }
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
  }, [searchParams, router]);

  const validateAll = () => {
    const errors: Partial<Record<OnbField, string>> = {};
    const phoneErr = validatePhone(formData.phone, countryCode);
    if (phoneErr) errors.phone = phoneErr;
    if (requiresPassword) {
      const pwErr = validatePasswordStrength(formData.password);
      if (pwErr) errors.password = pwErr;
      const confirmErr = validateConfirmPassword(formData.password, formData.confirmPassword);
      if (confirmErr) errors.confirmPassword = confirmErr;
    }
    setFieldErrors(errors);
    return errors;
  };

  // Live validity used only to enable/disable the submit button (no error side-effects).
  const isFormValid =
    !validatePhone(formData.phone, countryCode) &&
    (!requiresPassword ||
      (!validatePasswordStrength(formData.password) &&
        !validateConfirmPassword(formData.password, formData.confirmPassword)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors = validateAll();
    if (Object.keys(errors).length > 0) {
      setError('Please fix the highlighted fields before continuing');
      return;
    }

    setLoading(true);

    try {
      const cleanedPhone = formData.phone.replace(/[^\d]/g, '');
      const fullPhone = `${countryCode}${cleanedPhone}`;

      if (pendingToken) {
        // Brand-new Google signup: this call CREATES the account (with complete details)
        // and returns real login tokens. Until it succeeds, no profile exists and the
        // user cannot log in anywhere.
        await authService.completeGoogleRegistration({
          pendingToken,
          phone: fullPhone,
          password: formData.password
        });
      } else {
        await authService.completeOnboarding({
          phone: fullPhone,
          password: requiresPassword ? formData.password : undefined
        });
      }

      // Hard navigation (not router.push) so AuthProvider re-initializes and reads
      // the now-stored token, hydrating auth state. A plain SPA push leaves
      // AuthContext.user = null (it only reads tokens on mount), which made
      // auth-gated actions like "Start Exam" wrongly redirect to /login.
      window.location.assign('/');
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-start justify-center px-4 pt-6 pb-8 sm:pt-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1.5">
            Complete Your Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Just one quick step to get you started
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-xl p-6 sm:p-8">

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Phone className="inline h-4 w-4 mr-2" />
                Phone Number *
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  className="w-full sm:w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={countryCode}
                  onChange={(e) => {
                    setCountryCode(e.target.value);
                    setFieldErrors(prev => (prev.phone ? { ...prev, phone: undefined } : prev));
                  }}
                >
                  {countryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="9876543210"
                  value={formData.phone}
                  maxLength={10}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData(prev => ({ ...prev, phone: val }));
                    setFieldErrors(prev => (prev.phone ? { ...prev, phone: undefined } : prev));
                  }}
                  onBlur={() => setFieldErrors(prev => ({ ...prev, phone: validatePhone(formData.phone, countryCode) || undefined }))}
                  className={cn('flex-1', fieldErrors.phone && 'border-destructive focus-visible:ring-destructive')}
                  aria-invalid={!!fieldErrors.phone}
                  required
                />
              </div>
              {fieldErrors.phone && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.phone}</p>}
            </div>

            {requiresPassword && (
              <div className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Lock className="inline h-4 w-4 mr-2" />
                      Create Password *
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, password: e.target.value }));
                          setFieldErrors(prev => (prev.password ? { ...prev, password: undefined } : prev));
                        }}
                        onBlur={() => setFieldErrors(prev => ({ ...prev, password: validatePasswordStrength(formData.password) || undefined }))}
                        className={cn('pr-10', fieldErrors.password && 'border-destructive focus-visible:ring-destructive')}
                        aria-invalid={!!fieldErrors.password}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Lock className="inline h-4 w-4 mr-2" />
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
                          setFieldErrors(prev => (prev.confirmPassword ? { ...prev, confirmPassword: undefined } : prev));
                        }}
                        onBlur={() => setFieldErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(formData.password, formData.confirmPassword) || undefined }))}
                        className={cn('pr-10', fieldErrors.confirmPassword && 'border-destructive focus-visible:ring-destructive')}
                        aria-invalid={!!fieldErrors.confirmPassword}
                        required
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
                    {!fieldErrors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
                      <p className="mt-1.5 text-xs text-green-600">Passwords match</p>
                    )}
                  </div>
                </div>
                <PasswordStrength password={formData.password} hideWhenEmpty={false} />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !isFormValid}
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
