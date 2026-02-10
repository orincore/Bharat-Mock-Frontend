"use client";

import { useEffect, useMemo, useState } from 'react';
import { adminService } from '@/lib/api/adminService';
import { FooterLink, FooterLinkInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ArrowDown, ArrowUp, Loader2, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';

const createEmptyForm = (sectionOrder = 0, linkOrder = 0): FooterLinkInput => ({
  section: '',
  section_order: sectionOrder,
  label: '',
  href: '',
  display_order: linkOrder,
  is_active: true,
  open_in_new_tab: false
});

const sortFooterLinks = (links: FooterLink[]) =>
  [...links].sort((a, b) => {
    if (a.section_order !== b.section_order) return a.section_order - b.section_order;
    const sectionCompare = (a.section || 'General').localeCompare(b.section || 'General');
    if (sectionCompare !== 0) return sectionCompare;
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  });

const groupBySection = (links: FooterLink[]) => {
  return links.reduce<Record<string, { order: number; items: FooterLink[] }>>((acc, link) => {
    const key = link.section || 'General';
    if (!acc[key]) {
      acc[key] = { order: link.section_order ?? 0, items: [] };
    }
    acc[key].items.push(link);
    acc[key].items.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    return acc;
  }, {});
};

export default function FooterAdminPage() {
  const { toast } = useToast();
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FooterLinkInput>(createEmptyForm());

  const orderedLinks = useMemo(() => sortFooterLinks(links), [links]);
  const grouped = useMemo(() => groupBySection(orderedLinks), [orderedLinks]);
  const isEditing = Boolean(editingId);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const data = await adminService.getFooterLinksAdmin();
      const sorted = sortFooterLinks(data);
      setLinks(sorted);
      if (!editingId) {
        setForm(createEmptyForm(sorted.length, sorted.length));
      }
    } catch (error: any) {
      toast({
        title: 'Unable to load footer links',
        description: error?.message || 'Please refresh and try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(createEmptyForm(orderedLinks.length, orderedLinks.length));
  };

  const handleFormChange = (field: keyof FooterLinkInput, value: string | number | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: ['section_order', 'display_order'].includes(field)
        ? Number(value)
        : value
    }));
  };

  const handleEdit = (link: FooterLink) => {
    setEditingId(link.id);
    setForm({
      section: link.section,
      section_order: link.section_order,
      label: link.label,
      href: link.href,
      display_order: link.display_order,
      is_active: link.is_active,
      open_in_new_tab: Boolean(link.open_in_new_tab)
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.label?.trim() || !form.href?.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please provide both label and link URL.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      const payload: FooterLinkInput = {
        ...form,
        section_order: Number.isFinite(form.section_order) ? Number(form.section_order) : 0,
        display_order: Number.isFinite(form.display_order) ? Number(form.display_order) : 0
      };

      let updated: FooterLink;
      if (editingId) {
        updated = await adminService.updateFooterLink(editingId, payload);
        setLinks((prev) => sortFooterLinks(prev.map((link) => (link.id === editingId ? updated : link))));
        toast({ title: 'Footer link updated' });
      } else {
        updated = await adminService.createFooterLink(payload);
        setLinks((prev) => sortFooterLinks([...prev, updated]));
        toast({ title: 'Footer link created' });
      }

      resetForm();
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

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm('Delete this footer link?');
    if (!confirmDelete) return;
    try {
      await adminService.deleteFooterLink(id);
      setLinks((prev) => prev.filter((link) => link.id !== id));
      if (editingId === id) {
        resetForm();
      }
      toast({ title: 'Footer link deleted' });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (link: FooterLink) => {
    try {
      const updated = await adminService.updateFooterLink(link.id, {
        section: link.section,
        section_order: link.section_order,
        label: link.label,
        href: link.href,
        display_order: link.display_order,
        is_active: !link.is_active,
        open_in_new_tab: link.open_in_new_tab
      });
      setLinks((prev) => sortFooterLinks(prev.map((item) => (item.id === link.id ? updated : item))));
    } catch (error: any) {
      toast({
        title: 'Failed to update status',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const submitReorder = async (updatedLinks: FooterLink[]) => {
    setReordering(true);
    try {
      const orderPayload = updatedLinks.map((link, index) => ({
        id: link.id,
        section_order: link.section_order,
        display_order: index
      }));
      await adminService.reorderFooterLinks(orderPayload);
      setLinks(sortFooterLinks(updatedLinks.map((link, index) => ({ ...link, display_order: index }))));
    } catch (error: any) {
      toast({
        title: 'Failed to reorder',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
      setLinks((prev) => sortFooterLinks(prev));
    } finally {
      setReordering(false);
    }
  };

  const moveLink = (id: string, direction: 'up' | 'down') => {
    const currentIndex = orderedLinks.findIndex((link) => link.id === id);
    if (currentIndex === -1) return;
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= orderedLinks.length) return;
    const updated = [...orderedLinks];
    [updated[currentIndex], updated[swapIndex]] = [updated[swapIndex], updated[currentIndex]];
    submitReorder(updated);
  };

  const handleRefresh = () => {
    resetForm();
    loadLinks();
  };

  const groupedEntries = useMemo(() => {
    return Object.entries(grouped).sort((a, b) => a[1].order - b[1].order);
  }, [grouped]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-1">Footer</p>
          <h1 className="font-display text-3xl font-bold">Footer Links</h1>
          <p className="text-muted-foreground max-w-2xl">
            Configure the sections and links shown in the public site footer. Contact details remain static for now.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-bold">Existing Sections</h2>
              <p className="text-muted-foreground text-sm">Sections are grouped by name and order.</p>
            </div>
            <span className="text-sm text-muted-foreground">{orderedLinks.length} link{orderedLinks.length === 1 ? '' : 's'}</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : orderedLinks.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
              No footer links yet. Use the form to add your first link.
            </div>
          ) : (
            <div className="space-y-6">
              {groupedEntries.map(([section, info]) => (
                <div key={section} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{section || 'General'}</h3>
                      <p className="text-xs text-muted-foreground">Section order #{info.order}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {info.items.map((link, index) => {
                      const globalIndex = orderedLinks.findIndex((item) => item.id === link.id);
                      return (
                        <div
                          key={link.id}
                          className="rounded-xl border border-border bg-background px-4 py-3 flex flex-col md:flex-row md:items-center gap-3"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{link.label}</p>
                            <p className="text-sm text-muted-foreground break-all">{link.href}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>Link order #{link.display_order}</span>
                              {link.open_in_new_tab && <span>Opens in new tab</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`active-${link.id}`}
                                checked={link.is_active}
                                onCheckedChange={() => handleToggleActive(link)}
                              />
                              <Label htmlFor={`active-${link.id}`} className="text-sm">
                                {link.is_active ? 'Visible' : 'Hidden'}
                              </Label>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => moveLink(link.id, 'up')}
                                disabled={globalIndex === 0 || reordering}
                                aria-label="Move up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => moveLink(link.id, 'down')}
                                disabled={globalIndex === orderedLinks.length - 1 || reordering}
                                aria-label="Move down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(link)}>
                                Edit
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(link.id)} aria-label="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{isEditing ? 'Update Link' : 'Add Link'}</p>
              <h2 className="font-display text-xl font-bold text-foreground">
                {isEditing ? 'Edit footer link' : 'Create footer link'}
              </h2>
            </div>
            {isEditing && (
              <Button variant="ghost" size="icon" onClick={resetForm} aria-label="Cancel edit">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="footer-section">Section Name</Label>
              <Input
                id="footer-section"
                value={form.section ?? ''}
                onChange={(e) => handleFormChange('section', e.target.value)}
                placeholder="e.g. Popular Exams"
              />
              <p className="text-xs text-muted-foreground">Leave blank to default to “General”.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="footer-section-order">Section Order</Label>
                <Input
                  id="footer-section-order"
                  type="number"
                  min={0}
                  value={form.section_order ?? 0}
                  onChange={(e) => handleFormChange('section_order', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer-link-order">Link Order</Label>
                <Input
                  id="footer-link-order"
                  type="number"
                  min={0}
                  value={form.display_order ?? 0}
                  onChange={(e) => handleFormChange('display_order', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer-label">Label</Label>
              <Input
                id="footer-label"
                value={form.label}
                onChange={(e) => handleFormChange('label', e.target.value)}
                placeholder="e.g. JEE Main"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer-href">Link URL</Label>
              <Input
                id="footer-href"
                value={form.href}
                onChange={(e) => handleFormChange('href', e.target.value)}
                placeholder="/exams?category=engineering"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
                <Switch
                  id="footer-active"
                  checked={form.is_active ?? true}
                  onCheckedChange={(checked) => handleFormChange('is_active', checked)}
                />
                <Label htmlFor="footer-active" className="text-sm">
                  {form.is_active ? 'Visible' : 'Hidden'}
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="footer-new-tab"
                checked={form.open_in_new_tab ?? false}
                onCheckedChange={(checked) => handleFormChange('open_in_new_tab', checked)}
              />
              <Label htmlFor="footer-new-tab" className="text-sm">Open link in new tab</Label>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" className="flex items-center gap-2" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving
                  </>
                ) : (
                  <>
                    {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isEditing ? 'Update Link' : 'Create Link'}
                  </>
                )}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
