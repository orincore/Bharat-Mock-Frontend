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
  Blocks,
  Search,
  X,
  User
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
  robots_meta: string;
  structured_data: string;
  status: BlogStatus;
  isCurrentAffairsNote: boolean;
  currentAffairsTag: string;
  author_id: string;
  author_name: string; // display only
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
  robots_meta: "index,follow",
  structured_data: "",
  status: "draft",
  isCurrentAffairsNote: false,
  currentAffairsTag: "",
  author_id: "",
  author_name: ""
};

export default function AdminBlogEditorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ blogId: string }>();
  const blogId = params?.blogId ?? '';
  const isNew = blogId === "new";

  const [formState, setFormState] = useState<BlogFormState>(DEFAULT_FORM_STATE);
  const [sections, setSections] = useState<BlogSection[]>([]);
  const latestSectionsRef = useRef<BlogSection[]>([]);
  latestSectionsRef.current = sections;
  const [loading, setLoading] = useState(true);
  const [sectionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionsSaving, setSectionsSaving] = useState(false);
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);
  const [localBlogId, setLocalBlogId] = useState<string | undefined>(!isNew ? blogId : undefined);
  const featuredImageInputRef = useRef<HTMLInputElement | null>(null);

  // Author picker state
  const [authorSearch, setAuthorSearch] = useState('');
  const [authorResults, setAuthorResults] = useState<{ id: string; name: string; email: string; avatar_url?: string; role: string }[]>([]);
  const [authorSearchLoading, setAuthorSearchLoading] = useState(false);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const authorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authorWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (authorWrapperRef.current && !authorWrapperRef.current.contains(e.target as Node)) {
        setShowAuthorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAuthorSearch = (value: string) => {
    setAuthorSearch(value);
    if (authorDebounceRef.current) clearTimeout(authorDebounceRef.current);
    if (!value.trim()) { setAuthorResults([]); setShowAuthorDropdown(false); return; }
    authorDebounceRef.current = setTimeout(async () => {
      setAuthorSearchLoading(true);
      setShowAuthorDropdown(true);
      try {
        const results = await blogAdminService.searchUsers(value.trim());
        setAuthorResults(results);
      } catch { setAuthorResults([]); }
      finally { setAuthorSearchLoading(false); }
    }, 300);
  };

  const selectAuthor = (u: { id: string; name: string; email: string }) => {
    setFormState(prev => ({ ...prev, author_id: u.id, author_name: u.name }));
    setAuthorSearch('');
    setAuthorResults([]);
    setShowAuthorDropdown(false);
  };

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
          robots_meta: (blog as any).robots_meta || "index,follow",
          structured_data: (blog as any).structured_data || "",
          status: (blog.status as BlogStatus) || (blog.is_published ? "published" : "draft"),
          isCurrentAffairsNote: Boolean(blog.is_current_affairs_note),
          currentAffairsTag: blog.current_affairs_tag || "",
          author_id: (blog as any).author_id || "",
          author_name: (blog as any).author?.name || ""
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
    og_image_url: formState.og_image_url,
    robots_meta: formState.robots_meta,
    structured_data: formState.structured_data || undefined,
    is_current_affairs_note: formState.isCurrentAffairsNote,
    current_affairs_tag: formState.currentAffairsTag?.trim() || null,
    author_id: formState.author_id || null
  });

  const handleSave = async (nextStatus?: BlogStatus) => {
    // Wait briefly to allow any pending onBlur events (from content-editable elements) 
    // to propagate their state updates to the parent component before saving.
    await new Promise(resolve => setTimeout(resolve, 200));

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
        const sectionsToSave = latestSectionsRef.current;
        await blogAdminService.bulkSyncBlogContent(targetId, sectionsToSave);
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="blog-title">Title</label>
              <Input
                id="blog-title"
                placeholder="Enter blog title"
                value={formState.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
              />
              <p className="text-xs text-gray-500">Visible on the blog and used for SEO.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="blog-slug">Slug (optional)</label>
              <Input
                id="blog-slug"
                placeholder="auto-generated-if-empty"
                value={formState.slug}
                onChange={(e) => handleFormChange("slug", e.target.value)}
              />
              <p className="text-xs text-gray-500">Used for the URL, lowercase letters, numbers, and hyphens.</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Excerpt</label>
            <Textarea rows={3} value={formState.excerpt} onChange={(e) => handleFormChange("excerpt", e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tags</label>
              <Input
                placeholder="Comma separated tags"
                value={formState.tags}
                onChange={(e) => handleFormChange("tags", e.target.value)}
              />
            </div>
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

            {/* Author picker */}
            <div ref={authorWrapperRef} className="relative space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Author</label>
              {formState.author_id ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 bg-gray-50">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 flex-1 truncate">{formState.author_name || formState.author_id}</span>
                  <button type="button" onClick={() => setFormState(prev => ({ ...prev, author_id: '', author_name: '' }))}
                    className="text-gray-400 hover:text-gray-600 transition flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={authorSearch}
                    onChange={(e) => handleAuthorSearch(e.target.value)}
                    onFocus={() => { if (authorSearch.trim() && authorResults.length > 0) setShowAuthorDropdown(true); }}
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
              )}
              {showAuthorDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {authorSearchLoading ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                    </div>
                  ) : authorResults.length === 0 ? (
                    <div className="py-3 text-center text-sm text-gray-500">No users found</div>
                  ) : (
                    <ul>
                      {authorResults.map(u => (
                        <li key={u.id}>
                          <button type="button" onClick={() => selectAuthor(u)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition text-left">
                            {u.avatar_url
                              ? <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                              : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{u.name?.[0] || '?'}</div>
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                              <p className="text-xs text-gray-500 truncate">{u.email} · <span className="capitalize">{u.role}</span></p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500">Leave empty to use the logged-in user as author.</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 p-4 space-y-4">
              <div>
                <p className="text-sm uppercase text-gray-500 font-semibold">Publishing Surface</p>
                <h3 className="text-lg font-semibold text-gray-900">Where should this appear?</h3>
                <p className="text-sm text-gray-500">
                  Choose whether this stays a regular blog article or also shows up in Current Affairs notes.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant={formState.isCurrentAffairsNote ? "outline" : "default"}
                  onClick={() => handleFormChange("isCurrentAffairsNote", false)}
                >
                  Blog Post
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={formState.isCurrentAffairsNote ? "default" : "outline"}
                  onClick={() => handleFormChange("isCurrentAffairsNote", true)}
                >
                  Current Affairs Note
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-gray-200 p-4">
              {formState.isCurrentAffairsNote ? (
                <>
                  <label className="text-sm font-medium text-gray-700" htmlFor="current-affairs-tag">
                    Current Affairs Tag (optional)
                  </label>
                  <Input
                    id="current-affairs-tag"
                    placeholder="e.g., Daily Digest, Budget 2026"
                    value={formState.currentAffairsTag}
                    onChange={(e) => handleFormChange("currentAffairsTag", e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    This label is shown on the Current Affairs page to highlight the type of note.
                  </p>
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  Enable “Current Affairs Note” to select a tag and surface this article in the notes list.
                </div>
              )}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Canonical URL</label>
              <Input
                type="url"
                placeholder="https://bharatmock.com/blogs/..."
                value={formState.canonical_url}
                onChange={(e) => handleFormChange("canonical_url", e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">Helps avoid duplicate-content penalties.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Robots Meta Tag</label>
              <select
                value={formState.robots_meta}
                onChange={(e) => handleFormChange("robots_meta", e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="index,follow">Index, Follow</option>
                <option value="noindex,follow">No Index, Follow</option>
                <option value="index,nofollow">Index, No Follow</option>
                <option value="noindex,nofollow">No Index, No Follow</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Structured Data / Schema (JSON-LD notes)</label>
            <Textarea
              rows={3}
              placeholder='e.g. {"@type": "Article", "headline": "..."} or notes for schema markup'
              value={formState.structured_data}
              onChange={(e) => handleFormChange("structured_data", e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">Optional JSON-LD schema or notes for structured data markup.</p>
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
