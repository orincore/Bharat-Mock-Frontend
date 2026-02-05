"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  subscriptionAdminService,
  SubscriptionPlan,
  Promocode,
  SubscriptionTransaction
} from '@/lib/api/subscriptionAdminService';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, RefreshCw, ShieldCheck } from 'lucide-react';

const defaultPlanForm = {
  name: '',
  slug: '',
  description: '',
  duration_days: 30,
  price_cents: 0,
  currency_code: 'INR',
  features: ''
};

const defaultPromoForm = {
  code: '',
  description: '',
  discount_type: 'percent' as 'percent' | 'fixed',
  discount_value: 10,
  max_redemptions: '',
  min_amount_cents: '',
  start_at: null as Date | null,
  end_at: null as Date | null,
  auto_renew_only: false,
  plan_ids: [] as string[]
};

const setDateAtMidnight = (date: Date | null) => {
  if (!date) return null;
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const formatDateLabel = (date: Date | null) => {
  if (!date) return 'Pick date';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const transactionStatuses = ['all', 'active', 'pending', 'expired', 'canceled'] as const;

const statusBadgeClasses: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200',
  canceled: 'bg-rose-100 text-rose-700 border-rose-200'
};

const formatCurrency = (amountCents: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency
    }).format(amountCents / 100);
  } catch {
    return `₹ ${(amountCents / 100).toFixed(2)}`;
  }
};

export default function AdminSubscriptionsPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({ ...defaultPlanForm });
  const [savingPlan, setSavingPlan] = useState(false);

  const [activePromoId, setActivePromoId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({ ...defaultPromoForm });
  const [savingPromo, setSavingPromo] = useState(false);

  const [transactions, setTransactions] = useState<SubscriptionTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionFilters, setTransactionFilters] = useState({ status: 'all', planId: '', search: '' });
  const [transactionSearchInput, setTransactionSearchInput] = useState('');

  const planOptions = useMemo(
    () => plans.map(plan => ({ label: plan.name, value: plan.id })),
    [plans]
  );

  const loadTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const data = await subscriptionAdminService.getTransactions({
        status: transactionFilters.status,
        planId: transactionFilters.planId || undefined,
        search: transactionFilters.search || undefined,
        limit: 100
      });
      setTransactions(data);
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to load transactions', description: 'Please try again later.' });
    } finally {
      setTransactionsLoading(false);
    }
  }, [toast, transactionFilters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [planData, promoData] = await Promise.all([
        subscriptionAdminService.getPlans(),
        subscriptionAdminService.getPromocodes()
      ]);
      setPlans(planData);
      setPromocodes(promoData);
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to load data', description: 'Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTransactionFilters((prev) =>
        prev.search === transactionSearchInput ? prev : { ...prev, search: transactionSearchInput }
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [transactionSearchInput]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const resetPlanForm = () => {
    setActivePlanId(null);
    setPlanForm({ ...defaultPlanForm });
  };

  const resetPromoForm = () => {
    setActivePromoId(null);
    setPromoForm({ ...defaultPromoForm });
  };

  const upsertPlan = async () => {
    setSavingPlan(true);
    try {
      const payload = {
        name: planForm.name.trim(),
        slug: planForm.slug.trim(),
        description: planForm.description.trim() || undefined,
        duration_days: Number(planForm.duration_days) || 30,
        price_cents: Math.max(0, Number(planForm.price_cents) || 0),
        currency_code: planForm.currency_code.trim() || 'INR',
        features: planForm.features
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
      };

      if (!payload.name || !payload.slug) {
        toast({ title: 'Missing fields', description: 'Name and slug are required.' });
        return;
      }

      if (activePlanId) {
        await subscriptionAdminService.updatePlan(activePlanId, payload);
        toast({ title: 'Plan updated', description: `${payload.name} saved successfully.` });
      } else {
        await subscriptionAdminService.createPlan(payload);
        toast({ title: 'Plan created', description: `${payload.name} is live.` });
      }

      resetPlanForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to save plan', description: 'Please check the form and try again.' });
    } finally {
      setSavingPlan(false);
    }
  };

  const togglePlanStatus = async (plan: SubscriptionPlan) => {
    try {
      await subscriptionAdminService.togglePlan(plan.id, !plan.is_active);
      toast({
        title: plan.is_active ? 'Plan paused' : 'Plan activated',
        description: `${plan.name} is now ${plan.is_active ? 'inactive' : 'active'}.`
      });
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to update status', description: 'Please try again.' });
    }
  };

  const startEditPlan = (plan: SubscriptionPlan) => {
    setActivePlanId(plan.id);
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      duration_days: plan.duration_days,
      price_cents: plan.price_cents,
      currency_code: plan.currency_code,
      features: (plan.features || []).join(', ')
    });
  };

  const upsertPromocode = async () => {
    setSavingPromo(true);
    try {
      const payload = {
        code: promoForm.code.trim().toUpperCase(),
        description: promoForm.description.trim() || undefined,
        discount_type: promoForm.discount_type,
        discount_value: Number(promoForm.discount_value) || 0,
        max_redemptions: promoForm.max_redemptions ? Number(promoForm.max_redemptions) : null,
        min_amount_cents: promoForm.min_amount_cents ? Number(promoForm.min_amount_cents) : null,
        start_at: promoForm.start_at ? setDateAtMidnight(promoForm.start_at).toISOString() : null,
        end_at: promoForm.end_at ? setDateAtMidnight(promoForm.end_at).toISOString() : null,
        auto_renew_only: promoForm.auto_renew_only,
        plan_ids: promoForm.plan_ids
      };

      if (!payload.code || !payload.discount_value) {
        toast({ title: 'Missing fields', description: 'Code and discount are required.' });
        return;
      }

      if (activePromoId) {
        await subscriptionAdminService.updatePromocode(activePromoId, payload);
        toast({ title: 'Promo updated', description: `${payload.code} saved successfully.` });
      } else {
        await subscriptionAdminService.createPromocode(payload as Required<typeof payload>);
        toast({ title: 'Promo created', description: `${payload.code} is ready to use.` });
      }

      resetPromoForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to save promo', description: 'Please verify the fields and retry.' });
    } finally {
      setSavingPromo(false);
    }
  };

  const startEditPromo = (promo: Promocode) => {
    setActivePromoId(promo.id);
    setPromoForm({
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      max_redemptions: promo.max_redemptions?.toString() || '',
      min_amount_cents: promo.min_amount_cents?.toString() || '',
      start_at: promo.start_at ? setDateAtMidnight(new Date(promo.start_at)) : null,
      end_at: promo.end_at ? setDateAtMidnight(new Date(promo.end_at)) : null,
      auto_renew_only: promo.auto_renew_only,
      plan_ids: promo.applicable_plan_ids || []
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Subscription Management</h1>
        <p className="text-muted-foreground">Configure plans, pricing, and promotional offers.</p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">System Status</CardTitle>
            <CardDescription>Instant view of premium offering health.</CardDescription>
          </div>
          <Button variant="ghost" onClick={loadData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Active Plans</p>
            <p className="text-3xl font-bold">{plans.filter(p => p.is_active).length}</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Total Promos</p>
            <p className="text-3xl font-bold">{promocodes.length}</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Currency</p>
            <p className="text-3xl font-bold">INR</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="promocodes">Promocodes</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Plans</CardTitle>
                <CardDescription>Manage pricing tiers and access duration.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading plans...
                  </div>
                ) : plans.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
                    No plans yet. Create your first plan.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="rounded-xl border border-border/60 p-4 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              {plan.name}
                              {plan.is_active ? (
                                <Badge variant="outline" className="text-success border-success/30">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Paused</Badge>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">{plan.description || 'No description set'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">
                              ₹ {(plan.price_cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground">{plan.duration_days} days</p>
                          </div>
                        </div>
                        {plan.features?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {plan.features.map((feature) => (
                              <Badge key={feature} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button variant="outline" size="sm" onClick={() => startEditPlan(plan)}>
                            Edit
                          </Button>
                          <Button
                            variant={plan.is_active ? 'secondary' : 'default'}
                            size="sm"
                            onClick={() => togglePlanStatus(plan)}
                          >
                            {plan.is_active ? 'Pause' : 'Activate'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{activePlanId ? 'Edit Plan' : 'Create Plan'}</CardTitle>
                <CardDescription>Define pricing, duration, and perks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Name</Label>
                  <Input
                    id="plan-name"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-slug">Slug</Label>
                  <Input
                    id="plan-slug"
                    value={planForm.slug}
                    onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-description">Description</Label>
                  <Textarea
                    id="plan-description"
                    rows={3}
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={planForm.duration_days}
                      onChange={(e) => setPlanForm({ ...planForm, duration_days: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={planForm.price_cents / 100}
                      onChange={(e) => setPlanForm({ ...planForm, price_cents: Math.round(Number(e.target.value) * 100) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input
                      value={planForm.currency_code}
                      onChange={(e) => setPlanForm({ ...planForm, currency_code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Features (comma separated)</Label>
                    <Input
                      placeholder="Unlimited exams, Analytics"
                      value={planForm.features}
                      onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button className="flex-1" onClick={upsertPlan} disabled={savingPlan}>
                  {savingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {activePlanId ? 'Update Plan' : 'Create Plan'}
                </Button>
                {activePlanId && (
                  <Button type="button" variant="ghost" onClick={resetPlanForm}>
                    Cancel
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="promocodes" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Promocodes</CardTitle>
                <CardDescription>Discount rules available for checkout.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading promocodes...
                  </div>
                ) : promocodes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
                    No promocodes created yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {promocodes.map((promo) => (
                      <div key={promo.id} className="rounded-xl border border-border/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold tracking-wide">{promo.code}</p>
                            <p className="text-sm text-muted-foreground">{promo.description || 'No description'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">
                              {promo.discount_type === 'percent'
                                ? `${promo.discount_value}%`
                                : `₹ ${promo.discount_value.toLocaleString('en-IN')}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {promo.auto_renew_only ? 'Auto renew only' : 'All checkouts'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">Used {promo.redemptions_count}</Badge>
                          {promo.max_redemptions ? (
                            <Badge variant="outline">Max {promo.max_redemptions}</Badge>
                          ) : (
                            <Badge variant="secondary">Unlimited</Badge>
                          )}
                          {promo.start_at && <Badge variant="outline">Starts {new Date(promo.start_at).toLocaleDateString()}</Badge>}
                          {promo.end_at && <Badge variant="outline">Ends {new Date(promo.end_at).toLocaleDateString()}</Badge>}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button variant="outline" size="sm" onClick={() => startEditPromo(promo)}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{activePromoId ? 'Edit Promocode' : 'Create Promocode'}</CardTitle>
                <CardDescription>Control incentives for acquisition.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={promoForm.description}
                    onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <select
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      value={promoForm.discount_type}
                      onChange={(e) => setPromoForm({ ...promoForm, discount_type: e.target.value as 'percent' | 'fixed' })}
                    >
                      <option value="percent">Percent</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Value</Label>
                    <Input
                      type="number"
                      min={1}
                      value={promoForm.discount_value}
                      onChange={(e) => setPromoForm({ ...promoForm, discount_value: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Redemptions</Label>
                    <Input
                      type="number"
                      min={0}
                      value={promoForm.max_redemptions}
                      onChange={(e) => setPromoForm({ ...promoForm, max_redemptions: e.target.value })}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Amount (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={promoForm.min_amount_cents ? Number(promoForm.min_amount_cents) / 100 : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPromoForm({ ...promoForm, min_amount_cents: value ? (Number(value) * 100).toString() : '' });
                      }}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Starts At</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!promoForm.start_at ? 'text-muted-foreground' : ''}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formatDateLabel(promoForm.start_at)}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 bg-card" align="start">
                        <Calendar
                          mode="single"
                          selected={promoForm.start_at ?? undefined}
                          onSelect={(date) => setPromoForm({ ...promoForm, start_at: setDateAtMidnight(date ?? null) })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Ends At</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!promoForm.end_at ? 'text-muted-foreground' : ''}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formatDateLabel(promoForm.end_at)}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 bg-card" align="start">
                        <Calendar
                          mode="single"
                          selected={promoForm.end_at ?? undefined}
                          onSelect={(date) => setPromoForm({ ...promoForm, end_at: setDateAtMidnight(date ?? null) })}
                          disabled={(date) => {
                            if (!promoForm.start_at) return false;
                            const normalized = setDateAtMidnight(date ?? null);
                            if (!normalized) return false;
                            return normalized < promoForm.start_at;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Limit to Plans</Label>
                  <div className="rounded-lg border border-input p-3">
                    <div className="space-y-2 max-h-40 overflow-auto">
                      {planOptions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No plans to select.</p>
                      ) : (
                        planOptions.map((option) => (
                          <label key={option.value} className="flex items-center gap-3 text-sm">
                            <input
                              type="checkbox"
                              checked={promoForm.plan_ids.includes(option.value)}
                              onChange={(e) => {
                                const { checked } = e.target;
                                setPromoForm((prev) => ({
                                  ...prev,
                                  plan_ids: checked
                                    ? [...prev.plan_ids, option.value]
                                    : prev.plan_ids.filter((id) => id !== option.value)
                                }));
                              }}
                            />
                            {option.label}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/80 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Auto Renew Only</p>
                    <p className="text-xs text-muted-foreground">Require auto-renew to redeem this promo.</p>
                  </div>
                  <Switch
                    checked={promoForm.auto_renew_only}
                    onCheckedChange={(checked) => setPromoForm({ ...promoForm, auto_renew_only: checked })}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button className="flex-1" onClick={upsertPromocode} disabled={savingPromo}>
                  {savingPromo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  {activePromoId ? 'Update Promo' : 'Create Promo'}
                </Button>
                {activePromoId && (
                  <Button type="button" variant="ghost" onClick={resetPromoForm}>
                    Cancel
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Slice and dice subscription payments.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={transactionFilters.status}
                  onValueChange={(value) => setTransactionFilters((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionStatuses.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status === 'all' ? 'All Statuses' : status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={transactionFilters.planId || 'all'}
                  onValueChange={(value) =>
                    setTransactionFilters((prev) => ({ ...prev, planId: value === 'all' ? '' : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    {planOptions.map((plan) => (
                      <SelectItem key={plan.value} value={plan.value}>
                        {plan.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search (Order/Payment)</Label>
                <Input
                  placeholder="ORD_..."
                  value={transactionSearchInput}
                  onChange={(e) => setTransactionSearchInput(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="outline" onClick={loadTransactions} disabled={transactionsLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${transactionsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Latest subscription purchases and renewals.</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {transactions.length} records
              </Badge>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
                  No transactions match the current filters.
                </div>
              ) : (
                <div className="rounded-xl border border-border/80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Promo</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell>
                            <div className="text-sm font-medium">{txn.user?.name || 'Unknown user'}</div>
                            <div className="text-xs text-muted-foreground">{txn.user?.email || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{txn.plan?.name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{txn.auto_renew ? 'Auto renew' : 'Manual'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">{formatCurrency(txn.amount_cents, txn.currency_code)}</div>
                            <div className="text-xs text-muted-foreground">{txn.razorpay_payment_id || txn.razorpay_order_id || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusBadgeClasses[txn.status] || 'bg-muted text-muted-foreground'}
                            >
                              {txn.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {txn.promocode ? (
                              <div className="text-sm font-medium">{txn.promocode.code}</div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {txn.created_at ? new Date(txn.created_at).toLocaleDateString() : '—'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {txn.created_at ? new Date(txn.created_at).toLocaleTimeString() : ''}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
