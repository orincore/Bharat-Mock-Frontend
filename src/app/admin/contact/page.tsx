"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { adminService } from '@/lib/api/adminService';
import { ContactInfo, ContactInfoInput, ContactSocialLink } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { fallbackContactInfo } from '@/lib/constants/contact';

const createDefaultForm = (): ContactInfoInput => ({
  headline: fallbackContactInfo.headline,
  subheading: fallbackContactInfo.subheading,
  description: fallbackContactInfo.description,
  support_email: fallbackContactInfo.support_email,
  support_phone: fallbackContactInfo.support_phone,
  whatsapp_number: fallbackContactInfo.whatsapp_number,
  address_line1: fallbackContactInfo.address_line1,
  address_line2: fallbackContactInfo.address_line2,
  city: fallbackContactInfo.city,
  state: fallbackContactInfo.state,
  postal_code: fallbackContactInfo.postal_code,
  country: fallbackContactInfo.country,
  support_hours: fallbackContactInfo.support_hours,
  map_embed_url: fallbackContactInfo.map_embed_url
});

const emptySocialLink = (order: number): ContactSocialLink => ({
  platform: '',
  label: '',
  url: '',
  icon: '',
  display_order: order,
  is_active: true
});

const sortSocialLinks = (links: ContactSocialLink[] = []) =>
  [...links].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

export default function ContactAdminPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<ContactInfoInput>(createDefaultForm());
  const [socialLinks, setSocialLinks] = useState<ContactSocialLink[]>(
    sortSocialLinks(fallbackContactInfo.contact_social_links ?? [])
  );
  const [deletedSocialIds, setDeletedSocialIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const orderedSocialLinks = useMemo(() => sortSocialLinks(socialLinks), [socialLinks]);

  const loadContact = async () => {
    try {
      setLoading(true);
      const data = await adminService.getContactInfoAdmin();
      if (data) {
        setForm({ ...data });
        setSocialLinks(sortSocialLinks(data.contact_social_links ?? []));
      } else {
        setForm(createDefaultForm());
        setSocialLinks(sortSocialLinks(fallbackContactInfo.contact_social_links ?? []));
      }
      setDeletedSocialIds([]);
    } catch (error: any) {
      toast({
        title: 'Unable to load contact info',
        description: error?.message || 'Using fallback values for now.',
        variant: 'destructive'
      });
      setForm(createDefaultForm());
      setSocialLinks(sortSocialLinks(fallbackContactInfo.contact_social_links ?? []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFieldChange = (field: keyof ContactInfoInput, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.headline?.trim() || !form.support_email?.trim() || !form.support_phone?.trim() || !form.address_line1?.trim()) {
      toast({
        title: 'Required fields missing',
        description: 'Headline, support email, support phone, and primary address are required.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      const payload: ContactInfoInput = {
        ...form,
        contact_social_links: orderedSocialLinks.map((link, index) => ({
          ...link,
          label: link.label || link.platform,
          icon: link.icon || link.platform,
          display_order: Number.isFinite(link.display_order) ? Number(link.display_order) : index,
          is_active: typeof link.is_active === 'boolean' ? link.is_active : true
        })),
        deleted_social_ids: deletedSocialIds
      };

      const saved = await adminService.upsertContactInfo(payload);
      setDeletedSocialIds([]);
      if (saved) {
        setForm({ ...saved });
        setSocialLinks(sortSocialLinks(saved.contact_social_links ?? []));
        setLastSaved(new Date());
      }
      toast({ title: 'Contact information updated' });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const addSocialLink = () => {
    setSocialLinks((prev) => [...prev, emptySocialLink(prev.length)]);
  };

  const updateSocialLink = (index: number, field: keyof ContactSocialLink, value: string | boolean | number) => {
    setSocialLinks((prev) =>
      prev.map((link, idx) => (idx === index ? { ...link, [field]: value } : link))
    );
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks((prev) => {
      const target = prev[index];
      if (target?.id) {
        setDeletedSocialIds((ids) => [...ids, target.id as string]);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-1">Contact</p>
          <h1 className="font-display text-3xl font-bold">Contact Information</h1>
          <p className="text-muted-foreground max-w-2xl">
            Manage the public contact page content, support channels, and social presence. Changes here update the
            contact page and footer immediately.
          </p>
          {lastSaved && (
            <p className="text-xs text-muted-foreground mt-2">Last updated {lastSaved.toLocaleString()}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={loadContact} disabled={loading || saving}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button type="submit" form="contact-form" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <form id="contact-form" onSubmit={handleSubmit} className="space-y-8">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Hero Copy</p>
              <h2 className="font-display text-xl font-bold">Headline & Messaging</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={form.headline ?? ''}
                onChange={(e) => handleFieldChange('headline', e.target.value)}
                placeholder="e.g. Connect with Bharat Mock"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subheading">Subheading</Label>
              <Input
                id="subheading"
                value={form.subheading ?? ''}
                onChange={(e) => handleFieldChange('subheading', e.target.value)}
                placeholder="Response time or reassurance message"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Intro Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description ?? ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Explain how your team can help visitors."
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Primary Contacts</p>
              <h2 className="font-display text-xl font-bold">Support Channels</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="support_email">Support Email</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={form.support_email ?? ''}
                  onChange={(e) => handleFieldChange('support_email', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support_phone">Support Phone</Label>
                <Input
                  id="support_phone"
                  value={form.support_phone ?? ''}
                  onChange={(e) => handleFieldChange('support_phone', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Number</Label>
              <Input
                id="whatsapp"
                value={form.whatsapp_number ?? ''}
                onChange={(e) => handleFieldChange('whatsapp_number', e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-hours">Support Hours</Label>
              <Input
                id="support-hours"
                value={form.support_hours ?? ''}
                onChange={(e) => handleFieldChange('support_hours', e.target.value)}
                placeholder="e.g. Monday - Friday · 9 AM to 7 PM IST"
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Office Location</p>
            <h2 className="font-display text-xl font-bold">Address & Map</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                value={form.address_line1 ?? ''}
                onChange={(e) => handleFieldChange('address_line1', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                value={form.address_line2 ?? ''}
                onChange={(e) => handleFieldChange('address_line2', e.target.value)}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city ?? ''} onChange={(e) => handleFieldChange('city', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state ?? ''} onChange={(e) => handleFieldChange('state', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={form.postal_code ?? ''}
                onChange={(e) => handleFieldChange('postal_code', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={form.country ?? ''} onChange={(e) => handleFieldChange('country', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="map_embed_url">Map Embed URL</Label>
            <Input
              id="map_embed_url"
              value={form.map_embed_url ?? ''}
              onChange={(e) => handleFieldChange('map_embed_url', e.target.value)}
              placeholder="https://www.google.com/maps/embed?..."
            />
            {form.map_embed_url && (
              <div className="mt-4 border border-border rounded-xl overflow-hidden">
                <iframe
                  src={form.map_embed_url}
                  title="Office Map Preview"
                  className="w-full h-64"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Social Presence</p>
              <h2 className="font-display text-xl font-bold">Social Links</h2>
              <p className="text-sm text-muted-foreground">Displayed on the contact page and footer.</p>
            </div>
            <Button type="button" variant="outline" onClick={addSocialLink}>
              <Plus className="h-4 w-4 mr-2" /> Add Social Link
            </Button>
          </div>

          {orderedSocialLinks.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
              No social links configured. Click “Add Social Link” to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {orderedSocialLinks.map((link, index) => (
                <div key={link.id ?? index} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold">{link.label || 'Untitled Social Link'}</p>
                      <p className="text-xs text-muted-foreground">Display order #{link.display_order ?? index}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`social-active-${index}`}
                          checked={link.is_active !== false}
                          onCheckedChange={(checked) => updateSocialLink(index, 'is_active', checked)}
                        />
                        <Label htmlFor={`social-active-${index}`} className="text-sm">
                          {link.is_active === false ? 'Hidden' : 'Visible'}
                        </Label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSocialLink(index)}
                        aria-label="Remove social link"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`platform-${index}`}>Platform</Label>
                      <Input
                        id={`platform-${index}`}
                        value={link.platform}
                        onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                        placeholder="e.g. facebook"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`label-${index}`}>Label</Label>
                      <Input
                        id={`label-${index}`}
                        value={link.label ?? ''}
                        onChange={(e) => updateSocialLink(index, 'label', e.target.value)}
                        placeholder="Display name"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-[2fr_1fr] gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`url-${index}`}>URL</Label>
                      <Input
                        id={`url-${index}`}
                        value={link.url}
                        onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                        placeholder="https://"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`icon-${index}`}>Icon (optional)</Label>
                      <Input
                        id={`icon-${index}`}
                        value={link.icon ?? ''}
                        onChange={(e) => updateSocialLink(index, 'icon', e.target.value)}
                        placeholder="Defaults to platform name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`display-${index}`}>Display Order</Label>
                    <Input
                      id={`display-${index}`}
                      type="number"
                      min={0}
                      value={link.display_order ?? index}
                      onChange={(e) => updateSocialLink(index, 'display_order', Number(e.target.value))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
