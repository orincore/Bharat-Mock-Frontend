"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Layers,
  Target,
  Bell,
  Download,
  BookOpen,
  HelpCircle,
  Search,
  Plus,
  ExternalLink,
  X,
  LayoutTemplate
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/LoadingStates";
import { subcategoryAdminService } from "@/lib/api/subcategoryAdminService";
import { useToast } from "@/hooks/use-toast";
import { BlockEditor } from "@/components/PageEditor/BlockEditor";

interface SubcategoryMeta {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order?: number | null;
  is_active?: boolean | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface SubcategoryUpdate {
  id: string;
  title: string;
  description?: string;
  update_type: string;
  update_date: string;
  link_url?: string;
  display_order?: number;
  is_active?: boolean;
}

interface SubcategoryQuestionPaper {
  id: string;
  exam_id?: string;
  title?: string;
  year?: number;
  shift?: string;
  language?: string;
  paper_type?: string;
  description?: string;
  download_url?: string;
  file_url?: string;
  display_order?: number;
  is_active?: boolean;
  exam?: {
    id: string;
    title: string;
    slug: string;
    url_path?: string;
    description?: string;
    total_questions?: number;
    duration?: number;
    total_marks?: number;
    difficulty?: string;
    is_free?: boolean;
    price?: number;
    logo_url?: string;
    thumbnail_url?: string;
  };
}

interface SubcategoryResource {
  id: string;
  title: string;
  description?: string;
  resource_type: string;
  resource_url?: string;
  thumbnail_url?: string;
  display_order?: number;
  is_active?: boolean;
}

interface SubcategoryFaq {
  id: string;
  question: string;
  answer: string;
  faq_category?: string;
  display_order?: number;
  is_active?: boolean;
}

type SubmitKey = "overview" | "update" | "paper" | "resource" | "faq";

type SectionCardProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
};

function SectionCard({ icon: Icon, title, description, children }: SectionCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
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

const defaultOverviewForm = {
  hero_title: "",
  hero_subtitle: "",
  hero_description: "",
  hero_image_url: "",
  cta_primary_text: "",
  cta_primary_url: "",
  cta_secondary_text: "",
  cta_secondary_url: "",
  stats_json: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: ""
};

const defaultUpdateForm = {
  id: "",
  title: "",
  description: "",
  update_type: "general",
  update_date: "",
  link_url: "",
  display_order: "0",
  is_active: true
};

const defaultPaperForm = {
  id: "",
  exam_id: "",
  title: "",
  description: "",
  year: "2024",
  shift: "",
  language: "",
  paper_type: "",
  download_url: "",
  file_url: "",
  display_order: "0",
  is_active: true
};

const defaultResourceForm = {
  id: "",
  title: "",
  description: "",
  resource_type: "pdf",
  resource_url: "",
  thumbnail_url: "",
  display_order: "0",
  is_active: true
};

const defaultFaqForm = {
  id: "",
  question: "",
  answer: "",
  faq_category: "General",
  display_order: "0",
  is_active: true
};


const normalizeSubcategoryMeta = (data: SubcategoryMeta, previous?: SubcategoryMeta | null): SubcategoryMeta => ({
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

export default function AdminSubcategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subcategoryId = params.subcategoryId as string;
  const { toast } = useToast();

  const [subcategory, setSubcategory] = useState<SubcategoryMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [overviewForm, setOverviewForm] = useState(defaultOverviewForm);
  const [updates, setUpdates] = useState<SubcategoryUpdate[]>([]);
  const [updateForm, setUpdateForm] = useState(defaultUpdateForm);
  const [questionPapers, setQuestionPapers] = useState<SubcategoryQuestionPaper[]>([]);
  const [paperForm, setPaperForm] = useState(defaultPaperForm);
  const [resources, setResources] = useState<SubcategoryResource[]>([]);
  const [resourceForm, setResourceForm] = useState(defaultResourceForm);
  const [faqs, setFaqs] = useState<SubcategoryFaq[]>([]);
  const [faqForm, setFaqForm] = useState(defaultFaqForm);
  const [submitting, setSubmitting] = useState<Record<SubmitKey, boolean>>({
    overview: false,
    update: false,
    paper: false,
    resource: false,
    faq: false
  });
  const [heroUploadPreview, setHeroUploadPreview] = useState<string>("");
  const [heroUploadProgress, setHeroUploadProgress] = useState<'idle' | 'uploading' | 'done' | 'error'>("idle");
  const [heroUploadError, setHeroUploadError] = useState<string>("");
  const [metaForm, setMetaForm] = useState({
    name: '',
    slug: '',
    description: '',
    display_order: '0',
    is_active: true
  });
  const [savingMeta, setSavingMeta] = useState(false);
  const [examSearchQuery, setExamSearchQuery] = useState("");
  const [examSearchResults, setExamSearchResults] = useState<any[]>([]);
  const [searchingExams, setSearchingExams] = useState(false);
  const examSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const examSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [pageSections, setPageSections] = useState<any[]>([]);
  const [pageSeo, setPageSeo] = useState<any>(null);
  const [loadingPageContent, setLoadingPageContent] = useState(true);
  const [savingPageContent, setSavingPageContent] = useState(false);

  const syncMetaForm = (data: SubcategoryMeta) => {
    setMetaForm({
      name: data.name || '',
      slug: data.slug || '',
      description: data.description || '',
      display_order: data.display_order !== undefined && data.display_order !== null
        ? String(data.display_order)
        : '0',
      is_active: data.is_active ?? true
    });
  };

  const refreshSubcategoryMeta = async () => {
    const latest = await subcategoryAdminService.getSubcategoryById(subcategoryId);
    setSubcategory((prev) => {
      const normalized = normalizeSubcategoryMeta(latest, prev);
      syncMetaForm(normalized);
      return normalized;
    });
  };

  const loadAll = async () => {
    try {
      setIsLoading(true);
      const subcatData = await subcategoryAdminService.getSubcategoryById(subcategoryId);
      const normalized = normalizeSubcategoryMeta(subcatData);
      setSubcategory(normalized);
      syncMetaForm(normalized);

      const [overviewRes, updatesRes, papersRes, resourcesRes, faqsRes] = await Promise.all([
        subcategoryAdminService.getOverview(subcategoryId),
        subcategoryAdminService.getUpdates(subcategoryId, { limit: 50 }),
        subcategoryAdminService.getQuestionPapers(subcategoryId, { limit: 50 }),
        subcategoryAdminService.getResources(subcategoryId),
        subcategoryAdminService.getFaqs(subcategoryId)
      ]);

      if (overviewRes) {
        setOverviewForm({
          hero_title: overviewRes.hero_title || "",
          hero_subtitle: overviewRes.hero_subtitle || "",
          hero_description: overviewRes.hero_description || "",
          hero_image_url: overviewRes.hero_image_url || "",
          cta_primary_text: overviewRes.cta_primary_text || "",
          cta_primary_url: overviewRes.cta_primary_url || "",
          cta_secondary_text: overviewRes.cta_secondary_text || "",
          cta_secondary_url: overviewRes.cta_secondary_url || "",
          stats_json: overviewRes.stats_json ? JSON.stringify(overviewRes.stats_json, null, 2) : "",
          meta_title: overviewRes.meta_title || "",
          meta_description: overviewRes.meta_description || "",
          meta_keywords: overviewRes.meta_keywords || ""
        });
        setHeroUploadPreview(overviewRes.hero_image_url || "");
      } else {
        setOverviewForm(defaultOverviewForm);
        setHeroUploadPreview("");
      }

      setUpdates(updatesRes || []);
      setQuestionPapers(papersRes.data || papersRes || []);
      setResources(resourcesRes || []);
      setFaqs(faqsRes || []);

      await loadPageContent();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Failed to load subcategory",
        description: error?.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!subcategoryId) return;
    loadAll();
  }, [subcategoryId]);

  const setSubmittingState = (key: SubmitKey, value: boolean) =>
    setSubmitting((prev) => ({ ...prev, [key]: value }));

  const loadPageContent = async () => {
    if (!subcategoryId) return;
    try {
      setLoadingPageContent(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}`);
      const data = await response.json();
      setPageSections(data.sections || []);
      setPageSeo(data.seo || null);
    } catch (error) {
      console.error('Failed to load page content', error);
      toast({ title: 'Failed to load page content', variant: 'destructive' });
    } finally {
      setLoadingPageContent(false);
    }
  };

  const handlePageContentSave = async (updatedSections: any[]) => {
    try {
      setSavingPageContent(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({ title: 'Auth token missing', variant: 'destructive' });
        return;
      }

      for (const section of updatedSections) {
        const payload = {
          section_key: section.section_key || section.title?.toLowerCase().replace(/\s+/g, '-') || `section-${Date.now()}`,
          title: section.title,
          subtitle: section.subtitle,
          display_order: section.display_order ?? 0
        };

        if (section.id?.startsWith('temp-') || !section.id) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/sections`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
          const created = await response.json();
          section.id = created.id;
        } else {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/sections/${section.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
        }

        for (const block of section.blocks || []) {
          const blockPayload = {
            section_id: section.id,
            block_type: block.block_type,
            content: block.content,
            settings: block.settings,
            display_order: block.display_order ?? 0
          };

          if (block.id?.startsWith('temp-') || !block.id) {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/blocks`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(blockPayload)
            });
          } else {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/blocks/${block.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(blockPayload)
            });
          }
        }
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/revisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ change_summary: 'Admin subcategory editor save' })
      });

      toast({ title: 'Page content saved' });
      await loadPageContent();
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to save page content', variant: 'destructive' });
    } finally {
      setSavingPageContent(false);
    }
  };

  const handleMetaSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaForm.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    try {
      setSavingMeta(true);
      await subcategoryAdminService.updateSubcategory(subcategoryId, {
        name: metaForm.name.trim(),
        slug: metaForm.slug.trim(),
        description: metaForm.description.trim(),
        display_order: metaForm.display_order,
        is_active: metaForm.is_active
      });
      await refreshSubcategoryMeta();
      toast({ title: 'Subcategory details saved' });
    } catch (error: any) {
      toast({ title: 'Failed to save metadata', description: error?.message, variant: 'destructive' });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleOverviewSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState("overview", true);
      const payload = {
        ...overviewForm,
        stats_json: overviewForm.stats_json ? JSON.parse(overviewForm.stats_json) : null
      };
      await subcategoryAdminService.upsertOverview(subcategoryId, payload);
      toast({ title: "Overview saved" });
    } catch (error: any) {
      console.error(error);
      toast({ title: "Failed to save overview", description: error?.message, variant: "destructive" });
    } finally {
      setSubmittingState("overview", false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState("update", true);
      const payload = {
        title: updateForm.title,
        description: updateForm.description || null,
        update_type: updateForm.update_type,
        update_date: updateForm.update_date,
        link_url: updateForm.link_url || null,
        display_order: parseInt(updateForm.display_order || "0", 10),
        is_active: updateForm.is_active
      };
      await subcategoryAdminService.upsertUpdate(subcategoryId, payload, updateForm.id || undefined);
      toast({ title: `Update ${updateForm.id ? "updated" : "created"}` });
      setUpdateForm(defaultUpdateForm);
      const refreshed = await subcategoryAdminService.getUpdates(subcategoryId, { limit: 50 });
      setUpdates(refreshed || []);
    } catch (error: any) {
      toast({ title: "Failed to save update", description: error?.message, variant: "destructive" });
    } finally {
      setSubmittingState("update", false);
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!confirm("Delete this update?")) return;
    try {
      await subcategoryAdminService.deleteUpdate(subcategoryId, id);
      toast({ title: "Update deleted" });
      setUpdates((prev) => prev.filter((item) => item.id !== id));
      if (updateForm.id === id) setUpdateForm(defaultUpdateForm);
    } catch (error: any) {
      toast({ title: "Failed to delete update", description: error?.message, variant: "destructive" });
    }
  };

  const executeExamSearch = useCallback(
    async (query: string) => {
      if (!query) return;
      try {
        setSearchingExams(true);
        const results = await subcategoryAdminService.searchExams(query);
        setExamSearchResults(results);
      } catch (error: any) {
        toast({ title: "Failed to search exams", description: error?.message, variant: "destructive" });
      } finally {
        setSearchingExams(false);
      }
    },
    [toast]
  );

  const handleSearchExams = useCallback(() => {
    executeExamSearch(examSearchQuery.trim());
  }, [examSearchQuery, executeExamSearch]);

  const handleSelectExam = (exam: any) => {
    setPaperForm({
      ...defaultPaperForm,
      exam_id: exam.id,
      title: exam.title,
      description: exam.description || ""
    });
    setExamSearchQuery("");
    setExamSearchResults([]);
  };

  useEffect(() => {
    examSearchInputRef.current?.focus();
    executeExamSearch('');
  }, [executeExamSearch]);

  useEffect(() => {
    if (examSearchDebounce.current) {
      clearTimeout(examSearchDebounce.current);
    }

    examSearchDebounce.current = setTimeout(() => {
      executeExamSearch(examSearchQuery.trim());
    }, 250);

    return () => {
      if (examSearchDebounce.current) {
        clearTimeout(examSearchDebounce.current);
      }
    };
  }, [examSearchQuery, executeExamSearch]);

  const handlePaperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState("paper", true);
      const payload = {
        exam_id: paperForm.exam_id || null,
        title: paperForm.title || null,
        description: paperForm.description || null,
        year: paperForm.year ? parseInt(paperForm.year, 10) : null,
        shift: paperForm.shift || null,
        language: paperForm.language || null,
        paper_type: paperForm.paper_type || null,
        download_url: paperForm.download_url || null,
        file_url: paperForm.file_url || null,
        display_order: parseInt(paperForm.display_order || "0", 10),
        is_active: paperForm.is_active
      };
      await subcategoryAdminService.upsertQuestionPaper(subcategoryId, payload, paperForm.id || undefined);
      toast({ title: `Question paper ${paperForm.id ? "updated" : "added"}` });
      setPaperForm(defaultPaperForm);
      const refreshed = await subcategoryAdminService.getQuestionPapers(subcategoryId, { limit: 50 });
      setQuestionPapers(refreshed.data || refreshed || []);
    } catch (error: any) {
      toast({ title: "Failed to save question paper", description: error?.message, variant: "destructive" });
    } finally {
      setSubmittingState("paper", false);
    }
  };

  const handleDeletePaper = async (id: string) => {
    if (!confirm("Delete this paper?")) return;
    try {
      await subcategoryAdminService.deleteQuestionPaper(subcategoryId, id);
      toast({ title: "Paper deleted" });
      setQuestionPapers((prev) => prev.filter((item) => item.id !== id));
      if (paperForm.id === id) setPaperForm(defaultPaperForm);
    } catch (error: any) {
      toast({ title: "Failed to delete paper", description: error?.message, variant: "destructive" });
    }
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState("resource", true);
      const payload = {
        title: resourceForm.title,
        description: resourceForm.description || null,
        resource_type: resourceForm.resource_type,
        resource_url: resourceForm.resource_url || null,
        thumbnail_url: resourceForm.thumbnail_url || null,
        display_order: parseInt(resourceForm.display_order || "0", 10),
        is_active: resourceForm.is_active
      };
      await subcategoryAdminService.upsertResource(subcategoryId, payload, resourceForm.id || undefined);
      toast({ title: `Resource ${resourceForm.id ? "updated" : "added"}` });
      setResourceForm(defaultResourceForm);
      const refreshed = await subcategoryAdminService.getResources(subcategoryId);
      setResources(refreshed || []);
    } catch (error: any) {
      toast({ title: "Failed to save resource", description: error?.message, variant: "destructive" });
    } finally {
      setSubmittingState("resource", false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    try {
      await subcategoryAdminService.deleteResource(subcategoryId, id);
      toast({ title: "Resource deleted" });
      setResources((prev) => prev.filter((item) => item.id !== id));
      if (resourceForm.id === id) setResourceForm(defaultResourceForm);
    } catch (error: any) {
      toast({ title: "Failed to delete resource", description: error?.message, variant: "destructive" });
    }
  };

  const handleFaqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState("faq", true);
      const payload = {
        question: faqForm.question,
        answer: faqForm.answer,
        faq_category: faqForm.faq_category || null,
        display_order: parseInt(faqForm.display_order || "0", 10),
        is_active: faqForm.is_active
      };
      await subcategoryAdminService.upsertFaq(subcategoryId, payload, faqForm.id || undefined);
      toast({ title: `FAQ ${faqForm.id ? "updated" : "added"}` });
      setFaqForm(defaultFaqForm);
      const refreshed = await subcategoryAdminService.getFaqs(subcategoryId);
      setFaqs(refreshed || []);
    } catch (error: any) {
      toast({ title: "Failed to save FAQ", description: error?.message, variant: "destructive" });
    } finally {
      setSubmittingState("faq", false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await subcategoryAdminService.deleteFaq(subcategoryId, id);
      toast({ title: "FAQ deleted" });
      setFaqs((prev) => prev.filter((item) => item.id !== id));
      if (faqForm.id === id) setFaqForm(defaultFaqForm);
    } catch (error: any) {
      toast({ title: "Failed to delete FAQ", description: error?.message, variant: "destructive" });
    }
  };

  const handleHeroImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0];

    if (!file.type.startsWith("image/")) {
      setHeroUploadError("Please select a valid image file");
      return;
    }

    setHeroUploadError("");
    setHeroUploadProgress("uploading");

    try {
      const result = await subcategoryAdminService.uploadHeroImage(subcategoryId, file);
      setOverviewForm((prev) => ({ ...prev, hero_image_url: result.hero_image_url || "" }));
      setHeroUploadPreview(result.hero_image_url || "");
      setHeroUploadProgress("done");
      toast({ title: "Hero image updated" });
    } catch (error: any) {
      setHeroUploadError(error?.message || "Failed to upload image");
      setHeroUploadProgress("error");
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!subcategory) {
    return (
      <div className="p-10 text-center">
        <p className="text-lg text-muted-foreground">Subcategory not found.</p>
        <Button className="mt-4" onClick={() => router.push("/admin/categories")}>Back to Categories</Button>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/categories/${subcategory.category?.id || ""}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{subcategory.name} Content</h1>
            <p className="text-muted-foreground">Manage overview, updates, question papers, resources, and FAQs.</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Category</p>
          <p className="font-semibold">{subcategory.category?.name || "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Slug</p>
          <p className="font-mono text-sm">/{subcategory.category?.slug}/{subcategory.slug}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Subcategory ID</p>
          <p className="font-mono text-sm break-all">{subcategory.id}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Description</p>
          <p className="text-sm text-muted-foreground line-clamp-2">{subcategory.description || "No description"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Status</p>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
            subcategory.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {subcategory.is_active ? 'Active' : 'Draft'}
          </span>
        </div>
      </div>

      <SectionCard
        icon={Layers}
        title="Subcategory metadata"
        description="Control base URL, description, ordering, and visibility."
      >
        <form onSubmit={handleMetaSave} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              placeholder="Name"
              value={metaForm.name}
              onChange={(e) => setMetaForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              placeholder="Slug"
              value={metaForm.slug}
              onChange={(e) => setMetaForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
          </div>
          <Textarea
            rows={3}
            placeholder="Description"
            value={metaForm.description}
            onChange={(e) => setMetaForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid md:grid-cols-3 gap-4">
            <Input
              type="number"
              placeholder="Display order"
              value={metaForm.display_order}
              onChange={(e) => setMetaForm((prev) => ({ ...prev, display_order: e.target.value }))}
            />
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={metaForm.is_active ? 'true' : 'false'}
              onChange={(e) => setMetaForm((prev) => ({ ...prev, is_active: e.target.value === 'true' }))}
            >
              <option value="true">Active</option>
              <option value="false">Draft</option>
            </select>
            <Button type="button" variant="ghost" onClick={() => subcategory && syncMetaForm(subcategory)}>
              Reset
            </Button>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={savingMeta}>
              {savingMeta ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        icon={Target}
        title="Overview Hero"
        description="Control hero content, CTAs, and SEO metadata for the public page"
      >
        <form onSubmit={handleOverviewSave} className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Hero title"
            value={overviewForm.hero_title}
            onChange={(e) => setOverviewForm((prev) => ({ ...prev, hero_title: e.target.value }))}
            required
          />
          <Input
            placeholder="Hero subtitle"
            value={overviewForm.hero_subtitle}
            onChange={(e) => setOverviewForm((prev) => ({ ...prev, hero_subtitle: e.target.value }))}
          />
          <Textarea
            className="md:col-span-2"
            placeholder="Hero description"
            value={overviewForm.hero_description}
            onChange={(e) => setOverviewForm((prev) => ({ ...prev, hero_description: e.target.value }))}
          />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hero Image</Label>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Hero image URL"
                    value={overviewForm.hero_image_url}
                    onChange={(e) => setOverviewForm((prev) => ({ ...prev, hero_image_url: e.target.value }))}
                  />
                  <div>
                    <Label className="text-xs text-muted-foreground">or upload an image</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroImageUpload}
                      disabled={heroUploadProgress === "uploading"}
                    />
                  </div>
                </div>
                {heroUploadPreview && (
                  <div className="w-full md:w-48 border border-border rounded-xl overflow-hidden">
                    <img src={heroUploadPreview} alt="Hero preview" className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>
              {heroUploadProgress === "uploading" && (
                <p className="text-xs text-muted-foreground">Uploading...</p>
              )}
              {heroUploadError && (
                <p className="text-xs text-destructive">{heroUploadError}</p>
              )}
            </div>
          </div>
          <Input
            placeholder="Primary CTA text"
            value={overviewForm.cta_primary_text}
            onChange={(e) => setOverviewForm((prev) => ({ ...prev, cta_primary_text: e.target.value }))}
          />
          <Input
            placeholder="Primary CTA link"
            value={overviewForm.cta_primary_url}
            onChange={(e) => setOverviewForm((prev) => ({ ...prev, cta_primary_url: e.target.value }))}
          />
          <Input
            placeholder="Secondary CTA text"
            value={overviewForm.cta_secondary_text}
            onChange={(e) => setOverviewForm((prev) => ({ ...prev, cta_secondary_text: e.target.value }))}
          />
          <Input
            placeholder="Secondary CTA link"
            value={overviewForm.cta_secondary_url}
            onChange={(e) => setOverviewForm((prev) => ({ ...prev, cta_secondary_url: e.target.value }))}
          />
          <Textarea
            className="md:col-span-2 font-mono text-xs"
            rows={6}
            placeholder="Stats JSON"
            value={overviewForm.stats_json}
            onChange={(e) => setOverviewForm((prev) => ({ ...prev, stats_json: e.target.value }))}
          />
          <Input
            placeholder="Meta title"
            value={overviewForm.meta_title}
            onChange={(e) => setOverviewForm((prev) => ({ ...prev, meta_title: e.target.value }))}
          />
          <Input
            placeholder="Meta keywords"
            value={overviewForm.meta_keywords}
            onChange={(e) => setOverviewForm((prev) => ({ ...prev, meta_keywords: e.target.value }))}
          />
          <Textarea
            className="md:col-span-2"
            placeholder="Meta description"
            value={overviewForm.meta_description}
            onChange={(e) => setOverviewForm((prev) => ({ ...prev, meta_description: e.target.value }))}
          />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={submitting.overview}>
              {submitting.overview ? "Saving..." : "Save Overview"}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        icon={Bell}
        title="Latest Updates"
        description="Announcements displayed on the Updates tab"
      >
        <form onSubmit={handleUpdateSubmit} className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Title"
            value={updateForm.title}
            onChange={(e) => setUpdateForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <Input
            type="date"
            placeholder="Update date"
            value={updateForm.update_date}
            onChange={(e) => setUpdateForm((prev) => ({ ...prev, update_date: e.target.value }))}
            required
          />
          <Input
            placeholder="Update type (result/notice/etc)"
            value={updateForm.update_type}
            onChange={(e) => setUpdateForm((prev) => ({ ...prev, update_type: e.target.value }))}
          />
          <Input
            placeholder="Link URL"
            value={updateForm.link_url}
            onChange={(e) => setUpdateForm((prev) => ({ ...prev, link_url: e.target.value }))}
          />
          <Textarea
            className="md:col-span-2"
            placeholder="Description"
            value={updateForm.description}
            onChange={(e) => setUpdateForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid md:grid-cols-3 gap-4 md:col-span-2">
            <Input
              type="number"
              placeholder="Display order"
              value={updateForm.display_order}
              onChange={(e) => setUpdateForm((prev) => ({ ...prev, display_order: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={updateForm.is_active}
                onChange={(e) => setUpdateForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              Active
            </label>
            <Button type="button" variant="ghost" onClick={() => setUpdateForm(defaultUpdateForm)}>
              Clear
            </Button>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={submitting.update}>
              {submitting.update ? "Saving..." : updateForm.id ? "Update" : "Create"}
            </Button>
          </div>
        </form>
        <div className="border border-border rounded-xl divide-y divide-border">
          {updates.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No updates yet.</p>
          )}
          {updates.map((item) => (
            <div key={item.id} className="p-4 flex flex-wrap gap-3 justify-between">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.update_type} • {new Date(item.update_date).toLocaleDateString()}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setUpdateForm({
                      id: item.id,
                      title: item.title,
                      description: item.description || "",
                      update_type: item.update_type,
                      update_date: item.update_date.split("T")[0],
                      link_url: item.link_url || "",
                      display_order: String(item.display_order ?? 0),
                      is_active: item.is_active ?? true
                    })
                  }
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteUpdate(item.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={Download}
        title="Question Papers"
        description="Link existing exams as previous year papers with attempt/download options"
      >
        <div className="mb-4 space-y-3 p-4 border border-border rounded-xl bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Search exams to link</h4>
            {paperForm.exam_id && (
              <span className="text-xs text-primary">Linked: {paperForm.title}</span>
            )}
          </div>
          <div className="relative">
            <Input
              ref={examSearchInputRef}
              placeholder="Type to search published exams by title..."
              value={examSearchQuery}
              onChange={(e) => setExamSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchExams())}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => {
                setExamSearchQuery("");
                setExamSearchResults([]);
              }}
              disabled={!examSearchQuery}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {examSearchQuery.trim().length < 2 ? (
            <p className="text-xs text-muted-foreground">
              Start typing at least 2 characters to see matching exams.
            </p>
          ) : (
            <div className="space-y-2">
              {searchingExams && (
                <p className="text-xs text-muted-foreground">Searching…</p>
              )}
              {examSearchResults.length === 0 && !searchingExams ? (
                <p className="text-xs text-muted-foreground">No exams found. Try a different title.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {examSearchResults.map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      className="w-full text-left p-3 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                      onClick={() => handleSelectExam(exam)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{exam.title}</p>
                          {exam.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {exam.description}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                            {exam.total_questions && <span>{exam.total_questions} Qs</span>}
                            {exam.duration && <span>• {exam.duration} min</span>}
                            {exam.difficulty && <span>• {exam.difficulty}</span>}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-primary flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handlePaperSubmit} className="grid gap-4 md:grid-cols-2">
          {paperForm.exam_id && (
            <div className="md:col-span-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium text-primary flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Linked to exam: {paperForm.title}
              </p>
            </div>
          )}
          <Input
            placeholder="Title (auto-filled if exam linked)"
            value={paperForm.title}
            onChange={(e) => setPaperForm((prev) => ({ ...prev, title: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Year (e.g., 2024)"
            value={paperForm.year}
            onChange={(e) => setPaperForm((prev) => ({ ...prev, year: e.target.value }))}
          />
          <Input
            placeholder="Shift (e.g., Morning, Shift 1)"
            value={paperForm.shift}
            onChange={(e) => setPaperForm((prev) => ({ ...prev, shift: e.target.value }))}
          />
          <Input
            placeholder="Language (e.g., English, Hindi)"
            value={paperForm.language}
            onChange={(e) => setPaperForm((prev) => ({ ...prev, language: e.target.value }))}
          />
          <Input
            placeholder="Paper type (e.g., Tier 1, Prelims)"
            value={paperForm.paper_type}
            onChange={(e) => setPaperForm((prev) => ({ ...prev, paper_type: e.target.value }))}
          />
          <Input
            placeholder="Download URL (optional)"
            value={paperForm.download_url}
            onChange={(e) => setPaperForm((prev) => ({ ...prev, download_url: e.target.value }))}
          />
          <Textarea
            className="md:col-span-2"
            placeholder="Description"
            value={paperForm.description}
            onChange={(e) => setPaperForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid md:grid-cols-3 gap-4 md:col-span-2">
            <Input
              type="number"
              placeholder="Display order"
              value={paperForm.display_order}
              onChange={(e) => setPaperForm((prev) => ({ ...prev, display_order: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={paperForm.is_active}
                onChange={(e) => setPaperForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              Active
            </label>
            <Button type="button" variant="ghost" onClick={() => setPaperForm(defaultPaperForm)}>
              Clear
            </Button>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={submitting.paper}>
              {submitting.paper ? "Saving..." : paperForm.id ? "Update" : "Add"}
            </Button>
          </div>
        </form>
        <div className="border border-border rounded-xl divide-y divide-border">
          {questionPapers.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No question papers yet.</p>
          )}
          {questionPapers.map((paper) => (
            <div key={paper.id} className="p-4 flex flex-wrap gap-3 justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold">{paper.exam?.title || paper.title}</p>
                  {paper.exam_id && (
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      Linked Exam
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {paper.year && <span>Year {paper.year}</span>}
                  {paper.shift && <span>• {paper.shift}</span>}
                  {paper.language && <span>• {paper.language}</span>}
                  {paper.paper_type && <span>• {paper.paper_type}</span>}
                </div>
                {paper.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{paper.description}</p>
                )}
                {paper.exam && (
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {paper.exam.total_questions && <span>{paper.exam.total_questions} Questions</span>}
                    {paper.exam.duration && <span>• {paper.exam.duration} min</span>}
                    {paper.exam.difficulty && <span>• {paper.exam.difficulty}</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPaperForm({
                      id: paper.id,
                      exam_id: paper.exam_id || "",
                      title: paper.title || "",
                      description: paper.description || "",
                      year: String(paper.year || ""),
                      shift: paper.shift || "",
                      language: paper.language || "",
                      paper_type: paper.paper_type || "",
                      download_url: paper.download_url || "",
                      file_url: paper.file_url || "",
                      display_order: String(paper.display_order ?? 0),
                      is_active: paper.is_active ?? true
                    })
                  }
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeletePaper(paper.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={BookOpen}
        title="Preparation Resources"
        description="Cards rendered inside the Preparation tab"
      >
        <form onSubmit={handleResourceSubmit} className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Resource title"
            value={resourceForm.title}
            onChange={(e) => setResourceForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <Input
            placeholder="Resource type (guide/video/pdf)"
            value={resourceForm.resource_type}
            onChange={(e) => setResourceForm((prev) => ({ ...prev, resource_type: e.target.value }))}
          />
          <Input
            placeholder="Resource URL"
            value={resourceForm.resource_url}
            onChange={(e) => setResourceForm((prev) => ({ ...prev, resource_url: e.target.value }))}
          />
          <Input
            placeholder="Thumbnail URL"
            value={resourceForm.thumbnail_url}
            onChange={(e) => setResourceForm((prev) => ({ ...prev, thumbnail_url: e.target.value }))}
          />
          <Textarea
            className="md:col-span-2"
            placeholder="Description"
            value={resourceForm.description}
            onChange={(e) => setResourceForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid md:grid-cols-3 gap-4 md:col-span-2">
            <Input
              type="number"
              placeholder="Display order"
              value={resourceForm.display_order}
              onChange={(e) => setResourceForm((prev) => ({ ...prev, display_order: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={resourceForm.is_active}
                onChange={(e) => setResourceForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              Active
            </label>
            <Button type="button" variant="ghost" onClick={() => setResourceForm(defaultResourceForm)}>
              Clear
            </Button>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={submitting.resource}>
              {submitting.resource ? "Saving..." : resourceForm.id ? "Update" : "Add"}
            </Button>
          </div>
        </form>
        <div className="border border-border rounded-xl divide-y divide-border">
          {resources.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No resources yet.</p>
          )}
          {resources.map((resource) => (
            <div key={resource.id} className="p-4 flex flex-wrap gap-3 justify-between">
              <div>
                <p className="font-semibold">{resource.title}</p>
                <p className="text-xs text-muted-foreground">{resource.resource_type}</p>
                {resource.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{resource.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setResourceForm({
                      id: resource.id,
                      title: resource.title,
                      description: resource.description || "",
                      resource_type: resource.resource_type,
                      resource_url: resource.resource_url || "",
                      thumbnail_url: resource.thumbnail_url || "",
                      display_order: String(resource.display_order ?? 0),
                      is_active: resource.is_active ?? true
                    })
                  }
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteResource(resource.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={HelpCircle}
        title="FAQs"
        description="Questions shown inside the FAQs tab"
      >
        <form onSubmit={handleFaqSubmit} className="grid gap-4">
          <Input
            placeholder="Question"
            value={faqForm.question}
            onChange={(e) => setFaqForm((prev) => ({ ...prev, question: e.target.value }))}
            required
          />
          <Textarea
            placeholder="Answer (supports HTML)"
            value={faqForm.answer}
            onChange={(e) => setFaqForm((prev) => ({ ...prev, answer: e.target.value }))}
            required
          />
          <div className="grid md:grid-cols-3 gap-4">
            <Input
              placeholder="Category"
              value={faqForm.faq_category}
              onChange={(e) => setFaqForm((prev) => ({ ...prev, faq_category: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Display order"
              value={faqForm.display_order}
              onChange={(e) => setFaqForm((prev) => ({ ...prev, display_order: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={faqForm.is_active}
                onChange={(e) => setFaqForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              Active
            </label>
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => setFaqForm(defaultFaqForm)}>
              Clear
            </Button>
            <Button type="submit" disabled={submitting.faq}>
              {submitting.faq ? "Saving..." : faqForm.id ? "Update" : "Add"}
            </Button>
          </div>
        </form>
        <div className="border border-border rounded-xl divide-y divide-border mt-6">
          {faqs.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No FAQs yet.</p>
          )}
          {faqs.map((faq) => (
            <div key={faq.id} className="p-4 flex flex-wrap gap-3 justify-between">
              <div>
                <p className="font-semibold">{faq.question}</p>
                <p className="text-xs text-muted-foreground">{faq.faq_category || "General"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setFaqForm({
                      id: faq.id,
                      question: faq.question,
                      answer: faq.answer,
                      faq_category: faq.faq_category || "",
                      display_order: String(faq.display_order ?? 0),
                      is_active: faq.is_active ?? true
                    })
                  }
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteFaq(faq.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={BookOpen}
        title="Custom Sections"
        description="Custom content sections displayed in the Overview tab"
      >
        <form onSubmit={handleSectionSubmit} className="grid gap-4">
          <Input
            placeholder="Section title"
            value={sectionForm.title}
            onChange={(e) => setSectionForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <Input
            placeholder="Subtitle (optional)"
            value={sectionForm.subtitle}
            onChange={(e) => setSectionForm((prev) => ({ ...prev, subtitle: e.target.value }))}
          />
          <Input
            placeholder="Slug (auto-generated if empty)"
            value={sectionForm.slug}
            onChange={(e) => setSectionForm((prev) => ({ ...prev, slug: e.target.value }))}
          />
          <Textarea
            rows={8}
            placeholder="Content (supports HTML)"
            value={sectionForm.content}
            onChange={(e) => setSectionForm((prev) => ({ ...prev, content: e.target.value }))}
          />
          <div className="grid md:grid-cols-3 gap-4">
            <Input
              type="number"
              placeholder="Display order"
              value={sectionForm.display_order}
              onChange={(e) => setSectionForm((prev) => ({ ...prev, display_order: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sectionForm.is_active}
                onChange={(e) => setSectionForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
              Active
            </label>
            <Button type="button" variant="ghost" onClick={() => setSectionForm(defaultSectionForm)}>
              Clear
            </Button>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting.section}>
              {submitting.section ? "Saving..." : sectionForm.id ? "Update" : "Add"}
            </Button>
          </div>
        </form>
        <div className="border border-border rounded-xl divide-y divide-border mt-6">
          {sections.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No custom sections yet.</p>
          )}
          {sections.map((section) => (
            <div key={section.id} className="p-4 flex flex-wrap gap-3 justify-between">
              <div className="flex-1">
                <p className="font-semibold">{section.title}</p>
                {section.subtitle && (
                  <p className="text-sm text-muted-foreground">{section.subtitle}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Slug: {section.slug}</p>
                {section.content && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{section.content.replace(/<[^>]*>/g, '')}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSectionForm({
                      id: section.id,
                      title: section.title,
                      subtitle: section.subtitle || "",
                      content: section.content || "",
                      slug: section.slug,
                      display_order: String(section.display_order ?? 0),
                      is_active: section.is_active ?? true
                    })
                  }
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteSection(section.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
