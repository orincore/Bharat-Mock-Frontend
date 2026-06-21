"use client";

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPasswordRuleResults, getPasswordStrength } from '@/lib/validation';

interface PasswordStrengthProps {
  password: string;
  /** Hide the checklist until the user has started typing. Default true. */
  hideWhenEmpty?: boolean;
  className?: string;
}

const BAR_COLORS = ['bg-muted', 'bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
const LABEL_COLORS = ['text-muted-foreground', 'text-destructive', 'text-orange-500', 'text-yellow-600', 'text-green-600'];

/**
 * Live password-criteria checklist + strength meter. Each rule flips to a green
 * check the moment the typed password satisfies it.
 */
export function PasswordStrength({ password, hideWhenEmpty = true, className }: PasswordStrengthProps) {
  const rules = getPasswordRuleResults(password);
  const { score, label } = getPasswordStrength(password);

  if (hideWhenEmpty && password.length === 0) return null;

  return (
    <div className={cn('mt-3 space-y-3', className)} aria-live="polite">
      {/* Strength meter */}
      <div className="space-y-1.5">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((segment) => (
            <div
              key={segment}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                segment <= score ? BAR_COLORS[score] : 'bg-muted',
              )}
            />
          ))}
        </div>
        {label && (
          <p className={cn('text-xs font-medium', LABEL_COLORS[score])}>
            Password strength: {label}
          </p>
        )}
      </div>

      {/* Criteria checklist */}
      <ul className="space-y-1.5">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors',
              rule.passed ? 'text-green-600' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors',
                rule.passed ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground',
              )}
            >
              {rule.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </span>
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
