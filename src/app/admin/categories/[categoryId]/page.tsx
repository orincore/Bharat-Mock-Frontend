"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Bell,
  BookOpen,
  FileText,
  Award,
  Calendar,
  BookMarked,
  ExternalLink,
  Trash2,
  Edit,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/common/LoadingStates';
import { categoryAdminService } from '@/lib/api/categoryAdminService';

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

interface CategoryNotification {
  id: string;
  title: string;
  description: string | null;
  notification_type: string;
  notification_date: string;
  link_url: string | null;
  is_active: boolean;
}

interface SyllabusTopic {
  id?: string;
  topic_name: string;
  display_order?: number;
}

interface SyllabusSection {
  id: string;
  subject_name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  category_syllabus_topics: SyllabusTopic[];
}

interface CategoryCutoff {
  id: string;
  exam_name: string | null;
  year: string;
  cutoff_category: string;
  marks: number;
  total_marks: number | null;
  description: string | null;
}

interface ImportantDate {
  id: string;
  event_name: string;
  event_date: string | null;
  event_date_text: string | null;
  description: string | null;
  link_url: string | null;
}

interface PreparationTip {
  id: string;
  title: string;
  description: string;
  tip_type: string;
  display_order: number;
}

interface CategoryArticle {
  id: string;
  display_order: number;
  is_featured: boolean;
  articles: {
    id: string;
    title: string;
    slug: string;
    published_at: string;
  };
}

interface SubcategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
}

const notificationTypeOptions = [
  'notification',
  'exam',
  'result',
  'admit_card',
  'announcement'
];

interface CustomSection {
  id: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  media_url: string | null;
  layout_type: string;
  icon: string | null;
  button_label: string | null;
  button_url: string | null;
  display_order: number;
}

type SubmitKey =
  | 'notification'
  | 'syllabus'
  | 'cutoff'
  | 'date'
  | 'tip'
  | 'article'
  | 'customSection';

export default function AdminCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [notifications, setNotifications] = useState<CategoryNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    id: '',
    title: '',
    notification_type: 'notification',
    notification_date: '',
    description: '',
    link_url: ''
  });

  const [syllabus, setSyllabus] = useState<SyllabusSection[]>([]);
  const [syllabusForm, setSyllabusForm] = useState({
    id: '',
    subject_name: '',
    description: '',
    topics: ''
  });
  const [cutoffs, setCutoffs] = useState<CategoryCutoff[]>([]);
  const [cutoffForm, setCutoffForm] = useState({
    id: '',
    exam_name: '',
    year: '',
    cutoff_category: '',
    marks: '',
    total_marks: '',
    description: ''
  });
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [dateForm, setDateForm] = useState({
    id: '',
    event_name: '',
    event_date: '',
    event_date_text: '',
    description: '',
    link_url: ''
  });
  const [tips, setTips] = useState<PreparationTip[]>([]);
  const [tipForm, setTipForm] = useState({
    id: '',
    title: '',
    description: '',
    tip_type: 'general'
  });
  const [articles, setArticles] = useState<CategoryArticle[]>([]);
  const [articleForm, setArticleForm] = useState({
    article_id: '',
    display_order: '0',
    is_featured: false
  });
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [customSectionForm, setCustomSectionForm] = useState({
    id: '',
    title: '',
    subtitle: '',
    content: '',
    media_url: '',
    layout_type: 'default',
    icon: '',
    button_label: '',
    button_url: '',
    display_order: '0'
  });
  const [submitting, setSubmitting] = useState<Record<SubmitKey, boolean>>({
    notification: false,
    syllabus: false,
    cutoff: false,
    date: false,
    tip: false,
    article: false,
    customSection: false
  });
  const [subcategories, setSubcategories] = useState<SubcategorySummary[]>([]);
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

  const setSubmittingState = (key: SubmitKey, value: boolean) =>
    setSubmitting((prev) => ({ ...prev, [key]: value }));

  const resetForms = () => {
    setNotificationForm({ id: '', title: '', notification_type: 'notification', notification_date: '', description: '', link_url: '' });
    setSyllabusForm({ id: '', subject_name: '', description: '', topics: '' });
    setCutoffForm({ id: '', exam_name: '', year: '', cutoff_category: '', marks: '', total_marks: '', description: '' });
    setDateForm({ id: '', event_name: '', event_date: '', event_date_text: '', description: '', link_url: '' });
    setTipForm({ id: '', title: '', description: '', tip_type: 'general' });
    setArticleForm({ article_id: '', display_order: '0', is_featured: false });
    setCustomSectionForm({
      id: '',
      title: '',
      subtitle: '',
      content: '',
      media_url: '',
      layout_type: 'default',
      icon: '',
      button_label: '',
      button_url: '',
      display_order: '0'
    });
  };

  const updateNotificationForm = (updates: Partial<typeof notificationForm>) =>
    setNotificationForm((prev) => ({ ...prev, ...updates }));
  const updateSyllabusForm = (updates: Partial<typeof syllabusForm>) =>
    setSyllabusForm((prev) => ({ ...prev, ...updates }));
  const updateCutoffForm = (updates: Partial<typeof cutoffForm>) =>
    setCutoffForm((prev) => ({ ...prev, ...updates }));
  const updateDateForm = (updates: Partial<typeof dateForm>) =>
    setDateForm((prev) => ({ ...prev, ...updates }));
  const updateTipForm = (updates: Partial<typeof tipForm>) =>
    setTipForm((prev) => ({ ...prev, ...updates }));
  const updateArticleForm = (updates: Partial<typeof articleForm>) =>
    setArticleForm((prev) => ({ ...prev, ...updates }));
  const updateCustomSectionForm = (updates: Partial<typeof customSectionForm>) =>
    setCustomSectionForm((prev) => ({ ...prev, ...updates }));
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

  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const data = await categoryAdminService.getNotifications(categoryId);
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const loadSyllabus = async () => {
    try {
      const data = await categoryAdminService.getSyllabus(categoryId);
      setSyllabus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCutoffs = async () => {
    try {
      const data = await categoryAdminService.getCutoffs(categoryId);
      setCutoffs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDates = async () => {
    try {
      const data = await categoryAdminService.getImportantDates(categoryId);
      setDates(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTips = async () => {
    try {
      const data = await categoryAdminService.getPreparationTips(categoryId);
      setTips(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadArticles = async () => {
    try {
      const data = await categoryAdminService.getArticles(categoryId);
      setArticles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCustomSections = async () => {
    try {
      const data = await categoryAdminService.getCustomSections(categoryId);
      setCustomSections(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSubcategories = async () => {
    try {
      const data = await categoryAdminService.getSubcategories(categoryId);
      setSubcategories(data || []);
    } catch (err) {
      console.error(err);
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
    Promise.all([
      loadNotifications(),
      loadSyllabus(),
      loadCutoffs(),
      loadDates(),
      loadTips(),
      loadArticles(),
      loadCustomSections(),
      loadSubcategories()
    ]).catch(console.error);
  }, [categoryId]);

  const onSaveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState('notification', true);
      if (notificationForm.id) {
        await categoryAdminService.updateNotification(categoryId, notificationForm.id, notificationForm);
      } else {
        await categoryAdminService.createNotification(categoryId, notificationForm);
      }
      await loadNotifications();
      setNotificationForm({ id: '', title: '', notification_type: 'notification', notification_date: '', description: '', link_url: '' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingState('notification', false);
    }
  };

  const onSaveSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState('syllabus', true);
      const topicsArray = syllabusForm.topics
        .split('\n')
        .map((topic) => topic.trim())
        .filter(Boolean);
      await categoryAdminService.upsertSyllabus(categoryId, {
        subject_name: syllabusForm.subject_name,
        description: syllabusForm.description,
        topics: topicsArray
      }, syllabusForm.id || undefined);
      await loadSyllabus();
      setSyllabusForm({ id: '', subject_name: '', description: '', topics: '' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingState('syllabus', false);
    }
  };

  const onSaveCutoff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState('cutoff', true);
      await categoryAdminService.upsertCutoff(categoryId, cutoffForm, cutoffForm.id || undefined);
      await loadCutoffs();
      setCutoffForm({ id: '', exam_name: '', year: '', cutoff_category: '', marks: '', total_marks: '', description: '' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingState('cutoff', false);
    }
  };

  const onSaveDate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState('date', true);
      await categoryAdminService.upsertImportantDate(categoryId, dateForm, dateForm.id || undefined);
      await loadDates();
      setDateForm({ id: '', event_name: '', event_date: '', event_date_text: '', description: '', link_url: '' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingState('date', false);
    }
  };

  const onSaveTip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState('tip', true);
      await categoryAdminService.upsertPreparationTip(categoryId, tipForm, tipForm.id || undefined);
      await loadTips();
      setTipForm({ id: '', title: '', description: '', tip_type: 'general' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingState('tip', false);
    }
  };

  const onLinkArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState('article', true);
      if (!articleForm.article_id) {
        throw new Error('Article ID is required');
      }
      await categoryAdminService.linkArticle(categoryId, articleForm);
      await loadArticles();
      setArticleForm({ article_id: '', display_order: '0', is_featured: false });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingState('article', false);
    }
  };

  const onSaveCustomSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingState('customSection', true);
      const payload = {
        title: customSectionForm.title,
        subtitle: customSectionForm.subtitle,
        content: customSectionForm.content,
        media_url: customSectionForm.media_url,
        layout_type: customSectionForm.layout_type,
        icon: customSectionForm.icon,
        button_label: customSectionForm.button_label,
        button_url: customSectionForm.button_url,
        display_order: customSectionForm.display_order
      };

      await categoryAdminService.upsertCustomSection(
        categoryId,
        payload,
        customSectionForm.id || undefined
      );
      await loadCustomSections();
      setCustomSectionForm({
        id: '',
        title: '',
        subtitle: '',
        content: '',
        media_url: '',
        layout_type: 'default',
        icon: '',
        button_label: '',
        button_url: '',
        display_order: '0'
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingState('customSection', false);
    }
  };

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
          loadNotifications();
          loadSyllabus();
          loadCutoffs();
          loadDates();
          loadTips();
          loadArticles();
          loadCustomSections();
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
        description="Manage subcategory-specific content like overview, updates, and papers"
      >
        {subcategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subcategories found for this category.</p>
        ) : (
          <div className="space-y-3">
            {subcategories.map((sub) => {
              const status = getSubcategoryStatus(sub.is_active);
              return (
                <div
                  key={sub.id}
                  className="border border-border rounded-xl p-4 hover:border-primary/40 transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-lg">{sub.name}</p>
                        <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                          /{category.slug}/{sub.slug}
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
                      <Link href={`/${category.slug}/${sub.slug}`} target="_blank">
                        View page
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/subcategories/${sub.id}`}>
                        Manage
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={Bell}
        title="Notifications"
        description="Create announcements, admit cards, results, and other updates."
      >
        <form onSubmit={onSaveNotification} className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Title"
            value={notificationForm.title}
            onChange={(e) => updateNotificationForm({ title: e.target.value })}
            required
          />
          <select
            className="px-3 py-2 border border-border rounded-lg"
            value={notificationForm.notification_type}
            onChange={(e) => updateNotificationForm({ notification_type: e.target.value })}
          >
            {notificationTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type.replace('_', ' ')}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={notificationForm.notification_date}
            onChange={(e) => updateNotificationForm({ notification_date: e.target.value })}
            required
          />
          <Input
            placeholder="Link URL"
            value={notificationForm.link_url}
            onChange={(e) => updateNotificationForm({ link_url: e.target.value })}
          />
          <Textarea
            className="md:col-span-2"
            placeholder="Description"
            value={notificationForm.description}
            onChange={(e) => updateNotificationForm({ description: e.target.value })}
          />
          <div className="md:col-span-2 flex gap-2 justify-end">
            {notificationForm.id && (
              <Button type="button" variant="outline" onClick={() => setNotificationForm({ id: '', title: '', notification_type: 'notification', notification_date: '', description: '', link_url: '' })}>
                Cancel Edit
              </Button>
            )}
            <Button type="submit" disabled={submitting.notification}>
              {submitting.notification ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {notificationForm.id ? 'Updating…' : 'Saving…'}
                </span>
              ) : notificationForm.id ? 'Update Notification' : 'Add Notification'}
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {notificationsLoading ? (
            <LoadingSpinner />
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="border border-border rounded-lg p-4 flex flex-col gap-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold">{notification.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{notification.notification_type.replace('_', ' ')} • {new Date(notification.notification_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setNotificationForm({
                          id: notification.id,
                          title: notification.title,
                          notification_type: notification.notification_type,
                          notification_date: notification.notification_date || '',
                          description: notification.description || '',
                          link_url: notification.link_url || ''
                        })
                      }
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm('Delete this notification?')) {
                          await categoryAdminService.deleteNotification(categoryId, notification.id);
                          loadNotifications();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {notification.description && (
                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                )}
                {notification.link_url && (
                  <a
                    href={notification.link_url}
                    target="_blank"
                    className="text-sm text-primary inline-flex items-center gap-1"
                    rel="noreferrer"
                  >
                    Open link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={BookOpen}
        title="Syllabus"
        description="Organize subject-wise syllabus with detailed topics."
      >
        <form onSubmit={onSaveSyllabus} className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Input
              placeholder="Subject name"
              value={syllabusForm.subject_name}
              onChange={(e) => updateSyllabusForm({ subject_name: e.target.value })}
              required
            />
            <Input
              placeholder="Subject description"
              value={syllabusForm.description}
              onChange={(e) => updateSyllabusForm({ description: e.target.value })}
            />
          </div>
          <Textarea
            rows={4}
            placeholder="Topics (one per line)"
            value={syllabusForm.topics}
            onChange={(e) => updateSyllabusForm({ topics: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            {syllabusForm.id && (
              <Button variant="outline" type="button" onClick={() => setSyllabusForm({ id: '', subject_name: '', description: '', topics: '' })}>
                Cancel Edit
              </Button>
            )}
            <Button type="submit" disabled={submitting.syllabus}>
              {submitting.syllabus ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {syllabusForm.id ? 'Updating…' : 'Saving…'}
                </span>
              ) : syllabusForm.id ? 'Update Subject' : 'Add Subject'}
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {syllabus.length === 0 ? (
            <p className="text-sm text-muted-foreground">No syllabus subjects yet.</p>
          ) : (
            syllabus.map((section) => (
              <div key={section.id} className="border border-border rounded-lg p-4">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-semibold">{section.subject_name}</p>
                    {section.description && (
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSyllabusForm({
                        id: section.id,
                        subject_name: section.subject_name,
                        description: section.description || '',
                        topics: (section.category_syllabus_topics || []).map((topic) => topic.topic_name).join('\n')
                      })}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm('Delete this subject?')) {
                          await categoryAdminService.deleteSyllabus(categoryId, section.id);
                          loadSyllabus();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {section.category_syllabus_topics && section.category_syllabus_topics.length > 0 && (
                  <ul className="mt-3 list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {section.category_syllabus_topics.map((topic) => (
                      <li key={topic.topic_name}>{topic.topic_name}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={Award}
        title="Cutoffs"
        description="Maintain previous year cutoff scores by category."
      >
        <form onSubmit={onSaveCutoff} className="grid md:grid-cols-3 gap-3">
          <Input placeholder="Exam name" value={cutoffForm.exam_name ?? ''} onChange={(e) => updateCutoffForm({ exam_name: e.target.value })} />
          <Input placeholder="Year" value={cutoffForm.year} onChange={(e) => updateCutoffForm({ year: e.target.value })} required />
          <Input placeholder="Category" value={cutoffForm.cutoff_category} onChange={(e) => updateCutoffForm({ cutoff_category: e.target.value })} required />
          <Input type="text" inputMode="decimal" placeholder="Marks" value={cutoffForm.marks} onChange={(e) => updateCutoffForm({ marks: e.target.value })} required />
          <Input type="text" inputMode="decimal" placeholder="Total marks" value={cutoffForm.total_marks} onChange={(e) => updateCutoffForm({ total_marks: e.target.value })} />
          <Input placeholder="Description" value={cutoffForm.description} onChange={(e) => updateCutoffForm({ description: e.target.value })} />
          <div className="md:col-span-3 flex justify-end gap-2">
            {cutoffForm.id && (
              <Button variant="outline" type="button" onClick={() => setCutoffForm({ id: '', exam_name: '', year: '', cutoff_category: '', marks: '', total_marks: '', description: '' })}>
                Cancel Edit
              </Button>
            )}
            <Button type="submit" disabled={submitting.cutoff}>
              {submitting.cutoff ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {cutoffForm.id ? 'Updating…' : 'Saving…'}
                </span>
              ) : cutoffForm.id ? 'Update Cutoff' : 'Add Cutoff'}
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {cutoffs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cutoff data yet.</p>
          ) : (
            cutoffs.map((cutoff) => (
              <div key={cutoff.id} className="border border-border rounded-lg p-4 flex flex-col gap-2">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-semibold">{cutoff.exam_name || 'General'} - {cutoff.year}</p>
                    <p className="text-sm text-muted-foreground">{cutoff.cutoff_category}: {cutoff.marks} / {cutoff.total_marks || 'NA'}</p>
                    {cutoff.description && (
                      <p className="text-sm text-muted-foreground">{cutoff.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setCutoffForm({
                      id: cutoff.id,
                      exam_name: cutoff.exam_name || '',
                      year: cutoff.year,
                      cutoff_category: cutoff.cutoff_category,
                      marks: cutoff.marks.toString(),
                      total_marks: cutoff.total_marks?.toString() || '',
                      description: cutoff.description || ''
                    })}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      if (confirm('Delete this cutoff?')) {
                        await categoryAdminService.deleteCutoff(categoryId, cutoff.id);
                        loadCutoffs();
                      }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={Calendar}
        title="Important Dates"
        description="Track key milestones like notification releases and exam windows."
      >
        <form onSubmit={onSaveDate} className="grid md:grid-cols-2 gap-3">
          <Input placeholder="Event name" value={dateForm.event_name} onChange={(e) => updateDateForm({ event_name: e.target.value })} required />
          <Input type="date" value={dateForm.event_date} onChange={(e) => updateDateForm({ event_date: e.target.value })} />
          <Input placeholder="Event date text (e.g., November 2024)" value={dateForm.event_date_text} onChange={(e) => updateDateForm({ event_date_text: e.target.value })} />
          <Input placeholder="Link URL" value={dateForm.link_url} onChange={(e) => updateDateForm({ link_url: e.target.value })} />
          <Textarea className="md:col-span-2" placeholder="Description" value={dateForm.description} onChange={(e) => updateDateForm({ description: e.target.value })} />
          <div className="md:col-span-2 flex justify-end gap-2">
            {dateForm.id && (
              <Button variant="outline" type="button" onClick={() => setDateForm({ id: '', event_name: '', event_date: '', event_date_text: '', description: '', link_url: '' })}>
                Cancel Edit
              </Button>
            )}
            <Button type="submit" disabled={submitting.date}>
              {submitting.date ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {dateForm.id ? 'Updating…' : 'Saving…'}
                </span>
              ) : dateForm.id ? 'Update Event' : 'Add Event'}
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {dates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No important dates yet.</p>
          ) : (
            dates.map((event) => (
              <div key={event.id} className="border border-border rounded-lg p-4 flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{event.event_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.event_date ? new Date(event.event_date).toLocaleDateString() : event.event_date_text || 'TBD'}
                  </p>
                  {event.description && (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDateForm({
                    id: event.id,
                    event_name: event.event_name,
                    event_date: event.event_date || '',
                    event_date_text: event.event_date_text || '',
                    description: event.description || '',
                    link_url: event.link_url || ''
                  })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    if (confirm('Delete this event?')) {
                      await categoryAdminService.deleteImportantDate(categoryId, event.id);
                      loadDates();
                    }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={BookMarked}
        title="Preparation Tips"
        description="Share strategies and study plans for aspirants."
      >
        <form onSubmit={onSaveTip} className="space-y-3">
          <Input placeholder="Tip title" value={tipForm.title} onChange={(e) => updateTipForm({ title: e.target.value })} required />
          <Textarea rows={3} placeholder="Description" value={tipForm.description} onChange={(e) => updateTipForm({ description: e.target.value })} required />
          <div className="flex gap-3">
            <Input placeholder="Tip type (optional)" value={tipForm.tip_type} onChange={(e) => updateTipForm({ tip_type: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            {tipForm.id && (
              <Button variant="outline" type="button" onClick={() => setTipForm({ id: '', title: '', description: '', tip_type: 'general' })}>
                Cancel Edit
              </Button>
            )}
            <Button type="submit" disabled={submitting.tip}>
              {submitting.tip ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {tipForm.id ? 'Updating…' : 'Saving…'}
                </span>
              ) : tipForm.id ? 'Update Tip' : 'Add Tip'}
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {tips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tips added yet.</p>
          ) : (
            tips.map((tip) => (
              <div key={tip.id} className="border border-border rounded-lg p-4 flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{tip.title}</p>
                  <p className="text-sm text-muted-foreground">{tip.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setTipForm({
                    id: tip.id,
                    title: tip.title,
                    description: tip.description,
                    tip_type: tip.tip_type
                  })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    if (confirm('Delete this tip?')) {
                      await categoryAdminService.deletePreparationTip(categoryId, tip.id);
                      loadTips();
                    }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={FileText}
        title="Articles"
        description="Link editorial content to this category."
      >
        <form onSubmit={onLinkArticle} className="grid md:grid-cols-3 gap-3">
          <Input placeholder="Article UUID" value={articleForm.article_id} onChange={(e) => updateArticleForm({ article_id: e.target.value })} required />
          <Input type="text" inputMode="numeric" placeholder="Display order" value={articleForm.display_order} onChange={(e) => updateArticleForm({ display_order: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={articleForm.is_featured} onChange={(e) => updateArticleForm({ is_featured: e.target.checked })} />
            Featured
          </label>
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" disabled={submitting.article}>
              {submitting.article ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Linking…
                </span>
              ) : 'Link Article'}
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No articles linked yet.</p>
          ) : (
            articles.map((entry) => (
              <div key={entry.id} className="border border-border rounded-lg p-4 flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{entry.articles?.title || 'Untitled'}</p>
                  <p className="text-sm text-muted-foreground">Slug: {entry.articles?.slug}</p>
                  {entry.is_featured && (
                    <span className="inline-flex items-center text-xs text-primary">Featured</span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={async () => {
                  if (confirm('Remove this article link?')) {
                    await categoryAdminService.unlinkArticle(categoryId, entry.articles.id);
                    loadArticles();
                  }
                }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={Layers}
        title="Custom Sections"
        description="Design bespoke content blocks with media, CTAs, and layout variations."
      >
        <form onSubmit={onSaveCustomSection} className="grid md:grid-cols-2 gap-3">
          <Input
            placeholder="Section title"
            value={customSectionForm.title}
            onChange={(e) => updateCustomSectionForm({ title: e.target.value })}
            required
          />
          <Input
            placeholder="Subtitle"
            value={customSectionForm.subtitle}
            onChange={(e) => updateCustomSectionForm({ subtitle: e.target.value })}
          />
          <Textarea
            className="md:col-span-2"
            rows={3}
            placeholder="Body content"
            value={customSectionForm.content}
            onChange={(e) => updateCustomSectionForm({ content: e.target.value })}
          />
          <Input
            placeholder="Media URL"
            value={customSectionForm.media_url}
            onChange={(e) => updateCustomSectionForm({ media_url: e.target.value })}
          />
          <Input
            placeholder="Layout type (e.g., hero, split, stats)"
            value={customSectionForm.layout_type}
            onChange={(e) => updateCustomSectionForm({ layout_type: e.target.value })}
          />
          <Input
            placeholder="Icon"
            value={customSectionForm.icon}
            onChange={(e) => updateCustomSectionForm({ icon: e.target.value })}
          />
          <Input
            placeholder="Button label"
            value={customSectionForm.button_label}
            onChange={(e) => updateCustomSectionForm({ button_label: e.target.value })}
          />
          <Input
            placeholder="Button URL"
            value={customSectionForm.button_url}
            onChange={(e) => updateCustomSectionForm({ button_url: e.target.value })}
          />
          <Input
            placeholder="Display order"
            type="text"
            inputMode="numeric"
            value={customSectionForm.display_order}
            onChange={(e) => updateCustomSectionForm({ display_order: e.target.value })}
          />
          <div className="md:col-span-2 flex justify-end gap-2">
            {customSectionForm.id && (
              <Button variant="outline" type="button" onClick={() => setCustomSectionForm({
                id: '',
                title: '',
                subtitle: '',
                content: '',
                media_url: '',
                layout_type: 'default',
                icon: '',
                button_label: '',
                button_url: '',
                display_order: '0'
              })}>
                Cancel Edit
              </Button>
            )}
            <Button type="submit" disabled={submitting.customSection}>
              {submitting.customSection ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {customSectionForm.id ? 'Updating…' : 'Saving…'}
                </span>
              ) : customSectionForm.id ? 'Update Section' : 'Add Section'}
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {customSections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom sections yet.</p>
          ) : (
            customSections.map((section) => (
              <div key={section.id} className="border border-border rounded-lg p-4 flex justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-semibold">{section.title}</p>
                  {section.subtitle && <p className="text-sm text-muted-foreground">{section.subtitle}</p>}
                  {section.content && <p className="text-sm text-muted-foreground line-clamp-2">{section.content}</p>}
                  <p className="text-xs text-muted-foreground">
                    Layout: {section.layout_type} • Order: {section.display_order}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setCustomSectionForm({
                    id: section.id,
                    title: section.title,
                    subtitle: section.subtitle || '',
                    content: section.content || '',
                    media_url: section.media_url || '',
                    layout_type: section.layout_type || 'default',
                    icon: section.icon || '',
                    button_label: section.button_label || '',
                    button_url: section.button_url || '',
                    display_order: section.display_order.toString()
                  })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    if (confirm('Delete this custom section?')) {
                      await categoryAdminService.deleteCustomSection(categoryId, section.id);
                      loadCustomSections();
                    }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
