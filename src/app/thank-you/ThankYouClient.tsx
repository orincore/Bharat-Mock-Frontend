"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { subscriptionService } from '@/lib/api/subscriptionService';
import { SOCIAL_LINKS } from '@/components/common/Footer';
import { CheckCircle2, Crown, Loader2, PartyPopper, ArrowRight, Users } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/D0HOXweLYUUL4VboIYoA1R';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

interface MySubscription {
  id: string;
  status: string;
  expires_at: string | null;
  plan: { id: string; name: string } | null;
}

export default function ThankYouClient() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/thank-you');
      return;
    }
    subscriptionService.getMySubscription()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setSubLoading(false));
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || subLoading || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const hasActiveSubscription = Boolean(user?.is_premium && (subscription?.plan || user?.subscription_plan));
  const planName = subscription?.plan?.name || user?.subscription_plan?.name || null;
  // A premium grant with no expiry (e.g. a complimentary/lifetime access grant made
  // from the admin panel) has no date to show — say so explicitly rather than a bare
  // "—", which reads as broken rather than intentional.
  const rawExpiry = subscription?.expires_at || user?.subscription_expires_at || null;
  const expiresAt = rawExpiry ? formatDate(rawExpiry) : (hasActiveSubscription ? 'No expiry' : null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background py-10 sm:py-14">
      <div className="container-main max-w-4xl space-y-8 sm:space-y-10">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
            {hasActiveSubscription ? (
              <CheckCircle2 className="h-9 w-9 sm:h-11 sm:w-11" />
            ) : (
              <PartyPopper className="h-9 w-9 sm:h-11 sm:w-11" />
            )}
          </div>
          <div className="space-y-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {hasActiveSubscription ? 'Payment Successful' : 'Welcome'}
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
              {hasActiveSubscription ? `Thank You, ${user?.name?.split(' ')[0] || 'there'}!` : `Hi ${user?.name?.split(' ')[0] || 'there'}, welcome to BharatMock`}
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              {hasActiveSubscription
                ? 'Your subscription is now active. You have full access to premium mock tests, analytics, and more.'
                : "You don't have an active subscription yet — browse our plans to unlock premium mock tests and analytics."}
            </p>
          </div>
        </div>

        {/* Subscription summary */}
        <Card className="border-primary/40 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Your Subscription
            </CardTitle>
            <CardDescription>
              {hasActiveSubscription ? 'Here are your current plan details.' : 'No active plan on your account right now.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasActiveSubscription ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground">{planName}</h2>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
                    <Crown className="h-3.5 w-3.5 mr-1" /> Premium Active
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/80 p-4">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-medium mt-1">Active</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 p-4">
                    <p className="text-xs text-muted-foreground">Valid until</p>
                    <p className="text-sm font-medium mt-1">{expiresAt || '—'}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
                Upgrade to premium to unlock unlimited mock tests, detailed analytics, and priority support.
              </div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp premium group — highlighted CTA */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1fae52] to-[#0f8a3e] p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/20">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-6 text-center sm:text-left">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Users className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold">Join the Premium WhatsApp Group</h3>
              <p className="text-sm text-white/85 max-w-md">
                Get exam alerts, exclusive study material, and connect with fellow premium members — straight from WhatsApp.
              </p>
            </div>
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm sm:text-base font-semibold text-[#0f8a3e] shadow-lg transition-transform hover:scale-105 hover:shadow-xl whitespace-nowrap"
            >
              <FaWhatsapp className="h-5 w-5" />
              Join WhatsApp Group
            </a>
          </div>
        </div>

        {/* Social handles */}
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Follow us for updates</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                title={label}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild size="lg">
            <Link href="/mock-test-series">
              Explore Mock Tests <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={hasActiveSubscription ? '/subscriptions/manage' : '/subscriptions'}>
              {hasActiveSubscription ? 'Manage Subscription' : 'Browse Plans'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
