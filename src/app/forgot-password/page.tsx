"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, ShieldCheck, Lock, Eye, EyeOff, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  // Auto-focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
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

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setError('');
    setOtp(['', '', '', '', '', '']);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to resend OTP'); return; }
      startCooldown();
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setError('Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP input handlers
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

  // Step 2: verify OTP (just move to password step — actual reset happens with token)
  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Enter the complete 6-digit code'); return; }
    // We don't have a separate verify endpoint for password reset OTP —
    // the token is verified during reset. Move to password step directly.
    setStep('password');
    setError('');
  };

  // Step 3: reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: otp.join(''), newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        // If token is invalid/expired, go back to OTP step
        if (res.status === 400) {
          setOtp(['', '', '', '', '', '']);
          setStep('otp');
          setError(data.message || 'Invalid or expired code. Please try again.');
          return;
        }
        setError(data.message || 'Failed to reset password');
        return;
      }
      setStep('done');
    } catch {
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const stepIcon = {
    email: <Mail className="h-8 w-8 text-primary" />,
    otp: <ShieldCheck className="h-8 w-8 text-primary" />,
    password: <Lock className="h-8 w-8 text-primary" />,
    done: <CheckCircle className="h-8 w-8 text-green-500" />,
  };

  const stepTitle = {
    email: 'Forgot Password?',
    otp: 'Check your email',
    password: 'Set new password',
    done: 'Password updated',
  };

  const stepSubtitle = {
    email: "Enter your email and we'll send you a reset code.",
    otp: `We sent a 6-digit code to ${email}`,
    password: 'Choose a strong new password.',
    done: 'Your password has been reset. You can now sign in.',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${step === 'done' ? 'bg-green-500/10' : 'bg-primary/10'}`}>
            {stepIcon[step]}
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground">{stepTitle[step]}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{stepSubtitle[step]}</p>
        </div>

        <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email" type="email" required
                    value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com" className="pl-10" disabled={isLoading}
                  />
                </div>
              </div>
              <Button type="submit" disabled={isLoading || !email} className="w-full" size="lg">
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full" type="button">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
                </Button>
              </Link>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
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
                      type="text" inputMode="numeric" maxLength={1}
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
                className="w-full" size="lg"
              >
                {isLoading ? 'Verifying...' : 'Continue'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(''); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isLoading}
                  className="flex items-center gap-1 text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: New password */}
          {step === 'password' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="newPassword" type={showPassword ? 'text' : 'password'}
                    minLength={8} required
                    value={newPassword} onChange={e => { setNewPassword(e.target.value); setError(''); }}
                    placeholder="At least 8 characters" className="pl-10 pr-10" disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword" type={showConfirm ? 'text' : 'password'}
                    minLength={8} required
                    value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Re-enter new password" className="pl-10 pr-10" disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                {isLoading ? 'Updating...' : 'Reset Password'}
              </Button>
              <button
                type="button"
                onClick={() => { setStep('otp'); setError(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
              >
                ← Back to code entry
              </button>
            </form>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="space-y-4">
              <Button className="w-full" size="lg" onClick={() => router.push('/login')}>
                Go to Login
              </Button>
            </div>
          )}
        </div>

        {step === 'email' && (
          <p className="text-center text-xs text-muted-foreground">
            Remember your password?{' '}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
