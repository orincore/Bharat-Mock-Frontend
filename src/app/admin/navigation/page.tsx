"use client";

import { useEffect, useMemo, useState } from 'react';
import { adminService } from '@/lib/api/adminService';
import { NavigationLink, NavigationLinkInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Save, Trash2, RefreshCcw, ArrowUp, ArrowDown, X } from 'lucide-react';

const createEmptyForm = (order = 0): NavigationLinkInput => ({
  label: '',
  href: '',
  display_order: order,
  is_active: true,
  open_in_new_tab: false
});

const sortLinks = (links: NavigationLink[]) =>
  [...links].sort((a, b) => {
    const orderDelta = (a.display_order ?? 0) - (b.display_order ?? 0);
    if (orderDelta !== 0) return orderDelta;
    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  });

export default function NavigationAdminPage() {
  const { toast } = useToast();
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NavigationLinkInput>(createEmptyForm());

  const isEditing = Boolean(editingId);

  const orderedLinks = useMemo(() => sortLinks(links), [links]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const data = await adminService.getNavigationLinksAdmin();
      setLinks(sortLinks(data));
      if (!editingId) {
        setForm((prev) => ({ ...prev, display_order: data.length }));
      }
    } catch (error: any) {
      toast({
        title: 'Unable to load navigation links',
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
    setForm(createEmptyForm(links.length));
  };

  const handleFormChange = (field: keyof NavigationLinkInput, value: string | number | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: field === 'display_order' ? Number(value) : value
    }));
  };

  const handleEdit = (link: NavigationLink) => {
    setEditingId(link.id);
    setForm({
      label: link.label,
      href: link.href,
      display_order: link.display_order ?? 0,
      is_active: link.is_active,
      open_in_new_tab: Boolean(link.open_in_new_tab)
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.label?.trim() || !form.href?.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please provide both a label and a link URL.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      const payload: NavigationLinkInput = {
        ...form,
        display_order: Number.isFinite(form.display_order) ? Number(form.display_order) : links.length
      };

      let updatedLink: NavigationLink;
      if (editingId) {
        updatedLink = await adminService.updateNavigationLink(editingId, payload);
        setLinks((prev) => sortLinks(prev.map((link) => (link.id === editingId ? updatedLink : link))));
        toast({ title: 'Navigation link updated' });
      } else {
        updatedLink = await adminService.createNavigationLink(payload);
        setLinks((prev) => sortLinks([...prev, updatedLink]));
        toast({ title: 'Navigation link created' });
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
    const confirmDelete = window.confirm('Are you sure you want to delete this navigation link?');
    if (!confirmDelete) return;
    try {
      await adminService.deleteNavigationLink(id);
      setLinks((prev) => prev.filter((link) => link.id !== id));
      if (editingId === id) {
        resetForm();
      }
      toast({ title: 'Navigation link deleted' });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error?.message || 'Unable to delete link.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (link: NavigationLink) => {
    try {
      const updated = await adminService.updateNavigationLink(link.id, {
        label: link.label,
        href: link.href,
        display_order: link.display_order,
        is_active: !link.is_active,
        open_in_new_tab: link.open_in_new_tab
      });
      setLinks((prev) => sortLinks(prev.map((item) => (item.id === link.id ? updated : item))));
    } catch (error: any) {
      toast({
        title: 'Failed to update status',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const submitReorder = async (updated: NavigationLink[]) => {
    setReordering(true);
    try {
      const orderPayload = updated.map((link, index) => ({ id: link.id, display_order: index }));
      await adminService.reorderNavigationLinks(orderPayload);
      setLinks(sortLinks(updated.map((link, index) => ({ ...link, display_order: index }))));
    } catch (error: any) {
      toast({
        title: 'Failed to reorder links',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
      setLinks((prev) => sortLinks(prev));
    } finally {
      setReordering(false);
    }
  };

  const moveLink = (id: string, direction: 'up' | 'down') => {
    const currentIndex = orderedLinks.findIndex((link) => link.id === id);
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || swapIndex < 0 || swapIndex >= orderedLinks.length) {
      return;
    }
    const updated = [...orderedLinks];
    [updated[currentIndex], updated[swapIndex]] = [updated[swapIndex], updated[currentIndex]];
    submitReorder(updated);
  };

  const handleRefresh = () => {
    resetForm();
    loadLinks();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-1">Navigation</p>
          <h1 className="font-display text-3xl font-bold">Header Links</h1>
          <p className="text-muted-foreground max-w-2xl">
            Create, reorder, and publish the links that appear in the public site header.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={loading} className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-3 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-bold">Existing Links</h2>
              <p className="text-muted-foreground text-sm">Drag controls to change order. Toggle to publish/unpublish.</p>
            </div>
            <span className="text-sm text-muted-foreground">{orderedLinks.length} link{orderedLinks.length === 1 ? '' : 's'}</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : orderedLinks.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
              No navigation links yet. Use the form to add your first link.
            </div>
          ) : (
            <div className="space-y-2">
              {orderedLinks.map((link, index) => (
                <div
                  key={link.id}
                  className="rounded-xl border border-border bg-background px-4 py-3 flex flex-col md:flex-row md:items-center gap-3"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{link.label}</p>
                    <p className="text-sm text-muted-foreground break-all">{link.href}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>Order #{link.display_order ?? index}</span>
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
                        disabled={index === 0 || reordering}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => moveLink(link.id, 'down')}
                        disabled={index === orderedLinks.length - 1 || reordering}
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
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{isEditing ? 'Update Link' : 'Add Link'}</p>
              <h2 className="font-display text-xl font-bold text-foreground">
                {isEditing ? 'Edit navigation link' : 'Create navigation link'}
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
              <Label htmlFor="nav-label">Label</Label>
              <Input
                id="nav-label"
                value={form.label}
                onChange={(e) => handleFormChange('label', e.target.value)}
                placeholder="e.g. Courses"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nav-href">Link URL</Label>
              <Input
                id="nav-href"
                value={form.href}
                onChange={(e) => handleFormChange('href', e.target.value)}
                placeholder="/courses"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nav-order">Display Order</Label>
                <Input
                  id="nav-order"
                  type="number"
                  min={0}
                  value={form.display_order ?? 0}
                  onChange={(e) => handleFormChange('display_order', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
                  <Switch
                    id="nav-active"
                    checked={form.is_active ?? true}
                    onCheckedChange={(checked) => handleFormChange('is_active', checked)}
                  />
                  <Label htmlFor="nav-active" className="text-sm">
                    {form.is_active ? 'Visible' : 'Hidden'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="nav-new-tab"
                checked={form.open_in_new_tab ?? false}
                onCheckedChange={(checked) => handleFormChange('open_in_new_tab', checked)}
              />
              <Label htmlFor="nav-new-tab" className="text-sm">Open link in new tab</Label>
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
