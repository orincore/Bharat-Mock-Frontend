"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { categoryAdminService } from '@/lib/api/categoryAdminService';

export default function AdminCreateCategoryPage() {
  const router = useRouter();

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    display_order: '0',
    is_active: true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateForm = (updates: Partial<typeof categoryForm>) =>
    setCategoryForm((prev) => ({ ...prev, ...updates }));

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setLogoFile(null);
      setLogoPreview('');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const result = await categoryAdminService.createCategory({
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim() || undefined,
        description: categoryForm.description,
        display_order: categoryForm.display_order || '0',
        is_active: categoryForm.is_active,
        logo: logoFile || undefined,
      });
      router.push(`/admin/categories/${result.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="mb-4" asChild>
          <Link href="/admin/categories">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to categories
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Create New Category
        </h1>
        <p className="text-muted-foreground">
          Add a new exam category with logo, description, and ordering.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Name *</label>
              <Input
                value={categoryForm.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="e.g., SSC, UPSC, Banking"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Slug</label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => updateForm({ slug: e.target.value })}
                placeholder="Auto-generated from name if empty"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Display Order</label>
              <Input
                type="number"
                inputMode="numeric"
                value={categoryForm.display_order}
                onChange={(e) => updateForm({ display_order: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={categoryForm.is_active ? 'true' : 'false'}
                onChange={(e) => updateForm({ is_active: e.target.value === 'true' })}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <Textarea
              rows={3}
              value={categoryForm.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              placeholder="Short description for the category"
            />
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <div className="w-24 h-24 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30">
              {logoPreview ? (
                <img src={logoPreview} alt="Category logo" className="w-full h-full object-contain p-2" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Logo</label>
              <Input type="file" accept="image/*" onChange={handleLogoChange} />
              <p className="text-xs text-muted-foreground">Recommended square image - PNG / SVG</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/categories')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Category'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
