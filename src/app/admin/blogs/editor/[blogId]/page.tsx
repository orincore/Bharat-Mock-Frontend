"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Upload,
  ChevronLeft,
  Blocks
} from "lucide-react";

import { BlockEditor, BlockEditorMediaUploadConfig } from "@/components/PageEditor/BlockEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

import { Badge } from "@/components/ui/badge";
import { blogAdminService, BlogPayload } from "@/lib/api/blogAdminService";
import { BlogSection } from "@/lib/api/blogService";

type BlogStatus = "draft" | "pending" | "published";

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
  status: BlogStatus;
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
  og_image_url: "",
  status: "draft"
};

export default function AdminBlogEditorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ blogId: string }>();
  const blogId = params.blogId;
  const isNew = blogId === "new";

  const [formState, setFormState] = useState<BlogFormState>(DEFAULT_FORM_STATE);
  const [sections, setSections] = useState<BlogSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionsSaving, setSectionsSaving] = useState(false);
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);
  const [localBlogId, setLocalBlogId] = useState<string | undefined>(!isNew ? blogId : undefined);
  const featuredImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLocalBlogId(!isNew ? blogId : undefined);
  }, [blogId, isNew]);

  const effectiveBlogId = localBlogId;

  const applyStatus = (nextStatus: BlogStatus) => {
    setFormState((prev) => ({
      ...prev,
      status: nextStatus,
      is_published: nextStatus === "published"
    }));
  };

  useEffect(() => {
    if (isNew && !localBlogId) {
      setFormState({ ...DEFAULT_FORM_STATE });
      setSections([]);
      setLoading(false);
      return;
    }

    const loadBlog = async () => {
      try {
        setLoading(true);
        const [blog, blogSections] = await Promise.all([
          blogAdminService.getBlogById(localBlogId || blogId),
          blogAdminService.getBlogContent(localBlogId || blogId)
        ]);

        if (!isNew) {
          setLocalBlogId(blogId);
        }

        setFormState({
          title: blog.title || "",
          slug: blog.slug || "",
          excerpt: blog.excerpt || "",
          category: blog.category || "",
          tags: (blog.tags || []).join(", "),
          featured_image_url: blog.featured_image_url || "",
          canonical_url: blog.canonical_url || "",
          is_published: blog.is_published,
          is_featured: blog.is_featured,
          meta_title: blog.meta_title || "",
          meta_description: blog.meta_description || "",
          meta_keywords: blog.meta_keywords || "",
          og_title: blog.og_title || "",
          og_description: blog.og_description || "",
          og_image_url: blog.og_image_url || "",
          status: (blog.status as BlogStatus) || (blog.is_published ? "published" : "draft")
        });
        setSections(blogSections || []);
      } catch (error: any) {
        toast({
          title: "Failed to load blog",
          description: error?.message || "Unexpected error",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadBlog();
  }, [blogId, isNew, localBlogId, toast]);

  const createBlogRecord = async (targetStatus: BlogStatus = "draft", notify = true) => {
    const payload = buildPayload(targetStatus);
    const created = await blogAdminService.createBlog(payload);
    setLocalBlogId(created.id);
    setFormState((prev) => ({
      ...prev,
      slug: created.slug || prev.slug,
      status: (created.status as BlogStatus) || targetStatus,
      is_published: ((created.status as BlogStatus) || targetStatus) === "published"
    }));
    if (notify) {
      toast({
        title: targetStatus === "published" ? "Blog published" : "Draft created",
        description: targetStatus === "published" ? "Blog is live now." : "Continue editing your draft."
      });
    }
    router.replace(`/admin/blogs/editor/${created.id}`);
    return created;
  };

  const handleFormChange = (field: keyof BlogFormState, value: string | boolean) => {
    if (field === "is_published") {
      applyStatus(value ? "published" : "draft");
      return;
    }
    if (field === "status") {
      applyStatus(value as BlogStatus);
      return;
    }
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const buildPayload = (targetStatus: BlogStatus): BlogPayload => ({
    title: formState.title,
    slug: formState.slug || undefined,
    excerpt: formState.excerpt,
    category: formState.category,
    tags: formState.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    featured_image_url: formState.featured_image_url,
    canonical_url: formState.canonical_url,
    status: targetStatus,
    is_published: targetStatus === "published",
    is_featured: formState.is_featured,
    meta_title: formState.meta_title,
    meta_description: formState.meta_description,
    meta_keywords: formState.meta_keywords,
    og_title: formState.og_title,
    og_description: formState.og_description,
    og_image_url: formState.og_image_url
  });

  const handleSave = async (nextStatus?: BlogStatus) => {
    try {
      setSaving(true);
      if (!formState.title.trim()) {
        toast({
          title: "Title required",
          description: "Please enter a blog title before saving.",
          variant: "destructive"
        });
        return;
      }

      let targetId = effectiveBlogId;
      const targetStatus = nextStatus || formState.status || "draft";
      const payload = buildPayload(targetStatus);
      let savedBlog: any = null;

      if (!targetId) {
        savedBlog = await createBlogRecord(targetStatus, false);
        targetId = savedBlog.id;
        toast({ title: targetStatus === "published" ? "Blog published" : "Draft created" });
      } else {
        savedBlog = await blogAdminService.updateBlog(targetId, payload);
        toast({ title: targetStatus === "published" ? "Blog published" : "Blog updated" });
      }

      const resolvedStatus: BlogStatus = savedBlog?.status || targetStatus;
      setFormState((prev) => ({
        ...prev,
        slug: savedBlog?.slug || prev.slug,
        status: resolvedStatus,
        is_published: resolvedStatus === "published"
      }));

      if (targetId) {
        setSectionsSaving(true);
        await blogAdminService.bulkSyncBlogContent(targetId, sections);
        toast({ title: "Content saved" });
      }
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "Unexpected error",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
      setSectionsSaving(false);
    }
  };

  const handleUploadFeaturedImage = async (file: File) => {
    try {
      setUploadingFeaturedImage(true);
      let targetId = effectiveBlogId;
      if (!targetId) {
        const draft = await createBlogRecord("draft");
        targetId = draft.id;
      }
      const media = await blogAdminService.uploadMedia(targetId, file, "featured-images");
      handleFormChange("featured_image_url", media.file_url);
      toast({ title: "Featured image uploaded" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Unexpected error",
        variant: "destructive"
      });
    } finally {
      setUploadingFeaturedImage(false);
    }
  };

  const mediaUploadConfig: BlockEditorMediaUploadConfig | undefined = useMemo(() => {
    if (!effectiveBlogId) return undefined;
    return {
      maxSizeMB: 150,
      onUpload: async (file) => {
        const folder = "blocks";
        const result = await blogAdminService.uploadMedia(effectiveBlogId, file, folder);
        return {
          url: result.file_url,
          alt: result.file_name
        };
      },
      onUploadError: (message: string) => {
        toast({ title: "Upload failed", description: message, variant: "destructive" });
      },
      onUploadSuccess: () => {
        toast({ title: "Media uploaded" });
      }
    };
  }, [effectiveBlogId, toast]);

  const autosaveKey = useMemo(() => {
    if (effectiveBlogId) return `blog:${effectiveBlogId}`;
    return "blog:draft";
  }, [effectiveBlogId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading blog...
      </div>
    );
  }

  const statusLabel = formState.status === "published" ? "Published" : formState.status === "pending" ? "Pending Review" : "Draft";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin/blogs")}> 
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/admin" className="inline-flex items-center gap-2 text-blue-600">
                  <ArrowLeft className="w-4 h-4" /> Dashboard
                </Link>
                <span>/</span>
                <Link href="/admin/blogs" className="text-blue-600">Blogs</Link>
                <span>/</span>
                <span>{isNew ? "New Blog" : formState.title || "Editing"}</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">
                {isNew ? "Create Blog" : `Edit: ${formState.title || "Untitled"}`}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <span>Current status:</span>
                <Badge className="capitalize">{statusLabel}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={saving || sectionsSaving}
            >
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave('published')}
              disabled={saving || sectionsSaving}
            >
              {(saving || sectionsSaving) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> {formState.status === 'published' ? 'Update' : 'Publish'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase text-gray-500 font-semibold">Blog Details</p>
              <h2 className="text-xl font-bold text-gray-900">Metadata</h2>
            </div>
            <span className="text-sm text-gray-500">
              {effectiveBlogId ? `Blog ID: ${effectiveBlogId}` : "Draft not saved"}
            </span>
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
              <div className="mt-2 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => featuredImageInputRef.current?.click()}
                  disabled={uploadingFeaturedImage}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingFeaturedImage ? "Uploading..." : "Upload Image"}
                </Button>
                <p className="text-xs text-gray-500">JPEG, PNG, WebP up to 150MB.</p>
              </div>
              <input
                ref={featuredImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUploadFeaturedImage(file);
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Canonical URL</label>
              <Input value={formState.canonical_url} onChange={(e) => handleFormChange("canonical_url", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
              <div>
                <p className="font-semibold text-gray-900">Publish Status</p>
                <p className="text-sm text-gray-500">Toggle to quickly publish or revert to draft.</p>
              </div>
              <Switch
                checked={formState.status === "published"}
                onCheckedChange={(checked) => applyStatus(checked ? "published" : "draft")}
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
              <Textarea rows={3} value={formState.meta_description} onChange={(e) => handleFormChange("meta_description", e.target.value)} />
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
              <Textarea rows={3} value={formState.og_description} onChange={(e) => handleFormChange("og_description", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">OG Image URL</label>
              <Input value={formState.og_image_url} onChange={(e) => handleFormChange("og_image_url", e.target.value)} />
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
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
              onSave={(updated) => {
                void updated;
                handleSave(formState.status);
              }}
              autosaveKey={autosaveKey}
              mediaUploadConfig={mediaUploadConfig}
              onSectionsChange={(next) => setSections(next as BlogSection[])}
            />
          )}

          {sectionsSaving && (
            <p className="text-sm text-gray-500 mt-2">Saving content...</p>
          )}
        </div>
      </div>
    </div>
  );
}
