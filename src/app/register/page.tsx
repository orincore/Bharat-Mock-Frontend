"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Phone, Eye, EyeOff, UserPlus, ShieldCheck, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+1',  country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+1',  country: 'CA', flag: '🇨🇦', name: 'Canada' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974', country: 'QA', flag: '🇶🇦', name: 'Qatar' },
  { code: '+65',  country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+60',  country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+880', country: 'BD', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+92',  country: 'PK', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+94',  country: 'LK', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+977', country: 'NP', flag: '🇳🇵', name: 'Nepal' },
  { code: '+49',  country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+81',  country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+86',  country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+55',  country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+27',  country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/');
  }, [isAuthenticated, authLoading, router]);

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  // Close country dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
        setCountrySearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCountries = COUNTRY_CODES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.includes(countrySearch) ||
    c.country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) { setError('Name is required'); return false; }
    if (!/\S+@\S+\.\S+/.test(formData.email)) { setError('Enter a valid email address'); return false; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return false; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return false; }
    if (!acceptTerms) { setError('You must accept the Terms of Service and Privacy Policy'); return false; }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/send-registration-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, name: formData.name })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to send OTP'); return; }
      setStep('otp');
      startCooldown();
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setError('');
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Enter the complete 6-digit OTP'); return; }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/verify-registration-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: code })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Invalid OTP'); return; }
      // Proceed to register
      await handleRegister();
    } catch {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      await register(formData.email, formData.password, formData.name);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setError('');
    setOtp(['', '', '', '', '', '']);
    try {
      const res = await fetch(`${API}/auth/send-registration-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, name: formData.name })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to resend OTP'); return; }
      startCooldown();
    } catch {
      setError('Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmitForm = acceptTerms;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            {step === 'otp' ? <ShieldCheck className="h-8 w-8 text-primary" /> : <UserPlus className="h-8 w-8 text-primary" />}
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground">
            {step === 'otp' ? 'Verify your email' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === 'otp'
              ? `We sent a 6-digit code to ${formData.email}`
              : 'Join thousands of students preparing for success'}
          </p>
        </div>

        <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {step === 'form' ? (
            <div className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="name" name="name" type="text" required value={formData.name} onChange={handleChange} placeholder="John Doe" className="pl-10" disabled={isLoading} />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="you@example.com" className="pl-10" disabled={isLoading} />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                  Phone Number <span className="text-muted-foreground">(Optional)</span>
                </label>
                <div className="flex gap-2">
                  {/* Country code selector */}
                  <div className="relative" ref={countryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => { setShowCountryDropdown(v => !v); setCountrySearch(''); }}
                      disabled={isLoading}
                      className="flex items-center gap-1 h-10 px-3 border border-border rounded-md bg-background text-sm hover:bg-muted transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      <span>{countryCode.flag}</span>
                      <span className="text-muted-foreground">{countryCode.code}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    {showCountryDropdown && (
                      <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-border">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search country..."
                            value={countrySearch}
                            onChange={e => setCountrySearch(e.target.value)}
                            className="w-full text-sm px-2 py-1.5 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredCountries.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-3">No results</p>
                          ) : filteredCountries.map(c => (
                            <button
                              key={c.country}
                              type="button"
                              onClick={() => { setCountryCode(c); setShowCountryDropdown(false); setCountrySearch(''); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
                            >
                              <span>{c.flag}</span>
                              <span className="flex-1 truncate">{c.name}</span>
                              <span className="text-muted-foreground">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Phone number input */}
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="phone" name="phone" type="tel"
                      value={formData.phone}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData(prev => ({ ...prev, phone: val }));
                        setError('');
                      }}
                      placeholder="9876543210"
                      className="pl-10"
                      disabled={isLoading}
                      maxLength={10}
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={handleChange} placeholder="At least 6 characters" className="pl-10 pr-10" disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" className="pl-10 pr-10" disabled={isLoading} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input
                  id="accept-terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => { setAcceptTerms(e.target.checked); setError(''); }}
                  className="h-4 w-4 mt-1 text-primary focus:ring-primary border-border rounded"
                />
                <label htmlFor="accept-terms" className="text-sm text-muted-foreground">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
                </label>
              </div>

              <Button
                type="button"
                onClick={handleSendOtp}
                disabled={!canSubmitForm || isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Sending OTP...' : 'Continue'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-4 text-center">
                  Enter the 6-digit code
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      disabled={isLoading}
                      className="w-11 h-12 text-center text-xl font-bold border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                  ))}
                </div>
              </div>

              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.join('').length < 6}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Verifying...' : 'Create Account'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setStep('form'); setOtp(['', '', '', '', '', '']); setError(''); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="flex items-center gap-1 text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}

          {step === 'form' && (
            <div className="mt-6 space-y-4">
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="px-3 text-sm text-muted-foreground bg-card">Or continue with</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}>
                <Button variant="outline" className="w-full" size="lg">
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </a>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="px-3 text-sm text-muted-foreground bg-card">Already have an account?</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <Link href="/login">
                <Button variant="outline" className="w-full" size="lg">Sign In</Button>
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to receive updates and notifications about your exams and results.
        </p>
      </div>
    </div>
  );
}
