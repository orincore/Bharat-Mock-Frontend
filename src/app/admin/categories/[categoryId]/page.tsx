"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Trash2,
  Edit,
  Layers,
  Image as ImageIcon,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { categoryAdminService } from '@/lib/api/categoryAdminService';
import { subcategoryAdminService } from '@/lib/api/subcategoryAdminService';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

type SectionCardProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
};

function SectionCard({ icon: Icon, title, description, children }: SectionCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

const normalizeCategory = (data: Category, previous?: Category | null): Category => ({
  ...data,
  display_order:
    data.display_order !== undefined && data.display_order !== null
      ? data.display_order
      : previous?.display_order ?? 0,
  is_active:
    data.is_active !== undefined && data.is_active !== null
      ? data.is_active
      : previous?.is_active ?? true
});

interface SubcategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  display_order?: number;
  is_active: boolean;
}

export default function AdminCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const categoryId = params.categoryId as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [subcategories, setSubcategories] = useState<SubcategorySummary[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    display_order: '0',
    is_active: true
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [subcategoryDeleteTarget, setSubcategoryDeleteTarget] = useState<SubcategorySummary | null>(null);
  const [deletingSubcategory, setDeletingSubcategory] = useState(false);
  const [showCreateSubcategory, setShowCreateSubcategory] = useState(false);
  const [creatingSubcategory, setCreatingSubcategory] = useState(false);
  const [createSubcategoryForm, setCreateSubcategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    display_order: '0',
    is_active: true,
  });
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null);

  const updateCategoryForm = (updates: Partial<typeof categoryForm>) =>
    setCategoryForm((prev) => ({ ...prev, ...updates }));

  const syncCategoryForm = (data: Category) => {
    setCategoryForm({
      name: data.name || '',
      slug: data.slug || '',
      description: data.description || '',
      display_order: (data.display_order ?? 0).toString(),
      is_active: data.is_active ?? true
    });
    setLogoPreview(data.logo_url || '');
    setLogoFile(null);
  };

  const loadCategory = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await categoryAdminService.getCategoryById(categoryId);
      setCategory((prev) => {
        const normalized = normalizeCategory(data, prev);
        syncCategoryForm(normalized);
        return normalized;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load category');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubcategories = async () => {
    try {
      const data = await categoryAdminService.getSubcategories(categoryId);
      const sorted = (data || []).sort((a: SubcategorySummary, b: SubcategorySummary) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setSubcategories(sorted);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...subcategories];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setSubcategories(reordered);
    setDragIndex(null);
    setDragOverIndex(null);

    try {
      setSavingOrder(true);
      await categoryAdminService.reorderSubcategories(reordered.map((s) => s.id));
    } catch (err) {
      console.error('Failed to save order:', err);
      await loadSubcategories();
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const openCreateSubcategoryDialog = () => {
    setCreateSubcategoryForm({ name: '', slug: '', description: '', display_order: '0', is_active: true });
    setCreateLogoFile(null);
    setShowCreateSubcategory(true);
  };

  const handleCreateSubcategory = async () => {
    if (!createSubcategoryForm.name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a subcategory name', variant: 'destructive' });
      return;
    }
    try {
      setCreatingSubcategory(true);
      await subcategoryAdminService.createSubcategory({
        category_id: categoryId,
        name: createSubcategoryForm.name.trim(),
        slug: createSubcategoryForm.slug.trim() || undefined,
        description: createSubcategoryForm.description,
        display_order: createSubcategoryForm.display_order,
        is_active: createSubcategoryForm.is_active,
        logo: createLogoFile || undefined,
      });
      toast({ title: 'Subcategory created', description: `${createSubcategoryForm.name.trim()} added successfully.` });
      setShowCreateSubcategory(false);
      await loadSubcategories();
    } catch (error: any) {
      toast({ title: 'Create failed', description: error?.message || 'Could not create subcategory', variant: 'destructive' });
    } finally {
      setCreatingSubcategory(false);
    }
  };

  const handleCreateLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCreateLogoFile(file);
  };

  const handleDeleteSubcategory = async () => {
    if (!subcategoryDeleteTarget) return;
    try {
      setDeletingSubcategory(true);
      await subcategoryAdminService.deleteSubcategory(subcategoryDeleteTarget.id);
      toast({ title: 'Subcategory deleted', description: `${subcategoryDeleteTarget.name} removed successfully.` });
      setSubcategoryDeleteTarget(null);
      await loadSubcategories();
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error?.message || 'Could not delete subcategory', variant: 'destructive' });
    } finally {
      setDeletingSubcategory(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setLogoFile(null);
      setLogoPreview(category?.logo_url || '');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const resetCategoryForm = () => {
    if (category) {
      syncCategoryForm(category);
    }
  };

  const onSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      alert('Category name is required');
      return;
    }
    try {
      setSavingCategory(true);
      await categoryAdminService.updateCategory(categoryId, {
        ...categoryForm,
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim(),
        display_order: categoryForm.display_order || '0',
        logo: logoFile || undefined
      });
      await loadCategory();
    } catch (err: any) {
      alert(err.message || 'Failed to update category');
    } finally {
      setSavingCategory(false);
    }
  };

  const getSubcategoryStatus = (isActive?: boolean | null) => {
    if (isActive === true) {
      return { label: 'Active', className: 'bg-emerald-100 text-emerald-700' };
    }
    if (isActive === false) {
      return { label: 'Inactive', className: 'bg-rose-100 text-rose-700' };
    }
    return { label: 'Draft', className: 'bg-amber-100 text-amber-700' };
  };

  useEffect(() => {
    loadCategory();
  }, [categoryId]);

  useEffect(() => {
    if (!categoryId) return;
    loadSubcategories().catch(console.error);
  }, [categoryId]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Unable to load category</h2>
        <p className="text-muted-foreground mb-6">{error || 'Please verify the URL or return to the category list.'}</p>
        <Button variant="outline" onClick={() => router.push('/admin/categories')}>
          Go back to Categories
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-4" asChild>
            <Link href="/admin/categories">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to categories
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {category.name} Management
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Manage every section shown on the public page using the forms below. All actions update instantly using the
            new category content APIs.
          </p>
        </div>
        <Button variant="outline" onClick={() => {
          loadCategory();
          loadSubcategories();
        }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Category slug</p>
            <p className="font-semibold text-lg">/{category.slug}</p>
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Status</p>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {category.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Display Order</p>
            <p className="font-semibold">{category.display_order}</p>
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Category ID</p>
            <p className="text-sm font-mono break-all">{categoryId}</p>
          </div>
        </div>
      </div>

      <SectionCard
        icon={Edit}
        title="Category basics"
        description="Update primary metadata like slug, logo, and ordering before managing rich content."
      >
        <form onSubmit={onSaveCategory} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <Input
                value={categoryForm.name}
                onChange={(e) => updateCategoryForm({ name: e.target.value })}
                placeholder="e.g., UPSC"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Slug</label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => updateCategoryForm({ slug: e.target.value })}
                placeholder="upsc"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Display order</label>
              <Input
                type="number"
                inputMode="numeric"
                value={categoryForm.display_order}
                onChange={(e) => updateCategoryForm({ display_order: e.target.value })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={categoryForm.is_active ? 'true' : 'false'}
                onChange={(e) => updateCategoryForm({ is_active: e.target.value === 'true' })}
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
              onChange={(e) => updateCategoryForm({ description: e.target.value })}
              placeholder="Short copy that shows on listing cards"
            />
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <div className="w-24 h-24 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Category logo" className="w-full h-full object-contain p-2" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Logo</label>
              <Input type="file" accept="image/*" onChange={handleLogoChange} />
              <p className="text-xs text-muted-foreground">Recommended square image • PNG / SVG</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetCategoryForm}>
              Reset changes
            </Button>
            <Button type="submit" disabled={savingCategory}>
              {savingCategory ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving…
                </span>
              ) : (
                'Save category'
              )}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        icon={Layers}
        title="Subcategories"
        description="Drag to reorder subcategory cards for the homepage &quot;Choose your exam&quot; section"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-muted-foreground">
            Create, reorder, and manage all exam subcategories for this category.
          </p>
          <Button size="sm" onClick={openCreateSubcategoryDialog}>
            + Add Subcategory
          </Button>
        </div>
        {savingOrder && (
          <p className="text-xs text-muted-foreground animate-pulse">Saving order...</p>
        )}
        {subcategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subcategories found for this category.</p>
        ) : (
          <div className="space-y-3">
            {subcategories.map((sub, index) => {
              const status = getSubcategoryStatus(sub.is_active);
              const isDragging = dragIndex === index;
              const isDragOver = dragOverIndex === index && dragIndex !== index;
              return (
                <div
                  key={sub.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  className={`border rounded-xl p-4 transition cursor-grab active:cursor-grabbing ${
                    isDragging
                      ? 'opacity-50 border-primary bg-primary/5'
                      : isDragOver
                      ? 'border-primary border-dashed bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center pt-1 text-muted-foreground hover:text-foreground">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    {sub.logo_url && (
                      <img src={sub.logo_url} alt="" className="w-10 h-10 object-contain rounded flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-lg">{sub.name}</p>
                        <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                          /{sub.slug}
                        </span>
                      </div>
                      {sub.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">{sub.description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground/80 italic">No description provided</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/${sub.slug}`} target="_blank">
                        View page
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/subcategories/${sub.id}`}>
                        Manage
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setSubcategoryDeleteTarget(sub)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={Edit}
        title="Page Content"
        description="Use the block editor to manage all page content — custom tabs, sections, and blocks."
      >
        <div className="flex flex-col items-center gap-4 py-6">
          <p className="text-sm text-muted-foreground text-center max-w-lg">
            Open the page editor to add and manage content for this category page.
            You can create custom tabs, add sections with rich content blocks, manage SEO, and more.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/admin/categories/${categoryId}/editor`}>
                Open Page Editor
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/${category.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public Page
              </Link>
            </Button>
          </div>
        </div>
      </SectionCard>

      <Dialog
        open={showCreateSubcategory}
        onOpenChange={(open) => {
          if (!open && !creatingSubcategory) setShowCreateSubcategory(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create subcategory</DialogTitle>
            <DialogDescription>Add a new exam variant under this category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name *</label>
              <Input
                value={createSubcategoryForm.name}
                onChange={(e) => setCreateSubcategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. SSC CGL"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Slug</label>
              <Input
                value={createSubcategoryForm.slug}
                onChange={(e) => setCreateSubcategoryForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="Auto-generated when blank"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <Textarea
                rows={3}
                value={createSubcategoryForm.description}
                onChange={(e) => setCreateSubcategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional short description"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Display order</label>
                <Input
                  type="number"
                  value={createSubcategoryForm.display_order}
                  onChange={(e) => setCreateSubcategoryForm((prev) => ({ ...prev, display_order: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  value={createSubcategoryForm.is_active ? 'true' : 'false'}
                  onChange={(e) => setCreateSubcategoryForm((prev) => ({ ...prev, is_active: e.target.value === 'true' }))}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Logo</label>
              <Input type="file" accept="image/*" onChange={handleCreateLogoChange} />
              <p className="text-xs text-muted-foreground">Optional. Appears on homepage "Choose your exam" cards.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateSubcategory(false)} disabled={creatingSubcategory}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubcategory} disabled={creatingSubcategory}>
              {creatingSubcategory ? 'Creating…' : 'Create Subcategory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!subcategoryDeleteTarget} onOpenChange={(open) => !open && !deletingSubcategory && setSubcategoryDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subcategory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{subcategoryDeleteTarget?.name}&quot; and all its associated content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSubcategory}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingSubcategory}
              onClick={handleDeleteSubcategory}
            >
              {deletingSubcategory ? 'Deleting...' : 'Yes, delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
