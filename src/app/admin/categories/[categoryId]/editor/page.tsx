'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Eye,
  RefreshCw,
  Settings,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  ListOrdered,
  Type,
  Image as ImageIcon,
  FileText,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { BlockEditor } from '@/components/PageEditor/BlockEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Section {
  id: string;
  section_key: string;
  title: string;
  subtitle?: string;
  display_order: number;
  blocks: Block[];
  is_sidebar?: boolean;
  custom_tab_id?: string | null;
  category_custom_tab_id?: string | null;
}

const serializeSections = (subset: Section[]) => JSON.stringify(
  subset
    .map((section) => ({
      ...section,
      blocks: (section.blocks || []).map((block) => ({
        ...block
      }))
    }))
    .sort((a, b) => a.display_order - b.display_order)
);

interface CustomTab {
  id: string;
  title: string;
  tab_key: string;
  description?: string | null;
  display_order: number;
}

interface Block {
  id: string;
  block_type: string;
  content: any;
  settings?: any;
  display_order: number;
  section_id?: string;
}

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

interface SEOData {
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  canonical_url?: string;
  robots_meta?: string;
  structured_data?: any;
  author_name?: string;
  updated_at?: string;
}

// structured_data is an overloaded JSONB: it carries the admin's JSON-LD schema
// AND internal page config (tab_headings/toc_order/tab_seo) edited by their own
// panels. The "Structured Data" field must only ever show/save the schema, so we
// strip the internal keys for that view. The backend merges, so omitting them on
// save never deletes them.
const STRUCTURED_DATA_INTERNAL_KEYS = ['tab_headings', 'toc_order', 'tab_seo', 'pdf_url'];

const stripStructuredDataConfig = (value: any): any => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const clone: Record<string, any> = { ...value };
  STRUCTURED_DATA_INTERNAL_KEYS.forEach((k) => delete clone[k]);
  return clone;
};

export default function AdminCategoryEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const categoryId = params?.categoryId ?? '';
  const envApi = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
    : '';
  const apiBase = envApi || '/api/v1';
  const buildApiUrl = (path: string) => `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') || localStorage.getItem('auth_token');
  };
  const debugLog = (..._args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // console.log('[AdminCategoryEditor]', ...args);
    }
  };

  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const latestSectionsRef = useRef<Section[]>([]);
  latestSectionsRef.current = sections;
  
  const [seoData, setSeoData] = useState<SEOData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSEOPanel, setShowSEOPanel] = useState(false);
  const [showTocPanel, setShowTocPanel] = useState(false);
  const [showTabHeadingsPanel, setShowTabHeadingsPanel] = useState(false);
  const [tocOrder, setTocOrder] = useState<Record<string, number | ''>>({});
  const [tabHeadings, setTabHeadings] = useState<Record<string, string>>({});
  const [uploadingOgImage, setUploadingOgImage] = useState(false);
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('overview');
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfUploading, setPdfUploading] = useState(false);

  const loadCustomTabs = async () => {
    try {
      const token = getAuthToken();
      const endpoint = buildApiUrl(`/category-page-content/${categoryId}/custom-tabs`);
      const res = await fetch(endpoint, {
        cache: 'no-store',
        headers: token ? { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        } : {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch custom tabs');
      const data = await res.json();
      const tabs = data.data || [];
      setCustomTabs(tabs);
      setActiveTabId((prev) => (prev === 'overview' || tabs.some((tab: CustomTab) => tab.id === prev) ? prev : 'overview'));
    } catch (error) {
      console.error('Failed to load custom tabs:', error);
    }
  };

  const handleCreateTab = async () => {
    const title = window.prompt('Enter tab title');
    if (!title || !title.trim()) return;
    try {
      const token = getAuthToken();
      await fetch(buildApiUrl(`/category-page-content/${categoryId}/custom-tabs`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ title: title.trim() })
      });
      await loadCustomTabs();
    } catch (error) {
      console.error('Failed to create tab:', error);
      toast({ title: 'Error', description: 'Unable to create tab', variant: 'destructive' });
    }
  };

  const handleRenameTab = async (tab: CustomTab) => {
    const title = window.prompt('Rename tab', tab.title);
    if (!title || !title.trim() || title.trim() === tab.title) return;
    try {
      const token = getAuthToken();
      await fetch(buildApiUrl(`/category-page-content/${categoryId}/custom-tabs/${tab.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ title: title.trim() })
      });
      await loadCustomTabs();
    } catch (error) {
      console.error('Failed to rename tab:', error);
      toast({ title: 'Error', description: 'Unable to rename tab', variant: 'destructive' });
    }
  };

  const handleDeleteTab = async (tab: CustomTab) => {
    const confirmDelete = window.confirm(`Delete tab "${tab.title}"? Sections under this tab will move to Overview.`);
    if (!confirmDelete) return;
    try {
      const token = getAuthToken();
      await fetch(buildApiUrl(`/category-page-content/${categoryId}/custom-tabs/${tab.id}`), {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      setSections((prev) => prev.map((section) =>
        (section.category_custom_tab_id === tab.id || section.custom_tab_id === tab.id)
          ? { ...section, category_custom_tab_id: null, custom_tab_id: null }
          : section
      ));
      setActiveTabId('overview');
      await loadCustomTabs();
    } catch (error) {
      console.error('Failed to delete tab:', error);
      toast({ title: 'Error', description: 'Unable to delete tab', variant: 'destructive' });
    }
  };

  const handleMoveTab = async (tabId: string, direction: 'left' | 'right') => {
    const index = customTabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= customTabs.length) return;
    const reordered = [...customTabs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setCustomTabs(reordered);
    try {
      const token = getAuthToken();
      await fetch(buildApiUrl(`/category-page-content/${categoryId}/custom-tabs/reorder`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ tabIds: reordered.map((tab) => tab.id) })
      });
    } catch (error) {
      console.error('Failed to reorder tabs:', error);
    }
  };

  useEffect(() => {
    if (!categoryId) return;
    const bootstrap = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadCategoryInfo(),
          loadPageContent(),
          loadCustomTabs()
        ]);
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [categoryId]);

  const updateSectionsForActiveTab = useCallback((updatedSubset: Section[]) => {
    setSections((prev) => {
      const retain: Section[] = [];
      const currentSubset: Section[] = [];

      prev.forEach((section) => {
        const belongsToActive = activeTabId === 'overview'
          ? !section.category_custom_tab_id && !section.custom_tab_id
          : (section.category_custom_tab_id === activeTabId || section.custom_tab_id === activeTabId);
        if (belongsToActive) {
          currentSubset.push(section);
        } else {
          retain.push(section);
        }
      });

      const normalizedSubset = updatedSubset.map((section, index) => ({
        ...section,
        category_custom_tab_id: activeTabId === 'overview' ? null : activeTabId,
        custom_tab_id: activeTabId === 'overview' ? null : activeTabId,
        display_order: index,
        blocks: section.blocks || []
      }));

      if (serializeSections(currentSubset) === serializeSections(normalizedSubset)) {
        return prev;
      }

      return [...retain, ...normalizedSubset];
    });
  }, [activeTabId]);

  const sectionsForActiveTab = useMemo(() => (
    sections
      .filter((section) => (
        activeTabId === 'overview'
          ? !section.category_custom_tab_id && !section.custom_tab_id
          : (section.category_custom_tab_id === activeTabId || section.custom_tab_id === activeTabId)
      ))
      .sort((a, b) => a.display_order - b.display_order)
  ), [sections, activeTabId]);

  const tabOptions = useMemo(() => [
    { id: 'overview', title: 'Overview' },
    ...customTabs
  ], [customTabs]);

  const mediaUploadConfig = useMemo(() => ({
    maxSizeMB: 150,
    onUpload: async (file: File, context: { blockType: 'image' | 'video' }) => {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `page-content/category/${categoryId}/${context.blockType === 'image' ? 'images' : 'videos'}/${activeTabId}`);

      const res = await fetch(buildApiUrl(`/category-page-content/${categoryId}/media`), {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return {
        url: data.file_url,
        alt: data.file_name,
        caption: data.caption || undefined
      };
    },
    onUploadError: (message: string) => {
      toast({ title: 'Upload failed', description: message, variant: 'destructive' });
    },
    onUploadSuccess: (message?: string) => {
      toast({ title: message || 'Upload complete', description: 'File is ready to use inside the block editor.' });
    }
  }), [categoryId, activeTabId, toast]);

  const loadCategoryInfo = async () => {
    try {
      const endpoint = buildApiUrl(`/taxonomy/category-id/${categoryId}`);
      debugLog('Fetching category info', endpoint);
      const response = await fetch(endpoint, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch category info');
      }

      const raw = await response.json();
      const payload = raw?.data ?? raw;
      setCategoryInfo(payload);
      return payload;
    } catch (error) {
      console.error('Error loading category info:', error);
      toast({ title: 'Error', description: 'Failed to load category information', variant: 'destructive' });
      return null;
    }
  };

  const loadPageContent = async () => {
    try {
      const token = getAuthToken();
      const separator = (categoryId || '').includes('?') ? '&' : '?';
      const endpoint = buildApiUrl(`/category-page-content/${categoryId}${separator}_t=${Date.now()}`);
      debugLog('Fetching page content', endpoint);
      const response = await fetch(endpoint, {
        cache: 'no-store',
        headers: token ? { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        } : {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch page content');
      }

      const data = await response.json();
      const nextSections = data.sections || [];
      const nextTabs = data.customTabs || [];
      setSections(nextSections);
      setSeoData(data.seo || {});
      setCustomTabs(nextTabs);
      setTocOrder(data.tocOrder || {});
      setTabHeadings(data.tabHeadings || {});
      setPdfUrl(data.pdfUrl || '');
      setActiveTabId((prev) => (prev === 'overview' || nextTabs.some((tab: CustomTab) => tab.id === prev) ? prev : 'overview'));
    } catch (error) {
      console.error('Error loading page content:', error);
      toast({ title: 'Error', description: 'Failed to load page content', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    // Wait briefly to allow any pending onBlur events (from content-editable elements) 
    // to propagate their state updates to the parent component before saving.
    await new Promise(resolve => setTimeout(resolve, 200));
    const updatedSections = latestSectionsRef.current;

    try {
      setSaving(true);
      const token = getAuthToken();

      if (!token) {
        toast({ title: 'Authentication Error', description: 'Please log in to save changes', variant: 'destructive' });
        return;
      }

      // Renumber each section's blocks by their on-screen array position so the public
      // page (which orders blocks by display_order) renders them in the exact same
      // sequence shown in the editor. Deleting then adding blocks could otherwise leave
      // duplicate display_order values, making the public block order non-deterministic.
      // Section display_order is left untouched — it's maintained per-tab by moveSection.
      const bulkPayload = {
        sections: updatedSections.map((section) => ({
          ...section,
          blocks: (section.blocks || []).map((block, blockIndex) => ({
            ...block,
            display_order: blockIndex
          }))
        }))
      };

      const endpoint = buildApiUrl(`/category-page-content/${categoryId}/bulk-sync`);
      debugLog('Bulk syncing page content', { endpoint, payloadSize: bulkPayload.sections.length });
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bulkPayload)
      });

      if (!response.ok) {
        throw new Error('Bulk sync failed');
      }

      const saveResult = await response.json();

      // Create revision asynchronously (don't wait for it)
      const revisionEndpoint = buildApiUrl(`/category-page-content/${categoryId}/revisions`);
      fetch(revisionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ change_summary: 'Content updated via block editor' })
      }).catch(err => console.warn('Failed to create revision:', err));

      toast({ title: 'Success', description: 'Page content saved successfully' });

      // Use the fresh sections returned directly by bulk-sync instead of re-fetching
      if (Array.isArray(saveResult?.sections)) {
        setSections(saveResult.sections);
      } else {
        await loadPageContent();
      }
    } catch (error) {
      console.error('Error saving page content:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save page content',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSeoChange = (field: keyof SEOData, value: string) => {
    setSeoData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOgImageFile = async (file: File) => {
    try {
      setUploadingOgImage(true);
      const token = getAuthToken();
      if (!token) {
        toast({ title: 'Authentication Error', description: 'Please log in to upload images', variant: 'destructive' });
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `seo/${categoryId}`);

      const uploadResponse = await fetch(
        buildApiUrl(`/category-page-content/${categoryId}/media`),
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        }
      );

      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploadData = await uploadResponse.json();
      if (!uploadData?.file_url) throw new Error('Upload did not return a URL');

      handleSeoChange('og_image_url', uploadData.file_url);
      toast({ title: 'Image uploaded', description: 'OG image updated successfully' });
    } catch (error) {
      console.error('Failed to upload OG image:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload image',
        variant: 'destructive'
      });
    } finally {
      setUploadingOgImage(false);
    }
  };

  // Persist the category-page PDF URL into page_seo.structured_data.pdf_url.
  // Sends the full seoData (updateSEO nulls any omitted field) with only pdf_url
  // changed inside structured_data; the backend merges so schema/tab config survive.
  const persistPdfUrl = async (url: string | null) => {
    const token = getAuthToken();
    if (!token) {
      toast({ title: 'Authentication Error', description: 'Please log in to save the PDF', variant: 'destructive' });
      return false;
    }
    const existingStructured = (typeof seoData.structured_data === 'object' && seoData.structured_data)
      ? seoData.structured_data
      : {};
    const response = await fetch(buildApiUrl(`/category-page-content/${categoryId}/seo`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        ...seoData,
        structured_data: { ...existingStructured, pdf_url: url || null }
      })
    });
    if (!response.ok) throw new Error('Failed to save PDF');
    setSeoData((prev: any) => ({
      ...prev,
      structured_data: {
        ...(typeof prev.structured_data === 'object' && prev.structured_data ? prev.structured_data : {}),
        pdf_url: url || null
      }
    }));
    return true;
  };

  const handlePdfFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({ title: 'Invalid file', description: 'Please select a PDF file.', variant: 'destructive' });
      return;
    }
    try {
      setPdfUploading(true);
      const token = getAuthToken();
      if (!token) {
        toast({ title: 'Authentication Error', description: 'Please log in to upload', variant: 'destructive' });
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `page-content/category/${categoryId}/pdf`);
      const uploadResponse = await fetch(buildApiUrl(`/category-page-content/${categoryId}/media`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploadData = await uploadResponse.json();
      if (!uploadData?.file_url) throw new Error('Upload did not return a URL');
      await persistPdfUrl(uploadData.file_url);
      setPdfUrl(uploadData.file_url);
      toast({ title: 'PDF uploaded', description: 'The download PDF for this category is live.' });
    } catch (error) {
      console.error('Failed to upload PDF:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload PDF',
        variant: 'destructive'
      });
    } finally {
      setPdfUploading(false);
    }
  };

  const handleRemovePdf = async () => {
    if (!window.confirm('Remove the download PDF for this category? The button will be hidden on the public page.')) return;
    try {
      setPdfUploading(true);
      await persistPdfUrl(null);
      setPdfUrl('');
      toast({ title: 'PDF removed', description: 'The download button is now hidden on the public page.' });
    } catch (error) {
      console.error('Failed to remove PDF:', error);
      toast({ title: 'Error', description: 'Could not remove the PDF', variant: 'destructive' });
    } finally {
      setPdfUploading(false);
    }
  };

  const handleSaveSEO = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast({ title: 'Authentication Error', description: 'Please log in to save SEO settings', variant: 'destructive' });
        return;
      }

      // Parse structured_data if it's a valid JSON string, otherwise keep as string
      let parsedStructuredData = seoData.structured_data;
      if (typeof seoData.structured_data === 'string' && seoData.structured_data.trim()) {
        try {
          parsedStructuredData = JSON.parse(seoData.structured_data);
        } catch (e) {
          // If parsing fails, keep as string
          parsedStructuredData = seoData.structured_data;
        }
      }

      // Only persist the JSON-LD schema here. Internal config (tab_headings/
      // toc_order/tab_seo) is owned by its own panels and preserved server-side.
      const schemaOnly = stripStructuredDataConfig(parsedStructuredData);

      const response = await fetch(
        buildApiUrl(`/category-page-content/${categoryId}/seo`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...seoData,
            structured_data: schemaOnly
          })
        }
      );

      if (!response.ok) throw new Error('Failed to save SEO settings');
      const saved = await response.json();
      // Refresh seoData from what the API persisted so local state stays in sync.
      if (saved?.data) setSeoData(saved.data);
      toast({ title: 'Success', description: 'SEO settings saved successfully' });
      setShowSEOPanel(false);
    } catch (error) {
      console.error('Error saving SEO:', error);
      toast({ title: 'Error', description: 'Failed to save SEO settings', variant: 'destructive' });
    }
  };

  const handleSaveTocOrder = async () => {
    try {
      const token = getAuthToken();
      const cleanOrder: Record<string, number> = {};
      Object.entries(tocOrder).forEach(([tab, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          cleanOrder[tab] = Number(val);
        }
      });
      const response = await fetch(
        buildApiUrl(`/category-page-content/${categoryId}/seo`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            ...seoData,
            structured_data: { ...(typeof seoData.structured_data === 'object' ? seoData.structured_data : {}), toc_order: cleanOrder }
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save TOC order');
      }

      setSeoData((prev: any) => ({
        ...prev,
        structured_data: { ...(typeof prev.structured_data === 'object' ? prev.structured_data : {}), toc_order: cleanOrder }
      }));
      toast({ title: 'Success', description: 'TOC positions saved!' });
      setShowTocPanel(false);
    } catch (error) {
      console.error('Error saving TOC order:', error);
      toast({ title: 'Error', description: 'Failed to save TOC positions.', variant: 'destructive' });
    }
  };

  const handleSaveTabHeadings = async () => {
    try {
      const token = getAuthToken();
      const cleanHeadings: Record<string, string> = {};
      Object.entries(tabHeadings).forEach(([tab, val]) => {
        if (val && val.trim()) cleanHeadings[tab] = val.trim();
      });
      const response = await fetch(
        buildApiUrl(`/category-page-content/${categoryId}/seo`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            ...seoData,
            structured_data: { ...(typeof seoData.structured_data === 'object' ? seoData.structured_data : {}), tab_headings: cleanHeadings }
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save tab headings');
      }

      setSeoData((prev: any) => ({
        ...prev,
        structured_data: { ...(typeof prev.structured_data === 'object' ? prev.structured_data : {}), tab_headings: cleanHeadings }
      }));
      toast({ title: 'Success', description: 'Tab headings saved!' });
      setShowTabHeadingsPanel(false);
    } catch (error) {
      console.error('Error saving tab headings:', error);
      toast({ title: 'Error', description: 'Failed to save tab headings.', variant: 'destructive' });
    }
  };

  const handlePreview = () => {
    if (categoryInfo?.slug) {
      window.open(`/${categoryInfo.slug}`, '_blank');
      return;
    }
    toast({ title: 'Preview Unavailable', description: 'Cannot generate preview URL', variant: 'destructive' });
  };

  const handleRefresh = () => {
    if (!categoryId) return;
    const refresh = async () => {
      setLoading(true);
      try {
        await Promise.all([loadCategoryInfo(), loadPageContent(), loadCustomTabs()]);
      } finally {
        setLoading(false);
      }
    };
    void refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading page editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex overflow-hidden">

      {/* ── MAIN EDITOR COLUMN ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ marginRight: '264px' }}>

        {/* Slim top bar */}
        <div className="bg-white border-b border-gray-200 h-11 flex items-center px-4 gap-3 sticky top-0 z-10 shadow-sm">
          <Link href="/admin" className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="w-7 h-7 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {categoryInfo?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={categoryInfo.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 truncate leading-none">
              {categoryInfo?.name || 'Category Editor'}
              <span className="ml-1.5 text-xs font-normal text-gray-400">· /{categoryInfo?.slug || '…'}</span>
            </p>
          </div>
          <span className="text-[11px] text-gray-500 border border-gray-200 rounded-full px-2.5 py-0.5 bg-gray-50 whitespace-nowrap flex-shrink-0">
            {tabOptions.find(t => t.id === activeTabId)?.title || 'Overview'}
          </span>
        </div>

        {/* Block Editor */}
        <BlockEditor
          key={activeTabId}
          sections={sectionsForActiveTab}
          onSave={() => handleSave()}
          onSectionsChange={(next) => updateSectionsForActiveTab(next as Section[])}
          tabLabel={tabOptions.find((tab) => tab.id === activeTabId)?.title}
          mediaUploadConfig={mediaUploadConfig}
          onTocOrderClick={() => setShowTocPanel(true)}
          availableTabs={tabOptions.map(t => ({ id: t.id, label: t.title }))}
        />
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <aside className="fixed right-0 top-0 bottom-0 bg-white border-l border-gray-200 flex flex-col z-[110] overflow-hidden shadow-xl" style={{ width: '264px' }}>

        {/* Identity */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {categoryInfo?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={categoryInfo.logo_url} alt="" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">{categoryInfo?.name || '—'}</p>
              <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">/{categoryInfo?.slug || '…'}</p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">

          {/* Primary actions */}
          <div className="px-4 py-3.5 border-b border-gray-100 space-y-2">
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                saving ? 'bg-blue-400 text-white cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Changes</>}
            </button>
            <div className="flex gap-2">
              <button onClick={handlePreview} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-800 transition-colors">
                <Eye className="w-3.5 h-3.5" />Preview
              </button>
              <button onClick={handleRefresh} disabled={loading} title="Reload from server" className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-800 transition-colors disabled:opacity-40">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Page Tabs */}
          <div className="px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Page Tabs</p>
              <button onClick={handleCreateTab} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md px-2.5 py-1 transition-colors">
                <Plus className="w-3 h-3" />Add Tab
              </button>
            </div>
            <div className="space-y-0.5">
              {tabOptions.map((tab) => {
                const isActive = activeTabId === tab.id;
                const linkedCustomTab = customTabs.find(ct => ct.id === tab.id);
                return (
                  <div key={tab.id} className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-all ${isActive ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`} onClick={() => setActiveTabId(tab.id)}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${isActive ? 'bg-blue-500' : 'bg-gray-300 group-hover:bg-gray-400'}`} />
                    <span className={`flex-1 text-sm truncate ${isActive ? 'font-semibold text-blue-700' : 'font-medium text-gray-700'}`}>{tab.title}</span>
                    {tab.id !== 'overview' && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleMoveTab(tab.id, 'left')} className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-600 transition-colors"><ChevronLeft className="w-3 h-3" /></button>
                        <button onClick={() => handleMoveTab(tab.id, 'right')} className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-600 transition-colors"><ChevronRight className="w-3 h-3" /></button>
                        {linkedCustomTab && (
                          <>
                            <button onClick={() => handleRenameTab(linkedCustomTab)} className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-600 transition-colors" title="Rename"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => handleDeleteTab(linkedCustomTab)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3 h-3" /></button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tools */}
          <div className="px-4 py-3.5 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Tools</p>
            <div className="space-y-0.5">
              {([
                { label: 'SEO Settings', icon: Search, accent: 'text-blue-500', bg: 'hover:bg-blue-50', onClick: () => setShowSEOPanel(true) },
                { label: 'Tab Headings', icon: Type, accent: 'text-purple-500', bg: 'hover:bg-purple-50', onClick: () => setShowTabHeadingsPanel(true) },
                { label: 'TOC Order', icon: ListOrdered, accent: 'text-orange-500', bg: 'hover:bg-orange-50', onClick: () => setShowTocPanel(true) },
              ] as const).map(({ label, icon: Icon, accent, bg, onClick }) => (
                <button key={label} onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-transparent hover:border-gray-100 ${bg} transition-all duration-100`}>
                  <Icon className={`w-4 h-4 ${accent} flex-shrink-0`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Download PDF */}
          <div className="px-4 py-3.5 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Download PDF</p>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
              Upload a PDF for this category page. When set, the public page shows a “Download PDF” button linking to this file.
            </p>
            {pdfUrl ? (
              <div className="space-y-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">Current PDF</span>
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                </a>
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors ${pdfUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                    <Upload className="w-3.5 h-3.5" />
                    {pdfUploading ? 'Working…' : 'Replace'}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={pdfUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void handlePdfFile(f); e.target.value = ''; }}
                    />
                  </label>
                  <button
                    onClick={handleRemovePdf}
                    disabled={pdfUploading}
                    className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-40"
                    title="Remove PDF"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <label className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors ${pdfUploading ? 'opacity-60 pointer-events-none' : ''}`}>
                {pdfUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {pdfUploading ? 'Uploading…' : 'Upload PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={pdfUploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handlePdfFile(f); e.target.value = ''; }}
                />
              </label>
            )}
          </div>

          {/* Page Info */}
          <div className="px-4 py-3.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Page Info</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Sections</span>
                <span className="font-medium text-gray-700">{sectionsForActiveTab.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Tabs</span>
                <span className="font-medium text-gray-700">{tabOptions.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50/70">
          <Link href="/admin" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Back to Admin
          </Link>
        </div>
      </aside>

      {/* TOC Order Modal */}
      {showTocPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTocPanel(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">TOC Mobile Position</h2>
                <p className="text-xs text-gray-500 mt-0.5">Set CSS <code className="bg-gray-100 px-1 rounded">order</code> per tab. Lower = appears earlier.</p>
              </div>
              <button onClick={() => setShowTocPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 -mr-1 -mt-1 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-3">
              {tabOptions.map(tab => (
                <div key={tab.id} className="flex items-center justify-between gap-4">
                  <label className="text-sm font-medium text-gray-700 flex-1">{tab.title}</label>
                  <input type="number" min={0} value={tocOrder[tab.id] ?? ''} onChange={e => setTocOrder(prev => ({ ...prev, [tab.id]: e.target.value === '' ? '' : parseInt(e.target.value, 10) }))} placeholder="0" className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400" />
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowTocPanel(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSaveTocOrder} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">Save Positions</button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Headings Modal */}
      {showTabHeadingsPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTabHeadingsPanel(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Tab Headings</h2>
                <p className="text-xs text-gray-500 mt-0.5">Custom heading shown at top of each tab. Leave blank to use tab label.</p>
              </div>
              <button onClick={() => setShowTabHeadingsPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 -mr-1 -mt-1 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {tabOptions.map(tab => (
                <div key={tab.id} className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{tab.title}</label>
                  <input type="text" value={tabHeadings[tab.id] || ''} onChange={e => setTabHeadings(prev => ({ ...prev, [tab.id]: e.target.value }))} placeholder={`e.g. ${tab.title} for ${categoryInfo?.name || 'Category'}`} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-colors" />
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
              <button onClick={() => setShowTabHeadingsPanel(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSaveTabHeadings} className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors">Save Headings</button>
            </div>
          </div>
        </div>
      )}

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

            <div className="p-6 space-y-8">
              <section className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={seoData.meta_title || ''}
                    onChange={(e) => handleSeoChange('meta_title', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter a compelling meta title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Meta Description
                  </label>
                  <textarea
                    value={seoData.meta_description || ''}
                    onChange={(e) => handleSeoChange('meta_description', e.target.value)}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Explain the page content"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Keywords</label>
                  <input
                    type="text"
                    value={seoData.meta_keywords || ''}
                    onChange={(e) => handleSeoChange('meta_keywords', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
              </section>

              <section className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
                <p className="text-xs uppercase font-semibold text-gray-500 mb-3">Search Preview</p>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">google.com › {categoryInfo?.slug || 'category'}</p>
                    <p className="text-lg text-blue-700 font-semibold leading-tight">{seoData.meta_title || categoryInfo?.name || 'Meta title preview'}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {seoData.meta_description || 'Meta description preview will appear here once you add it.'}
                    </p>
                  </div>
                  {seoData.og_image_url && (
                    <div className="w-full md:w-40 flex-shrink-0">
                      <img src={seoData.og_image_url} alt="OG preview" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                    </div>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Open Graph Title</label>
                    <input
                      type="text"
                      value={seoData.og_title || ''}
                      onChange={(e) => handleSeoChange('og_title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Title for Facebook / LinkedIn"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Open Graph Description</label>
                    <textarea
                      value={seoData.og_description || ''}
                      onChange={(e) => handleSeoChange('og_description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Short description for social sharing"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Open Graph Image URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={seoData.og_image_url || ''}
                        onChange={(e) => handleSeoChange('og_image_url', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/og-image.jpg"
                      />
                      <label className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 cursor-pointer ${uploadingOgImage ? 'opacity-60 pointer-events-none' : ''}`}>
                        {uploadingOgImage ? 'Uploading…' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingOgImage}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            void handleOgImageFile(file);
                          }}
                        />
                      </label>
                    </div>
                    {seoData.og_image_url && (
                      <div className="mt-3 border border-dashed border-gray-300 rounded-lg p-2 bg-white">
                        <img src={seoData.og_image_url} alt="OG preview" className="w-full h-32 object-cover rounded" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Canonical URL</label>
                    <input
                      type="url"
                      value={seoData.canonical_url || ''}
                      onChange={(e) => handleSeoChange('canonical_url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://bharatmock.com/ssc"
                    />
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Robots Meta Tag</label>
                  <select
                    value={seoData.robots_meta || 'index,follow'}
                    onChange={(e) => handleSeoChange('robots_meta', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="index,follow">Index, Follow</option>
                    <option value="noindex,follow">No Index, Follow</option>
                    <option value="index,nofollow">Index, No Follow</option>
                    <option value="noindex,nofollow">No Index, No Follow</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Structured Data Notes</label>
                  <textarea
                    value={(() => {
                      const sd = seoData.structured_data;
                      if (typeof sd === 'object' && sd !== null) {
                        const schemaOnly = stripStructuredDataConfig(sd);
                        return Object.keys(schemaOnly).length ? JSON.stringify(schemaOnly, null, 2) : '';
                      }
                      return (sd as string) || '';
                    })()}
                    onChange={(e) => handleSeoChange('structured_data' as keyof SEOData, e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add reminders for schema markup"
                  />
                </div>
              </section>

              <section className="border border-blue-100 rounded-2xl p-4 bg-blue-50/40">
                <p className="text-xs uppercase font-semibold text-blue-600 mb-3">Page Attribution</p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Author Name</label>
                  <input
                    type="text"
                    value={seoData.author_name || ''}
                    onChange={(e) => handleSeoChange('author_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Bharat Mock Editorial Team"
                  />
                  <p className="mt-1 text-xs text-gray-500">Shown on the public page below the title. Leave blank to hide.</p>
                </div>
                {seoData.updated_at && (
                  <p className="mt-3 text-xs text-gray-500">
                    Last updated: <span className="font-medium text-gray-700">{new Date(seoData.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </p>
                )}
              </section>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowSEOPanel(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSaveSEO} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">Save SEO Settings</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
