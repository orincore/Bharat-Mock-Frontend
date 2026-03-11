"use client";

import { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  ImagePlus,
  Trash2,
  Edit,
  Save,
  Plus,
  Link2,
  Type
} from 'lucide-react';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { pageBannersService, PageBanner } from '@/lib/api/pageBannersService';

const PAGE_IDENTIFIER = 'test_series_sidebar';

export default function TestSeriesSidebarAdmin() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PageBanner | null>(null);
  const [form, setForm] = useState({ imageUrl: '', linkUrl: '', altText: '' });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const data = await pageBannersService.getAdminBanners(PAGE_IDENTIFIER);
      setBanners(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load sidebar banners',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setForm({ imageUrl: '', linkUrl: '', altText: '' });
  };

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await pageBannersService.uploadBannerImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
      toast({ title: 'Upload complete', description: 'Banner image uploaded successfully' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload banner image',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.imageUrl.trim()) {
      toast({ title: 'Image missing', description: 'Please upload a banner image', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingBanner) {
        const updated = await pageBannersService.updateBanner(editingBanner.id, {
          imageUrl: form.imageUrl,
          linkUrl: form.linkUrl || undefined,
          altText: form.altText || undefined
        });
        setBanners((prev) => prev.map((banner) => (banner.id === updated.id ? updated : banner)));
        toast({ title: 'Updated', description: 'Banner updated successfully' });
      } else {
        const created = await pageBannersService.createBanner({
          pageIdentifier: PAGE_IDENTIFIER,
          imageUrl: form.imageUrl,
          linkUrl: form.linkUrl || undefined,
          altText: form.altText || undefined,
          isActive: true,
          displayOrder: banners.length + 1
        });
        setBanners((prev) => [...prev, created]);
        toast({ title: 'Created', description: 'New banner added' });
      }
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save banner',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await pageBannersService.deleteBanner(bannerId);
      setBanners((prev) => prev.filter((banner) => banner.id !== bannerId));
      toast({ title: 'Deleted', description: 'Banner removed' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete banner',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (banner: PageBanner) => {
    try {
      const updated = await pageBannersService.updateBanner(banner.id, {
        isActive: !banner.is_active
      });
      setBanners((prev) => prev.map((item) => (item.id === banner.id ? updated : item)));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (banner: PageBanner) => {
    setEditingBanner(banner);
    setForm({
      imageUrl: banner.image_url,
      linkUrl: banner.link_url || '',
      altText: banner.alt_text || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-2">
          <Breadcrumbs
            items={[AdminBreadcrumb(), { label: 'Pages', href: '/admin/pages' }, { label: 'Test Series Sidebar' }]}
            className="mb-2"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Test Series</p>
            <h1 className="font-display text-3xl font-bold text-slate-900">Sidebar Management</h1>
            <p className="text-muted-foreground">
              Upload and curate banners that appear beside every test series detail page.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {editingBanner ? 'Edit Banner' : 'Add New Banner'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Highlight premium mock tests or campaigns in the sidebar.
              </p>
            </div>
            {editingBanner && (
              <Button variant="ghost" onClick={resetForm} className="text-sm">
                Cancel
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Banner Image</label>
              <div className="flex gap-3">
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="Image URL"
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button type="button" variant="secondary" onClick={handleFilePick} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Link URL (Optional)</label>
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-slate-400" />
                <Input
                  value={form.linkUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
                  placeholder="https://"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Alt Text</label>
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-slate-400" />
                <Input
                  value={form.altText}
                  onChange={(e) => setForm((prev) => ({ ...prev, altText: e.target.value }))}
                  placeholder="Short description"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editingBanner ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {editingBanner ? 'Update Banner' : 'Add Banner'}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Existing Banners</h2>
              <p className="text-sm text-muted-foreground">Only one banner is shown at a time; toggled banners rotate.</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              Loading banners...
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No banners yet. Add one above.</div>
          ) : (
            <div className="grid gap-4">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="flex flex-col md:flex-row items-start md:items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.image_url}
                    alt={banner.alt_text || 'Sidebar banner'}
                    className="h-32 w-full md:w-64 object-cover rounded-xl border border-slate-100"
                  />
                  <div className="flex-1 w-full">
                    <p className="text-sm font-semibold text-slate-900">
                      {banner.alt_text || 'Untitled banner'}
                    </p>
                    {banner.link_url && (
                      <a
                        href={banner.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        {banner.link_url}
                      </a>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Updated {new Date(banner.updated_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Switch
                        checked={banner.is_active}
                        onCheckedChange={() => handleToggleActive(banner)}
                        id={`banner-active-${banner.id}`}
                      />
                      <label htmlFor={`banner-active-${banner.id}`}>Active</label>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => handleEdit(banner)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(banner.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
