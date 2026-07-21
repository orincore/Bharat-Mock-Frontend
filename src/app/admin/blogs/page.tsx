"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  PenSquare,
  Plus,
  RefreshCcw,
  Search,
  Star,
  StarOff,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

import { blogService, Blog } from "@/lib/api/blogService";
import { blogAdminService } from "@/lib/api/blogAdminService";
import { Breadcrumbs, AdminBreadcrumb } from "@/components/ui/breadcrumbs";

type StatusFilter = "all" | "published" | "pending" | "draft";

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Published", value: "published" },
  { label: "Pending Review", value: "pending" },
  { label: "Drafts", value: "draft" }
];

function getBlogStatus(blog: Blog): Exclude<StatusFilter, "all"> {
  const status = (blog.status as StatusFilter | undefined) || (blog.is_published ? "published" : "draft");
  if (status === "published") return "published";
  if (status === "pending") return "pending";
  return "draft";
}

export default function AdminBlogsPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [filters, setFilters] = useState({
    search: "",
    status: "all" as StatusFilter,
    category: "all",
    dateRange: "all",
    featuredOnly: false
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkActionProcessing, setBulkActionProcessing] = useState(false);

  // Quick edit state
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState<{ title: string; category: string; status: string; is_featured: boolean }>({ title: '', category: '', status: 'draft', is_featured: false });
  const [quickEditSaving, setQuickEditSaving] = useState(false);
  const [quickEditNewCategory, setQuickEditNewCategory] = useState(false);

  // Row action dropdown. Uses a data-attribute lookup instead of a single ref
  // because the trigger/menu markup is rendered twice (mobile card + desktop
  // row) and only one copy is visible at a time depending on viewport width.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-row-menu]')) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    (async () => {
      const data = await blogService.getCategories();
      setCategories(data);
    })();
  }, []);

  useEffect(() => {
    void fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.status, filters.category]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await blogAdminService.getBlogs({
        page: 1,
        limit: 50,
        search: filters.search || undefined,
        category: filters.category !== "all" ? filters.category : undefined,
        status: filters.status !== "all" ? (filters.status as "draft" | "pending" | "published") : undefined
      });
      setBlogs(response.data);
      setSelectedIds([]);
    } catch (error: any) {
      toast({
        title: "Failed to load blogs",
        description: error?.message || "Unexpected error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: blogs.length,
      published: 0,
      pending: 0,
      draft: 0
    };

    blogs.forEach((blog) => {
      const status = getBlogStatus(blog);
      counts[status] += 1;
    });

    return counts;
  }, [blogs]);

  const dateOptions = useMemo(() => {
    const map = new Map<string, string>();
    blogs.forEach((blog) => {
      const dateValue = blog.published_at || blog.updated_at || blog.created_at;
      if (!dateValue) return;
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return;
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      if (!map.has(value)) map.set(value, label);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [blogs]);

  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesSearch = filters.search
        ? blog.title.toLowerCase().includes(filters.search.toLowerCase())
        : true;
      const matchesCategory = filters.category === "all" ? true : blog.category === filters.category;
      const matchesStatus = filters.status === "all" ? true : getBlogStatus(blog) === filters.status;

      if (!matchesSearch || !matchesCategory || !matchesStatus) return false;

      if (filters.dateRange !== "all") {
        const dateValue = blog.published_at || blog.updated_at || blog.created_at;
        if (!dateValue) return false;
        const date = new Date(dateValue);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (value !== filters.dateRange) return false;
      }

      if (filters.featuredOnly && !blog.is_featured) return false;
      return true;
    });
  }, [blogs, filters]);

  const displayedBlogs = filteredBlogs;

  const allSelected = selectedIds.length > 0 && selectedIds.length === displayedBlogs.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < displayedBlogs.length;

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? displayedBlogs.map((blog) => blog.id) : []);
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleApplyBulkAction = async () => {
    if (!bulkAction || bulkAction === 'none') {
      toast({ title: 'Select an action', description: 'Choose a bulk action to apply.', variant: 'destructive' });
      return;
    }

    if (selectedIds.length === 0) {
      toast({ title: 'No posts selected', description: 'Select at least one blog to proceed.', variant: 'destructive' });
      return;
    }

    if (bulkAction === 'edit') {
      // Navigate to first selected blog editor
      router.push(`/admin/blogs/editor/${selectedIds[0]}`);
      return;
    }

    if (bulkAction === 'move-to-trash') {
      const confirmed = window.confirm(`Move ${selectedIds.length} post(s) to trash? This action cannot be undone.`);
      if (!confirmed) return;

      try {
        setBulkActionProcessing(true);
        await Promise.all(selectedIds.map((blogId) => blogAdminService.deleteBlog(blogId)));
        toast({ title: 'Moved to trash', description: `${selectedIds.length} post(s) deleted.` });
        setSelectedIds([]);
        setBulkAction('');
        await fetchBlogs();
      } catch (error: any) {
        toast({
          title: 'Failed to delete posts',
          description: error?.message || 'Unexpected error occurred',
          variant: 'destructive'
        });
      } finally {
        setBulkActionProcessing(false);
      }
    }

    if (bulkAction === 'publish') {
      try {
        setBulkActionProcessing(true);
        await Promise.all(selectedIds.map((id) => blogAdminService.updateBlog(id, { status: 'published', is_published: true })));
        toast({ title: 'Published', description: `${selectedIds.length} post(s) published.` });
        setSelectedIds([]);
        setBulkAction('');
        await fetchBlogs();
      } catch (error: any) {
        toast({ title: 'Failed to publish', description: error?.message, variant: 'destructive' });
      } finally {
        setBulkActionProcessing(false);
      }
    }

    if (bulkAction === 'draft') {
      try {
        setBulkActionProcessing(true);
        await Promise.all(selectedIds.map((id) => blogAdminService.updateBlog(id, { status: 'draft', is_published: false })));
        toast({ title: 'Moved to draft', description: `${selectedIds.length} post(s) set to draft.` });
        setSelectedIds([]);
        setBulkAction('');
        await fetchBlogs();
      } catch (error: any) {
        toast({ title: 'Failed', description: error?.message, variant: 'destructive' });
      } finally {
        setBulkActionProcessing(false);
      }
    }
  };

  const openQuickEdit = (blog: Blog) => {
    setQuickEditId(blog.id);
    const currentCategory = blog.category || '';
    setQuickEditData({
      title: blog.title,
      category: currentCategory,
      status: getBlogStatus(blog),
      is_featured: blog.is_featured,
    });
    // If the post's current category isn't in the known list (e.g. it was
    // typed in before this list existed), default straight to the "new
    // category" input so its value isn't silently dropped by the <select>.
    setQuickEditNewCategory(currentCategory !== '' && !categories.includes(currentCategory));
    setOpenMenuId(null);
  };

  const saveQuickEdit = async () => {
    if (!quickEditId) return;
    const category = quickEditData.category.trim();
    setQuickEditSaving(true);
    try {
      await blogAdminService.updateBlog(quickEditId, {
        title: quickEditData.title,
        category,
        status: quickEditData.status as any,
        is_published: quickEditData.status === 'published',
        is_featured: quickEditData.is_featured,
      });
      if (category && !categories.includes(category)) {
        setCategories((prev) => [...prev, category].sort());
      }
      toast({ title: 'Updated' });
      setQuickEditId(null);
      await fetchBlogs();
    } catch (e: any) {
      toast({ title: 'Failed to update', description: e?.message, variant: 'destructive' });
    } finally {
      setQuickEditSaving(false);
    }
  };

  const handleDelete = async (blogId: string) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await blogAdminService.deleteBlog(blogId);
      toast({ title: 'Deleted' });
      await fetchBlogs();
    } catch (e: any) {
      toast({ title: 'Failed to delete', description: e?.message, variant: 'destructive' });
    }
    setOpenMenuId(null);
  };

  const handleTogglePublish = async (blog: Blog) => {
    const newStatus = getBlogStatus(blog) === 'published' ? 'draft' : 'published';
    try {
      await blogAdminService.updateBlog(blog.id, { status: newStatus, is_published: newStatus === 'published' });
      toast({ title: newStatus === 'published' ? 'Published' : 'Unpublished' });
      await fetchBlogs();
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    }
    setOpenMenuId(null);
  };

  const handleToggleFeatured = async (blog: Blog) => {
    try {
      await blogAdminService.updateBlog(blog.id, { is_featured: !blog.is_featured });
      toast({ title: blog.is_featured ? 'Removed from featured' : 'Marked as featured' });
      await fetchBlogs();
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    }
    setOpenMenuId(null);
  };

  const formatDate = (blog: Blog) => {
    const date = blog.published_at || blog.updated_at || blog.created_at;
    try {
      return new Date(date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (error) {
      return "—";
    }
  };

  const handleStatusChange = (value: StatusFilter) => {
    setFilters((prev) => ({ ...prev, status: value }));
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <header className="bg-white border border-border rounded-3xl px-4 py-4 sm:px-6 sm:py-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Breadcrumbs
              items={[
                AdminBreadcrumb(),
                { label: 'Blogs' }
              ]}
              className="mb-2"
            />
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mt-2">Blogs</h1>
            <p className="text-muted-foreground">WordPress-style workflow for drafting, editing, and publishing your posts.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={fetchBlogs} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
            <Button onClick={() => router.push("/admin/blogs/editor/new")}> 
              <Plus className="w-4 h-4 mr-2" /> Add New
            </Button>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div className="bg-white border border-border rounded-3xl px-4 py-4 sm:px-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 justify-between border-b border-border/70 pb-4">
            <div className="flex flex-wrap gap-3 text-sm font-medium text-muted-foreground">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleStatusChange(tab.value)}
                  className={`${
                    filters.status === tab.value
                      ? "text-primary font-semibold"
                      : "hover:text-foreground"
                  } flex items-center gap-1 transition`}
                >
                  {tab.label}
                  <span className="text-xs text-muted-foreground">({statusCounts[tab.value] ?? 0})</span>
                </button>
              ))}
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                className="pl-11"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 text-sm">
            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value)}
              >
                <option value="none">Bulk actions</option>
                <option value="edit">Edit first selected</option>
                <option value="publish">Publish</option>
                <option value="draft">Set to Draft</option>
                <option value="move-to-trash">Move to Trash</option>
              </select>
              <Button size="sm" variant="outline" onClick={handleApplyBulkAction} disabled={bulkActionProcessing}>
                Apply
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filters.dateRange}
                onChange={(event) => setFilters((prev) => ({ ...prev, dateRange: event.target.value }))}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
              >
                <option value="all">All dates</option>
                {dateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.category}
                onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              size="sm"
              variant={filters.featuredOnly ? "default" : "ghost"}
              onClick={() => setFilters((prev) => ({ ...prev, featuredOnly: !prev.featuredOnly }))}
            >
              <TagIcon className="w-4 h-4 mr-2" /> Featured only
            </Button>
          </div>
        </div>

        <div className="bg-white border border-border rounded-3xl shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={(event) => toggleSelectAll(event.target.checked)}
                className="size-4 shrink-0 rounded border-border text-primary focus:ring-primary"
              />
              {selectedIds.length > 0 ? `${selectedIds.length} post(s) selected` : `${displayedBlogs.length} post(s)`}
            </label>
          </div>

          {/* Column header — desktop only. A CSS grid (not an HTML table) so
              every column has a hard pixel track that content can never spill
              out of; text-heavy cells just truncate inside their own track. */}
          <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_110px_140px_120px_44px] lg:grid-cols-[minmax(0,1fr)_110px_140px_150px_120px_44px] gap-x-4 items-center px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
            <span>Title</span>
            <span>Status</span>
            <span>Category</span>
            <span className="hidden lg:block">Tags</span>
            <span>Date</span>
            <span />
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 inline-block animate-spin" /> Loading posts...
            </div>
          ) : displayedBlogs.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              No posts match your filters.
            </div>
          ) : (
            displayedBlogs.map((blog) => {
              const status = getBlogStatus(blog);
              const isQuickEditing = quickEditId === blog.id;

              const statusBadge = (
                <Badge
                  variant={status === "published" ? "default" : status === "pending" ? "secondary" : "outline"}
                  className="capitalize"
                >
                  {status}
                </Badge>
              );

              const titleBlock = (
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/admin/blogs/editor/${blog.id}`}
                      className="font-semibold text-foreground hover:text-primary line-clamp-1 break-words"
                    >
                      {blog.title}
                    </Link>
                    {blog.is_featured && <Badge className="bg-amber-100 text-amber-700 shrink-0">Featured</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 break-words">
                    {blog.excerpt || "No excerpt provided"}
                  </p>
                  <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap gap-3">
                    <button type="button" className="hover:text-primary"
                      onClick={() => router.push(`/admin/blogs/editor/${blog.id}`)}>
                      Edit
                    </button>
                    <span aria-hidden="true">|</span>
                    <button type="button" className="hover:text-primary"
                      onClick={() => openQuickEdit(blog)}>
                      Quick Edit
                    </button>
                    <span aria-hidden="true">|</span>
                    <button type="button" className="hover:text-destructive text-destructive/70"
                      onClick={() => handleDelete(blog.id)}>
                      Trash
                    </button>
                    <span aria-hidden="true">|</span>
                    <Link href={`/blogs/${blog.slug}`} target="_blank" className="hover:text-primary">
                      View
                    </Link>
                  </div>
                </div>
              );

              const tagsBlock = blog.tags && blog.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {blog.tags.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="inline-block px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs truncate max-w-[80px]">{tag}</span>
                  ))}
                  {blog.tags.length > 2 && (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">+{blog.tags.length - 2}</span>
                  )}
                </div>
              ) : <span className="text-muted-foreground text-sm">—</span>;

              const rowMenu = (
                <div data-row-menu className="relative inline-block">
                  <Button variant="ghost" size="icon"
                    onClick={() => setOpenMenuId(openMenuId === blog.id ? null : blog.id)}>
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                  {openMenuId === blog.id && (
                    <div className="absolute right-0 top-10 z-50 w-44 bg-white border border-border rounded-xl shadow-lg py-1 text-sm">
                      <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition"
                        onClick={() => { router.push(`/admin/blogs/editor/${blog.id}`); setOpenMenuId(null); }}>
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition"
                        onClick={() => openQuickEdit(blog)}>
                        <PenSquare className="h-3.5 w-3.5" /> Quick Edit
                      </button>
                      <Link href={`/blogs/${blog.slug}`} target="_blank"
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition"
                        onClick={() => setOpenMenuId(null)}>
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </Link>
                      <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition"
                        onClick={() => handleTogglePublish(blog)}>
                        {status === 'published'
                          ? <><EyeOff className="h-3.5 w-3.5" /> Unpublish</>
                          : <><Eye className="h-3.5 w-3.5" /> Publish</>}
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition"
                        onClick={() => handleToggleFeatured(blog)}>
                        {blog.is_featured
                          ? <><StarOff className="h-3.5 w-3.5" /> Unfeature</>
                          : <><Star className="h-3.5 w-3.5" /> Feature</>}
                      </button>
                      <div className="border-t border-border my-1" />
                      <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-destructive/10 text-destructive transition"
                        onClick={() => handleDelete(blog.id)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );

              const quickEditForm = isQuickEditing && (
                <div className="border-b border-border bg-blue-50/60 border-l-4 border-l-primary px-4 py-3">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Title</label>
                      <Input value={quickEditData.title}
                        onChange={e => setQuickEditData(p => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div className="w-48 space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
                      {quickEditNewCategory ? (
                        <div className="space-y-1">
                          <Input
                            autoFocus
                            placeholder="New category name"
                            value={quickEditData.category}
                            onChange={e => setQuickEditData(p => ({ ...p, category: e.target.value }))}
                          />
                          {categories.length > 0 && (
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline"
                              onClick={() => setQuickEditNewCategory(false)}
                            >
                              Choose existing category
                            </button>
                          )}
                        </div>
                      ) : (
                        <select
                          value={quickEditData.category}
                          onChange={e => {
                            if (e.target.value === '__new__') {
                              setQuickEditNewCategory(true);
                              setQuickEditData(p => ({ ...p, category: '' }));
                            } else {
                              setQuickEditData(p => ({ ...p, category: e.target.value }));
                            }
                          }}
                          className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                          <option value="__new__">+ Create new category…</option>
                        </select>
                      )}
                    </div>
                    <div className="w-36 space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                      <select value={quickEditData.status}
                        onChange={e => setQuickEditData(p => ({ ...p, status: e.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm">
                        <option value="draft">Draft</option>
                        <option value="pending">Pending Review</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pb-1">
                      <input type="checkbox" id={`feat-${blog.id}`} checked={quickEditData.is_featured}
                        onChange={e => setQuickEditData(p => ({ ...p, is_featured: e.target.checked }))}
                        className="size-4 rounded border-border text-primary" />
                      <label htmlFor={`feat-${blog.id}`} className="text-sm">Featured</label>
                    </div>
                    <div className="flex gap-2 pb-1">
                      <Button size="sm" onClick={saveQuickEdit} disabled={quickEditSaving}>
                        {quickEditSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Update
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setQuickEditId(null)}>
                        <X className="h-3.5 w-3.5" /> Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              );

              return (
                <React.Fragment key={blog.id}>
                  {/* Mobile card — below md there's no room for a multi-column
                      grid, so every field is stacked instead of hidden. */}
                  <div className={`md:hidden border-b border-border px-4 py-3 ${isQuickEditing ? 'bg-muted/20' : ''}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(blog.id)}
                        onChange={() => toggleSelectRow(blog.id)}
                        className="mt-1 size-4 shrink-0 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          {titleBlock}
                          {rowMenu}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2">
                          {statusBadge}
                          <span>{blog.category || "Uncategorized"}</span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(blog)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop row — CSS grid, same column tracks as the header above. */}
                  <div className={`hidden md:grid md:grid-cols-[minmax(0,1fr)_110px_140px_120px_44px] lg:grid-cols-[minmax(0,1fr)_110px_140px_150px_120px_44px] gap-x-4 items-center px-4 py-3 border-b border-border hover:bg-muted/30 ${isQuickEditing ? 'bg-muted/20' : ''}`}>
                    <div className="min-w-0 flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(blog.id)}
                        onChange={() => toggleSelectRow(blog.id)}
                        className="mt-1 size-4 shrink-0 rounded border-border text-primary focus:ring-primary"
                      />
                      {titleBlock}
                    </div>
                    <div className="min-w-0">{statusBadge}</div>
                    <div className="min-w-0 truncate text-sm text-muted-foreground" title={blog.category || "Uncategorized"}>
                      {blog.category || "Uncategorized"}
                    </div>
                    <div className="hidden lg:block min-w-0">{tagsBlock}</div>
                    <div className="min-w-0 text-sm text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                      {formatDate(blog)}
                    </div>
                    <div className="min-w-0 text-right">{rowMenu}</div>
                  </div>

                  {quickEditForm}
                </React.Fragment>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
