"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Blocks,
  FilePlus,
  Loader2,
  RefreshCcw,
  Save,
  Search,
  Upload
} from "lucide-react";

import { BlockEditor } from "@/components/PageEditor/BlockEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

import { blogService, Blog, BlogSection } from "@/lib/api/blogService";
import { blogAdminService, BlogPayload } from "@/lib/api/blogAdminService";

interface FilterState {
  search: string;
  category: string;
  published: "all" | "published" | "draft";
}

interface BlogFormState {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string;
  featured_image_url: string;
  canonical_url: string;
  is_published: boolean;
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
}

const DEFAULT_FORM_STATE: BlogFormState = {
  title: "",
  slug: "",
  excerpt: "",
  category: "",
  tags: "",
  featured_image_url: "",
  canonical_url: "",
  is_published: false,
  is_featured: false,
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  og_title: "",
  og_description: "",
  og_image_url: ""
};

export default function AdminBlogsPage() {
  const { toast } = useToast();

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "",
    published: "all"
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);

  const [formState, setFormState] = useState<BlogFormState>(DEFAULT_FORM_STATE);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [sections, setSections] = useState<BlogSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsSaving, setSectionsSaving] = useState(false);

  const selectedBlog = useMemo(() => blogs.find((blog) => blog.id === selectedBlogId) || null, [blogs, selectedBlogId]);

  useEffect(() => {
    (async () => {
      const data = await blogService.getCategories();
      setCategories(data);
    })();
  }, []);

  useEffect(() => {
    fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.category, filters.published]);

  useEffect(() => {
    if (!selectedBlog) {
      setFormState(DEFAULT_FORM_STATE);
      setSections([]);
      return;
    }

    setFormState({
      title: selectedBlog.title || "",
      slug: selectedBlog.slug || "",
      excerpt: selectedBlog.excerpt || "",
      category: selectedBlog.category || "",
      tags: (selectedBlog.tags || []).join(", "),
      featured_image_url: selectedBlog.featured_image_url || "",
      canonical_url: selectedBlog.canonical_url || "",
      is_published: selectedBlog.is_published,
      is_featured: selectedBlog.is_featured,
      meta_title: selectedBlog.meta_title || "",
      meta_description: selectedBlog.meta_description || "",
      meta_keywords: selectedBlog.meta_keywords || "",
      og_title: selectedBlog.og_title || "",
      og_description: selectedBlog.og_description || "",
      og_image_url: selectedBlog.og_image_url || ""
    });

    loadSections(selectedBlog.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlog?.id]);

  const fetchBlogs = async () => {
    try {
      setLoadingBlogs(true);
      const response = await blogAdminService.getBlogs({
        page: 1,
        limit: 50,
        search: filters.search || undefined,
        category: filters.category || undefined,
        published:
          filters.published === "all" ? undefined : filters.published === "published"
      });

      setBlogs(response.data);

      if (response.data.length > 0) {
        const existing = response.data.find((b) => b.id === selectedBlogId);
        setSelectedBlogId(existing ? existing.id : response.data[0].id);
      } else {
        setSelectedBlogId(null);
      }
    } catch (error: any) {
      console.error("Failed to load blogs", error);
      toast({
        title: "Failed to load blogs",
        description: error?.message || "Unexpected error",
        variant: "destructive"
      });
    } finally {
      setLoadingBlogs(false);
    }
  };

  const loadSections = async (blogId: string) => {
    try {
      setSectionsLoading(true);
      const content = await blogAdminService.getBlogContent(blogId);
      setSections(content);
    } catch (error: any) {
      toast({
        title: "Failed to load content",
        description: error?.message,
        variant: "destructive"
      });
    } finally {
      setSectionsLoading(false);
    }
  };

  const handleCreateBlog = async () => {
    try {
      setSavingMetadata(true);
      const newBlog = await blogAdminService.createBlog({ title: "Untitled Blog" });
      toast({ title: "Blog draft created" });
      await fetchBlogs();
      setSelectedBlogId(newBlog.id);
    } catch (error: any) {
      toast({
        title: "Failed to create blog",
        description: error?.message,
        variant: "destructive"
      });
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleFormChange = (field: keyof BlogFormState, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveMetadata = async () => {
    if (!selectedBlog) return;
    try {
      setSavingMetadata(true);
      const payload: BlogPayload = {
        title: formState.title,
        slug: formState.slug,
        excerpt: formState.excerpt,
        category: formState.category,
        tags: formState.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        featured_image_url: formState.featured_image_url,
        canonical_url: formState.canonical_url,
        is_published: formState.is_published,
        is_featured: formState.is_featured,
        meta_title: formState.meta_title,
        meta_description: formState.meta_description,
        meta_keywords: formState.meta_keywords,
        og_title: formState.og_title,
        og_description: formState.og_description,
        og_image_url: formState.og_image_url
      };
      const updated = await blogAdminService.updateBlog(selectedBlog.id, payload);
      toast({ title: "Blog details saved" });
      setBlogs((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error?.message,
        variant: "destructive"
      });
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleUploadFeaturedImage = async (file: File) => {
    if (!selectedBlog) return;
    try {
      setUploadingImage(true);
      const result = await blogAdminService.uploadMedia(selectedBlog.id, file, "featured-images");
      handleFormChange("featured_image_url", result.file_url);
      toast({ title: "Image uploaded" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message,
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveSections = async (updatedSections: BlogSection[]) => {
    if (!selectedBlog) return;
    try {
      setSectionsSaving(true);
      await blogAdminService.bulkSyncBlogContent(selectedBlog.id, updatedSections);
      toast({ title: "Content saved" });
      setSections(updatedSections);
    } catch (error: any) {
      toast({
        title: "Failed to save content",
        description: error?.message,
        variant: "destructive"
      });
    } finally {
      setSectionsSaving(false);
    }
  };

  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesSearch = filters.search
        ? blog.title.toLowerCase().includes(filters.search.toLowerCase())
        : true;
      const matchesCategory = filters.category ? blog.category === filters.category : true;
      const matchesPublished =
        filters.published === "all"
          ? true
          : filters.published === "published"
          ? blog.is_published
          : !blog.is_published;
      return matchesSearch && matchesCategory && matchesPublished;
    });
  }, [blogs, filters]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Link href="/admin" className="inline-flex items-center gap-2 text-blue-600">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </Link>
              <span>/</span>
              <span>Blogs</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Blog Manager</h1>
            <p className="text-gray-600 mt-1">Create, edit, and publish articles using the block editor</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={fetchBlogs} disabled={loadingBlogs}>
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button onClick={handleCreateBlog} disabled={savingMetadata}>
              {savingMetadata ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FilePlus className="w-4 h-4 mr-2" />}
              New Blog
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search blogs"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {["all", "published", "draft"].map((pill) => (
                <button
                  key={pill}
                  onClick={() => setFilters((prev) => ({ ...prev, published: pill as FilterState["published"] }))}
                  className={`px-3 py-1 rounded-full border ${
                    filters.published === pill ? "border-blue-600 text-blue-600" : "border-gray-200 text-gray-500"
                  }`}
                >
                  {pill === "all" ? "All" : pill === "published" ? "Published" : "Drafts"}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-500">Categories</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-1 rounded-full text-sm ${
                    !filters.category ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                  onClick={() => setFilters((prev) => ({ ...prev, category: "" }))}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.category === category ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                    onClick={() => setFilters((prev) => ({ ...prev, category }))}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
            {loadingBlogs && (
              <div className="p-6 text-center text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading blogs...
              </div>
            )}
            {!loadingBlogs && filteredBlogs.length === 0 && (
              <div className="p-6 text-center text-gray-500">No blogs found</div>
            )}
            {!loadingBlogs &&
              filteredBlogs.map((blog) => (
                <button
                  key={blog.id}
                  onClick={() => setSelectedBlogId(blog.id)}
                  className={`w-full text-left px-5 py-4 flex flex-col gap-2 hover:bg-blue-50 transition ${
                    selectedBlog?.id === blog.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 line-clamp-1">{blog.title}</p>
                    <Badge variant={blog.is_published ? "default" : "secondary"}>
                      {blog.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{blog.excerpt || "No excerpt"}</p>
                  <div className="text-xs text-gray-400 flex items-center gap-3">
                    <span>{blog.category || "Uncategorized"}</span>
                    {blog.is_featured && <span className="text-amber-600">Featured</span>}
                  </div>
                </button>
              ))}
          </div>
        </aside>

        {/* Main area */}
        <section className="lg:col-span-8 space-y-6">
          {selectedBlog ? (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase text-gray-500 font-semibold">Blog Details</p>
                    <h2 className="text-xl font-bold text-gray-900">Metadata</h2>
                  </div>
                  <div className="flex gap-3">
                    <Link href={`/blogs/${selectedBlog.slug}`} target="_blank" className="text-sm text-blue-600 underline">
                      View Live
                    </Link>
                    <Button onClick={handleSaveMetadata} disabled={savingMetadata}>
                      {savingMetadata ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Details
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Title</label>
                    <Input value={formState.title} onChange={(e) => handleFormChange("title", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Slug</label>
                    <Input value={formState.slug} onChange={(e) => handleFormChange("slug", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <Input value={formState.category} onChange={(e) => handleFormChange("category", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tags (comma separated)</label>
                    <Input value={formState.tags} onChange={(e) => handleFormChange("tags", e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Excerpt</label>
                  <Textarea rows={3} value={formState.excerpt} onChange={(e) => handleFormChange("excerpt", e.target.value)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Featured Image URL</label>
                    <Input
                      value={formState.featured_image_url}
                      onChange={(e) => handleFormChange("featured_image_url", e.target.value)}
                    />
                    <label className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      {uploadingImage ? "Uploading..." : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) handleUploadFeaturedImage(file);
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Canonical URL</label>
                    <Input value={formState.canonical_url} onChange={(e) => handleFormChange("canonical_url", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">Published</p>
                      <p className="text-sm text-gray-500">Visible on blogs page</p>
                    </div>
                    <Switch
                      checked={formState.is_published}
                      onCheckedChange={(checked) => handleFormChange("is_published", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">Featured</p>
                      <p className="text-sm text-gray-500">Highlight in hero</p>
                    </div>
                    <Switch
                      checked={formState.is_featured}
                      onCheckedChange={(checked) => handleFormChange("is_featured", checked)}
                    />
                  </div>
                </div>
              </div>

              {/* SEO */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <Blocks className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm uppercase text-gray-500 font-semibold">SEO</p>
                    <h2 className="text-xl font-bold text-gray-900">Search Metatags</h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Meta Title</label>
                    <Input value={formState.meta_title} onChange={(e) => handleFormChange("meta_title", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Meta Description</label>
                    <Textarea
                      rows={3}
                      value={formState.meta_description}
                      onChange={(e) => handleFormChange("meta_description", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Meta Keywords</label>
                  <Input value={formState.meta_keywords} onChange={(e) => handleFormChange("meta_keywords", e.target.value)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">OG Title</label>
                    <Input value={formState.og_title} onChange={(e) => handleFormChange("og_title", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">OG Description</label>
                    <Textarea
                      rows={3}
                      value={formState.og_description}
                      onChange={(e) => handleFormChange("og_description", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">OG Image URL</label>
                    <Input value={formState.og_image_url} onChange={(e) => handleFormChange("og_image_url", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Search Preview</label>
                    <div className="border border-gray-200 rounded-xl p-3">
                      <p className="text-xs text-gray-500">bharatmock.com › blogs</p>
                      <p className="text-base font-semibold text-blue-700">
                        {formState.meta_title || formState.title || "Meta title preview"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formState.meta_description || formState.excerpt || "Meta description preview"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Block Editor */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm uppercase text-gray-500 font-semibold">Content Builder</p>
                    <h2 className="text-xl font-semibold text-gray-900">Block Editor</h2>
                  </div>
                  <p className="text-sm text-gray-500">
                    {sectionsLoading ? "Loading sections..." : `${sections.length} sections`}
                  </p>
                </div>
                {sectionsLoading ? (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading content...
                  </div>
                ) : (
                  <BlockEditor
                    sections={sections as any}
                    onSave={handleSaveSections as any}
                    autosaveKey={selectedBlog ? `blog:${selectedBlog.id}` : undefined}
                  />
                )}
                {sectionsSaving && (
                  <p className="text-sm text-gray-500 mt-2">Saving content...</p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
              Select a blog from the left panel to start editing or create a new blog.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
