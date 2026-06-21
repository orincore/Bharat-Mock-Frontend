"use client";

import { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordStrength } from '@/components/common/PasswordStrength';
import { authService } from '@/lib/api/authService';
import { cn } from '@/lib/utils';
import { isStrongPassword, validateConfirmPassword } from '@/lib/validation';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ChangePasswordDialog({ open, onClose, onSuccess }: ChangePasswordDialogProps) {
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      // Reset everything when the dialog closes.
      setStep('password');
      setNewPassword('');
      setConfirmPassword('');
      setShowNew(false);
      setShowConfirm(false);
      setFieldErrors({});
      setOtp(['', '', '', '', '', '']);
      setMaskedEmail('');
      setError('');
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      setResendCooldown(0);
    }
  }, [open]);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  if (!open) return null;

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const validatePasswordStep = () => {
    const errors: { password?: string; confirm?: string } = {};
    if (!isStrongPassword(newPassword)) errors.password = 'Password does not meet all the criteria below';
    const confirmErr = validateConfirmPassword(newPassword, confirmPassword);
    if (confirmErr) errors.confirm = confirmErr;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendOtp = async () => {
    if (!validatePasswordStep()) return;
    setIsLoading(true);
    setError('');
    try {
      const { email } = await authService.sendChangePasswordOtp();
      setMaskedEmail(email || '');
      setStep('otp');
      startCooldown();
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setError('');
    setOtp(['', '', '', '', '', '']);
    try {
      await authService.sendChangePasswordOtp();
      startCooldown();
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
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
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Enter the complete 6-digit code'); return; }
    setIsLoading(true);
    setError('');
    try {
      await authService.changePassword(code, newPassword);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            {step === 'otp' ? <ShieldCheck className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-primary" />}
            <h2 className="font-semibold text-foreground">
              {step === 'otp' ? 'Verify your email' : 'Change Password'}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {step === 'password' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
                    placeholder="Create a strong password"
                    className={cn('pl-10 pr-10', fieldErrors.password && 'border-destructive focus-visible:ring-destructive')}
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} aria-label={showNew ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.password}</p>}
                <PasswordStrength password={newPassword} hideWhenEmpty={false} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(prev => ({ ...prev, confirm: undefined })); }}
                    placeholder="Re-enter new password"
                    className={cn('pl-10 pr-10', fieldErrors.confirm && 'border-destructive focus-visible:ring-destructive')}
                    disabled={isLoading}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.confirm && <p className="mt-1.5 text-xs text-destructive">{fieldErrors.confirm}</p>}
              </div>

              <Button
                type="button"
                onClick={handleSendOtp}
                className="w-full"
                disabled={isLoading || !isStrongPassword(newPassword) || newPassword !== confirmPassword}
              >
                {isLoading ? 'Sending code...' : 'Send Verification Code'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Enter the 6-digit code we sent to{maskedEmail ? ' ' : ' your registered email'}
                {maskedEmail && <span className="font-medium text-foreground">{maskedEmail}</span>}
              </p>
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

              <Button type="button" onClick={handleSubmit} className="w-full" disabled={isLoading || otp.join('').length < 6}>
                {isLoading ? 'Changing password...' : 'Change Password'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setStep('password'); setOtp(['', '', '', '', '', '']); setError(''); }} className="text-muted-foreground hover:text-foreground">
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="flex items-center gap-1 text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
