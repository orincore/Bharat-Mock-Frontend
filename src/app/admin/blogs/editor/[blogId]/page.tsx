"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Upload,
  Search,
  X,
  User,
  Eye,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

import { BlockEditor, BlockEditorMediaUploadConfig } from "@/components/PageEditor/BlockEditor";
import { useToast } from "@/components/ui/use-toast";

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
  const [showSEOPanel, setShowSEOPanel] = useState(false);
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
  }, [blogId, isNew, toast]);

  const createBlogRecord = async (targetStatus: BlogStatus = "draft", notify = true, skipNavigation = false) => {
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
    if (!skipNavigation) {
      router.replace(`/admin/blogs/editor/${created.id}`);
    }
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
    title: formState.title.trim(),
    slug: formState.slug.trim(),
    excerpt: formState.excerpt.trim(),
    category: formState.category.trim(),
    tags: formState.tags.trim().split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
    featured_image_url: formState.featured_image_url.trim(),
    canonical_url: formState.canonical_url.trim(),
    is_published: targetStatus === "published",
    is_featured: formState.is_featured,
    meta_title: formState.meta_title.trim(),
    meta_description: formState.meta_description.trim(),
    meta_keywords: formState.meta_keywords,
    og_title: formState.og_title,
    og_description: formState.og_description,
    og_image_url: formState.og_image_url,
    robots_meta: formState.robots_meta,
    // Parse structured_data if it's a valid JSON string, otherwise keep as string
    structured_data: (() => {
      if (typeof formState.structured_data === 'string' && formState.structured_data.trim()) {
        try {
          return JSON.parse(formState.structured_data);
        } catch (e) {
          // If parsing fails, keep as string
          return formState.structured_data;
        }
      }
      return formState.structured_data || undefined;
    })(),
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
        savedBlog = await createBlogRecord(targetStatus, false, true);
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
        if (isNew) {
          router.replace(`/admin/blogs/editor/${targetId}`);
        }
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
        const draft = await createBlogRecord("draft", true, true);
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
    <div className="fixed inset-0 z-[100] bg-gray-50 flex overflow-hidden">

      {/* ── MAIN EDITOR COLUMN ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ marginRight: '264px' }}>

        {/* Slim top bar */}
        <div className="bg-white border-b border-gray-200 h-11 flex items-center px-4 gap-3 sticky top-0 z-10 shadow-sm">
          <Link href="/admin/blogs" className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="w-7 h-7 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {formState.featured_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={formState.featured_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 truncate leading-none">
              {formState.title || (isNew ? 'New Blog Post' : 'Untitled')}
              {formState.slug && <span className="ml-1.5 text-xs font-normal text-gray-400">· /blogs/{formState.slug}</span>}
            </p>
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 flex-shrink-0 ${
            formState.status === 'published' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' :
            formState.status === 'pending' ? 'text-amber-700 bg-amber-50 border border-amber-200' :
            'text-gray-500 bg-gray-100 border border-gray-200'
          }`}>
            {statusLabel}
          </span>
        </div>

        {/* Block Editor */}
        {sectionsLoading ? (
          <div className="flex items-center justify-center flex-1 text-gray-500">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading content…
          </div>
        ) : (
          <BlockEditor
            sections={sections as any}
            onSave={(updated) => { void updated; handleSave(formState.status); }}
            mediaUploadConfig={mediaUploadConfig}
            onSectionsChange={(next) => setSections(next as BlogSection[])}
          />
        )}
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <aside className="fixed right-0 top-0 bottom-0 bg-white border-l border-gray-200 flex flex-col z-[110] overflow-hidden shadow-xl" style={{ width: '264px' }}>

        {/* Identity */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-sm font-bold text-gray-900 truncate leading-tight">{formState.title || (isNew ? 'New Blog Post' : '—')}</p>
          <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
            {formState.slug ? `/blogs/${formState.slug}` : (isNew ? 'slug auto-generated' : '…')}
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">

          {/* Save actions */}
          <div className="px-4 py-3.5 border-b border-gray-100 space-y-2">
            <button
              onClick={() => handleSave('published')}
              disabled={saving || sectionsSaving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                (saving || sectionsSaving) ? 'bg-blue-400 text-white cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            >
              {(saving || sectionsSaving) ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />{formState.status === 'published' ? 'Update' : 'Publish'}</>}
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={saving || sectionsSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors disabled:opacity-40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />Save Draft
            </button>
          </div>

          {/* Post Details */}
          <div className="px-4 py-3.5 border-b border-gray-100 space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Post Details</p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Title</label>
              <input type="text" value={formState.title} onChange={(e) => handleFormChange("title", e.target.value)} placeholder="Enter blog title" className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Slug</label>
              <input type="text" value={formState.slug} onChange={(e) => handleFormChange("slug", e.target.value)} placeholder="auto-generated-if-empty" className="w-full px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Excerpt</label>
              <textarea rows={3} value={formState.excerpt} onChange={(e) => handleFormChange("excerpt", e.target.value)} placeholder="Short description…" className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors resize-none" />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-gray-900">Published</p>
                <p className="text-[10px] text-gray-500">Make visible publicly</p>
              </div>
              <button
                type="button"
                onClick={() => applyStatus(formState.status === 'published' ? 'draft' : 'published')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formState.status === 'published' ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${formState.status === 'published' ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-gray-900">Featured</p>
                <p className="text-[10px] text-gray-500">Highlight in hero</p>
              </div>
              <button
                type="button"
                onClick={() => handleFormChange("is_featured", !formState.is_featured)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formState.is_featured ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${formState.is_featured ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Content Type */}
          <div className="px-4 py-3.5 border-b border-gray-100 space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Content Type</p>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
              <button type="button" onClick={() => handleFormChange("isCurrentAffairsNote", false)} className={`flex-1 px-2 py-1.5 transition-colors ${!formState.isCurrentAffairsNote ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Blog Post</button>
              <button type="button" onClick={() => handleFormChange("isCurrentAffairsNote", true)} className={`flex-1 px-2 py-1.5 transition-colors ${formState.isCurrentAffairsNote ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Current Affairs</button>
            </div>
            {formState.isCurrentAffairsNote && (
              <input type="text" placeholder="e.g. Daily Digest, Budget 2026" value={formState.currentAffairsTag} onChange={(e) => handleFormChange("currentAffairsTag", e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 transition-colors" />
            )}
          </div>

          {/* Author */}
          <div ref={authorWrapperRef} className="px-4 py-3.5 border-b border-gray-100 space-y-2 relative">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Author</p>
            {formState.author_id ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-2 bg-gray-50">
                <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs font-medium text-gray-900 flex-1 truncate">{formState.author_name || formState.author_id}</span>
                <button type="button" onClick={() => setFormState(prev => ({ ...prev, author_id: '', author_name: '' }))} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input placeholder="Search by name or email…" value={authorSearch} onChange={(e) => handleAuthorSearch(e.target.value)} onFocus={() => { if (authorSearch.trim() && authorResults.length > 0) setShowAuthorDropdown(true); }} className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 transition-colors" autoComplete="off" />
              </div>
            )}
            {showAuthorDropdown && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden hide-scrollbar max-h-48 overflow-y-auto">
                {authorSearchLoading ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" />Searching…</div>
                ) : authorResults.length === 0 ? (
                  <div className="py-3 text-center text-xs text-gray-500">No users found</div>
                ) : (
                  <ul>{authorResults.map(u => (
                    <li key={u.id}>
                      <button type="button" onClick={() => selectAuthor(u)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition text-left">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" /> : <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">{u.name?.[0] || '?'}</div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{u.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                        </div>
                      </button>
                    </li>
                  ))}</ul>
                )}
              </div>
            )}
          </div>

          {/* Media & Tags */}
          <div className="px-4 py-3.5 border-b border-gray-100 space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Media &amp; Tags</p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Tags</label>
              <input type="text" placeholder="Comma separated tags" value={formState.tags} onChange={(e) => handleFormChange("tags", e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 transition-colors" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Featured Image</label>
              {formState.featured_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={formState.featured_image_url} alt="" className="w-full h-24 object-cover rounded-lg border border-gray-200 mb-1.5" />
              )}
              <input type="text" value={formState.featured_image_url} onChange={(e) => handleFormChange("featured_image_url", e.target.value)} placeholder="Paste image URL" className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 transition-colors" />
              <button type="button" onClick={() => featuredImageInputRef.current?.click()} disabled={uploadingFeaturedImage} className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors disabled:opacity-40">
                <Upload className="w-3.5 h-3.5" />{uploadingFeaturedImage ? 'Uploading…' : 'Upload Image'}
              </button>
              <input ref={featuredImageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUploadFeaturedImage(file); }} />
            </div>
          </div>

          {/* Tools */}
          <div className="px-4 py-3.5 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Tools</p>
            <div className="space-y-0.5">
              <button onClick={() => setShowSEOPanel(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-transparent hover:border-gray-100 hover:bg-blue-50 transition-all duration-100">
                <Search className="w-4 h-4 text-blue-500 flex-shrink-0" />SEO Settings
              </button>
              {formState.slug && (
                <a href={`/blogs/${formState.slug}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all duration-100">
                  <Eye className="w-4 h-4 text-gray-500 flex-shrink-0" />Preview Post
                </a>
              )}
            </div>
          </div>

          {/* Page Info */}
          <div className="px-4 py-3.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Post Info</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Sections</span>
                <span className="font-medium text-gray-700">{sections.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Status</span>
                <span className={`font-semibold capitalize ${formState.status === 'published' ? 'text-emerald-600' : 'text-gray-500'}`}>{statusLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50/70">
          <Link href="/admin/blogs" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Back to Blogs
          </Link>
        </div>
      </aside>

      {/* SEO Settings Modal */}
      {showSEOPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSEOPanel(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 hide-scrollbar">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-gray-900">SEO Settings</h2>
                <p className="text-xs text-gray-500 mt-0.5">Optimize metadata for Google Search and social platforms.</p>
              </div>
              <button onClick={() => setShowSEOPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Meta Title</label>
                  <input type="text" value={formState.meta_title} onChange={(e) => handleFormChange("meta_title", e.target.value)} placeholder="Enter a compelling meta title" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Meta Keywords</label>
                  <input type="text" value={formState.meta_keywords} onChange={(e) => handleFormChange("meta_keywords", e.target.value)} placeholder="keyword1, keyword2" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Meta Description</label>
                <textarea rows={3} value={formState.meta_description} onChange={(e) => handleFormChange("meta_description", e.target.value)} placeholder="Explain the page content" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 resize-none" />
              </div>
              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
                <p className="text-[10px] uppercase font-semibold text-gray-500 mb-2">Search Preview</p>
                <p className="text-xs text-gray-500">bharatmock.com › blogs</p>
                <p className="text-sm font-semibold text-blue-700 leading-tight">{formState.meta_title || formState.title || 'Meta title preview'}</p>
                <p className="text-xs text-gray-600 mt-0.5">{formState.meta_description || formState.excerpt || 'Meta description preview'}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">OG Title</label>
                  <input type="text" value={formState.og_title} onChange={(e) => handleFormChange("og_title", e.target.value)} placeholder="Title for social sharing" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">OG Image URL</label>
                  <input type="url" value={formState.og_image_url} onChange={(e) => handleFormChange("og_image_url", e.target.value)} placeholder="https://…/og-image.jpg" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">OG Description</label>
                <textarea rows={2} value={formState.og_description} onChange={(e) => handleFormChange("og_description", e.target.value)} placeholder="Short description for social sharing" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Canonical URL</label>
                  <input type="url" value={formState.canonical_url} onChange={(e) => handleFormChange("canonical_url", e.target.value)} placeholder="https://bharatmock.com/blogs/…" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Robots Meta</label>
                  <select value={formState.robots_meta} onChange={(e) => handleFormChange("robots_meta", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white">
                    <option value="index,follow">Index, Follow</option>
                    <option value="noindex,follow">No Index, Follow</option>
                    <option value="index,nofollow">Index, No Follow</option>
                    <option value="noindex,nofollow">No Index, No Follow</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Structured Data / JSON-LD notes</label>
                <textarea rows={2} value={formState.structured_data} onChange={(e) => handleFormChange("structured_data", e.target.value)} placeholder='{"@type": "Article", "headline": "…"}' className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowSEOPanel(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Close</button>
              <button onClick={() => { handleSave(formState.status); setShowSEOPanel(false); }} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
