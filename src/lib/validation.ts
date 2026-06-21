// Shared client-side form validation helpers for auth & onboarding forms.
// Keep these rules in sync with the backend so the UX never promises something
// the API will reject.

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

// Criteria for a "strong" password (used when creating/setting a password:
// registration & onboarding). Login does NOT enforce these — existing users may
// have older/weaker passwords.
export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A–Z)', test: (v) => /[A-Z]/.test(v) },
  { id: 'lowercase', label: 'One lowercase letter (a–z)', test: (v) => /[a-z]/.test(v) },
  { id: 'number', label: 'One number (0–9)', test: (v) => /[0-9]/.test(v) },
  { id: 'special', label: 'One special character (!@#$…)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function getPasswordRuleResults(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));
}

export function isStrongPassword(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/** 0–4 score used to render the strength bar. */
export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  satisfied: number;
  total: number;
} {
  const satisfied = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  const total = PASSWORD_RULES.length;
  // Map satisfied-count (0–5) to a 0–4 visual score.
  let score = 0;
  if (password.length === 0) score = 0;
  else if (satisfied <= 2) score = 1;
  else if (satisfied === 3) score = 2;
  else if (satisfied === 4) score = 3;
  else score = 4;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] || '', satisfied, total };
}

// ── Field-level validators ────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Email address is required';
  if (value.length > 254) return 'Email address is too long';
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address (e.g. you@example.com)';
  return null;
}

export function validateName(name: string): string | null {
  const value = name.trim();
  if (!value) return 'Full name is required';
  if (value.length < 2) return 'Name must be at least 2 characters';
  if (value.length > 60) return 'Name must be under 60 characters';
  if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(value)) {
    return 'Name can only contain letters, spaces, apostrophes, hyphens and periods';
  }
  return null;
}

/**
 * Validate the local (digits-only) phone number. India (+91) expects exactly 10
 * digits starting 6–9; other countries get a looser 7–15 digit length check.
 */
export function validatePhone(phone: string, countryCode = '+91'): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return 'Phone number is required';
  if (countryCode === '+91') {
    if (digits.length !== 10) return 'Enter a valid 10-digit mobile number';
    if (!/^[6-9]/.test(digits)) return 'Indian mobile numbers start with 6, 7, 8 or 9';
    return null;
  }
  if (digits.length < 7 || digits.length > 15) return 'Enter a valid phone number';
  return null;
}

/**
 * Validate a full phone number that may already include a country code and an
 * optional leading "+" (as stored on the profile). Empty is allowed — callers
 * decide whether the field is required.
 */
export function validatePhoneInternational(phone: string, { required = false } = {}): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return required ? 'Phone number is required' : null;
  if (!/^\+?[0-9\s-]+$/.test(trimmed)) return 'Phone number can only contain digits, spaces and a leading +';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return 'Enter a valid phone number';
  return null;
}

export function validatePasswordStrength(password: string): string | null {
  if (!password) return 'Password is required';
  if (!isStrongPassword(password)) return 'Password does not meet all the criteria below';
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

/**
 * Validate a date of birth (YYYY-MM-DD). Enforces a plausible age range so typos
 * like a future date or year 1900 are caught.
 */
export function validateDateOfBirth(dob: string): string | null {
  if (!dob) return 'Date of birth is required';
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return 'Enter a valid date';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return 'Date of birth cannot be in the future';

  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;

  if (age < 10) return 'You must be at least 10 years old';
  if (age > 100) return 'Enter a valid date of birth';
  return null;
}
