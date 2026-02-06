"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { subscriptionService } from '@/lib/api/subscriptionService';
import { AlertTriangle, Loader2, ShieldCheck, Crown, Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const perks = [
  'Unlimited premium mock tests',
  'Detailed analytics & insights',
  'Priority doubt resolution',
  'Early access to new exam content'
];

export default function ManageSubscriptionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading, refreshProfile } = useAuth();

  const [autoRenew, setAutoRenew] = useState(user?.subscription_auto_renew ?? false);
  const [toggling, setToggling] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<{ open: boolean; nextValue: boolean }>({ open: false, nextValue: false });
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    setConfirmToggle((prev) => ({ ...prev, open: false }));
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login?redirect=/subscriptions/manage');
      } else {
        setAutoRenew(Boolean(user?.subscription_auto_renew));
      }
    }
  }, [isAuthenticated, isLoading, router, user?.subscription_auto_renew]);

  const hasActiveSubscription = Boolean(user?.is_premium && user?.subscription_plan);
  const planName = user?.subscription_plan?.name || 'No active plan';
  const expiresAt = user?.subscription_expires_at ? formatDate(user.subscription_expires_at) : '—';

  const performToggle = async (checked: boolean) => {
    if (!hasActiveSubscription) {
      toast({
        title: 'No active subscription',
        description: 'Purchase a plan before changing auto renew.',
        variant: 'destructive'
      });
      return;
    }

    setToggling(true);
    try {
      await subscriptionService.toggleAutoRenew(checked);
      setAutoRenew(checked);
      toast({
        title: `Auto renew ${checked ? 'enabled' : 'disabled'}`,
        description: checked
          ? 'We will renew your plan automatically before it expires.'
          : 'Auto renew is off. You can manually renew before expiry.'
      });
    } catch (error: any) {
      console.error('Auto renew toggle failed', error);
      toast({
        title: 'Failed to update auto renew',
        description: error.message || 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setToggling(false);
      setConfirmToggle({ open: false, nextValue: false });
    }
  };

  const handleToggle = (checked: boolean) => {
    if (!hasActiveSubscription) {
      toast({
        title: 'No active subscription',
        description: 'Purchase a plan before changing auto renew.',
        variant: 'destructive'
      });
      return;
    }

    setConfirmToggle({ open: true, nextValue: checked });
  };

  const handleCancelSubscription = async () => {
    if (!hasActiveSubscription) {
      toast({ title: 'No active subscription', description: 'Nothing to cancel.', variant: 'destructive' });
      return;
    }

    setToggling(true);
    try {
      await subscriptionService.cancelSubscription();
      setConfirmCancelOpen(false);
      setAutoRenew(false);
      await refreshProfile();
      toast({ title: 'Subscription cancelled', description: 'Premium access has been revoked.' });
      router.refresh();
    } catch (error: any) {
      console.error('Cancel subscription failed', error);
      toast({
        title: 'Failed to cancel subscription',
        description: error.message || 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setToggling(false);
    }
  };

  const renderPlanBadge = useMemo(() => {
    if (!hasActiveSubscription) {
      return (
        <Badge variant="secondary" className="text-sm">
          Free Account
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 text-sm">
        <Crown className="h-3.5 w-3.5 mr-1" /> Premium Active
      </Badge>
    );
  }, [hasActiveSubscription]);

  if (isLoading || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container-main space-y-8">
        <div className="space-y-2 text-center">
          <Badge className="bg-primary/10 text-primary border-primary/20">Subscription Management</Badge>
          <h1 className="font-display text-4xl font-bold text-foreground">
            Manage your Premium Access
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            View your current plan, monitor renewal dates, and control auto renew in one place.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your active subscription details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-foreground">{planName}</h2>
                {renderPlanBadge}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/80 p-4">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-medium mt-1">
                    {hasActiveSubscription ? 'Active' : 'No active subscription'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 p-4">
                  <p className="text-xs text-muted-foreground">Expires on</p>
                  <p className="text-sm font-medium mt-1">{expiresAt}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto renew</p>
                  <p className="text-xs text-muted-foreground">
                    Keep premium active without interruption. You can toggle this anytime.
                  </p>
                </div>
                <Switch
                  checked={autoRenew}
                  onCheckedChange={handleToggle}
                  disabled={toggling || !hasActiveSubscription}
                />
              </div>

              {!hasActiveSubscription && (
                <div className="rounded-xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
                  Upgrade to premium to unlock detailed analytics, unlimited mock tests, and more.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3">
              {hasActiveSubscription ? (
                <Button asChild>
                  <Link href="/subscriptions">Upgrade or Change Plan</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/subscriptions">Browse Plans</Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/profile">Back to Profile</Link>
              </Button>
              {hasActiveSubscription && (
                <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={toggling}>
                      Cancel Subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will revoke premium access immediately. You can resubscribe anytime, but current plan benefits will end once cancelled.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={toggling}>Go Back</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelSubscription}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={toggling}
                      >
                        Yes, Cancel
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why stay premium?</CardTitle>
              <CardDescription>Benefits that keep you ahead.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {perks.map((perk) => (
                <div key={perk} className="flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-primary mt-1" />
                  <p className="text-sm text-muted-foreground">{perk}</p>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <div className="rounded-2xl border border-border/80 p-4 bg-card/60">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Tip
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Auto renew ensures premium analytics and test archives stay available even on exam day.
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmToggle.open} onOpenChange={(open) => setConfirmToggle((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle.nextValue ? 'Enable auto renew?' : 'Disable auto renew?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle.nextValue
                ? 'Your plan will renew automatically before expiry. You can turn this off anytime.'
                : 'Premium will not renew automatically. Make sure to resubscribe before expiry to avoid losing benefits.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>Keep Current Setting</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => performToggle(confirmToggle.nextValue)}
              disabled={toggling}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
