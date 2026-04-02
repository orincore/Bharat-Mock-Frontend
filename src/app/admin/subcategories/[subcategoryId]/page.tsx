'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  RefreshCw,
  Settings,
  Loader2,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';
import { BlockEditor } from '@/components/PageEditor/BlockEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { subcategoryAdminService } from '@/lib/api/subcategoryAdminService';

interface Section {
  id: string;
  section_key: string;
  title: string;
  subtitle?: string;
  display_order: number;
  blocks: Block[];
  is_sidebar?: boolean;
  custom_tab_id?: string | null;
  sidebar_tab_id?: string | null;
  settings?: Record<string, any>;
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

interface TabConfig {
  id: string;
  tab_type: 'overview' | 'mock-tests' | 'previous-papers' | 'custom';
  tab_label: string;
  tab_key: string;
  custom_tab_id?: string | null;
  display_order: number;
  is_active: boolean;
}

interface TabOption {
  id: string;
  title: string;
  isSpecial: boolean;
  configId?: string;
  tabType?: TabConfig['tab_type'];
  customTabId?: string | null;
}

interface Block {
  id: string;
  block_type: string;
  content: any;
  settings?: any;
  display_order: number;
  section_id?: string;
}

interface SubcategoryInfo {
  id: string;
  name: string;
  slug: string;
  category_slug?: string;
  description?: string;
  logo_url?: string | null;
  display_order?: number;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
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
  structured_data?: string | Record<string, any>;
  author_name?: string;
  updated_at?: string;
}

export default function AdminSubcategoryEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const subcategoryId = params.subcategoryId as string;
  const envApi = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
    : '';
  const apiBase = envApi || '/api/v1';
  const buildApiUrl = (path: string) => `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') || localStorage.getItem('auth_token');
  };
  const debugLog = (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      //console.log('[AdminSubcategoryEditor]', ...args);
    }
  };

  const [subcategoryInfo, setSubcategoryInfo] = useState<SubcategoryInfo | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const latestSectionsRef = useRef<Section[]>([]);
  latestSectionsRef.current = sections;
  const [originalSections, setOriginalSections] = useState<Section[]>([]);
  const [seoData, setSeoData] = useState<SEOData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSEOPanel, setShowSEOPanel] = useState(false);
  const [showTocPanel, setShowTocPanel] = useState(false);
  const [tocOrder, setTocOrder] = useState<Record<string, number | ''>>({});
  const [tabHeadings, setTabHeadings] = useState<Record<string, string>>({});
  const [showTabHeadingsPanel, setShowTabHeadingsPanel] = useState(false);
  const [tabSeo, setTabSeo] = useState<Record<string, { meta_title?: string; meta_description?: string; meta_keywords?: string }>>({});
  const [showTabSeoPanel, setShowTabSeoPanel] = useState(false);
  const [tabSeoActiveTab, setTabSeoActiveTab] = useState<string>('overview');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [uploadingOgImage, setUploadingOgImage] = useState(false);
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [tabConfig, setTabConfig] = useState<TabConfig[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('overview');
  const [reservedPositions, setReservedPositions] = useState<Record<string, number>>({});
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [tabsCollapsed, setTabsCollapsed] = useState(false);
  const tabConfigInitAttemptedRef = useRef(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    slug: '',
    description: '',
    display_order: '0',
    is_active: true,
  });
  const [descriptionInput, setDescriptionInput] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);

  const loadCustomTabs = async () => {
    try {
      const tabs = await subcategoryAdminService.getCustomTabs(subcategoryId);
      setCustomTabs(tabs);
      setActiveTabId((prev) => (prev === 'overview' || tabs.some((tab) => tab.id === prev) ? prev : 'overview'));
    } catch (error) {
      console.error('Failed to load custom tabs:', error);
    }
  };

  const handleCreateTab = async () => {
    const title = window.prompt('Enter tab title');
    if (!title || !title.trim()) return;
    try {
      await subcategoryAdminService.createCustomTab(subcategoryId, { title: title.trim() });
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
      await subcategoryAdminService.updateCustomTab(subcategoryId, tab.id, { title: title.trim() });
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
      await subcategoryAdminService.deleteCustomTab(subcategoryId, tab.id);
      setSections((prev) => prev.map((section) => section.custom_tab_id === tab.id ? { ...section, custom_tab_id: null } : section));
      setActiveTabId('overview');
      await loadCustomTabs();
    } catch (error) {
      console.error('Failed to delete tab:', error);
      toast({ title: 'Error', description: 'Unable to delete tab', variant: 'destructive' });
    }
  };

  const handleMoveTab = async (tabId: string, direction: 'left' | 'right') => {
    const currentIndex = tabOptions.findIndex((tab) => tab.id === tabId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= tabOptions.length) return;

    if (tabConfig.length > 0) {
      const currentConfigId = tabOptions[currentIndex]?.configId;
      const targetConfigId = tabOptions[targetIndex]?.configId;
      if (!currentConfigId || !targetConfigId) return;

      const orderedConfigIds = tabOptions
        .map((tab) => tab.configId)
        .filter((id): id is string => Boolean(id));

      const currentConfigIndex = orderedConfigIds.indexOf(currentConfigId);
      const targetConfigIndex = orderedConfigIds.indexOf(targetConfigId);
      if (currentConfigIndex === -1 || targetConfigIndex === -1) return;

      const updatedOrder = [...orderedConfigIds];
      const [movedId] = updatedOrder.splice(currentConfigIndex, 1);
      updatedOrder.splice(targetConfigIndex, 0, movedId);

      setTabConfig((prev) => {
        const lookup = new Map(prev.map((config) => [config.id, config]));
        return updatedOrder.map((id) => lookup.get(id)).filter((config): config is TabConfig => Boolean(config));
      });

      try {
        const token = getAuthToken();
        const response = await fetch(buildApiUrl(`/page-content/${subcategoryId}/tab-config/reorder`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ tabConfigIds: updatedOrder })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to reorder tabs');
        }
      } catch (error) {
        console.error('Failed to reorder tab configuration:', error);
        toast({ title: 'Error', description: 'Unable to reorder tabs', variant: 'destructive' });
        await loadPageContent({ skipInit: true });
      }
      return;
    }

    const index = customTabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;
    const newTargetIndex = direction === 'left' ? index - 1 : index + 1;
    if (newTargetIndex < 0 || newTargetIndex >= customTabs.length) return;

    const reordered = [...customTabs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newTargetIndex, 0, moved);
    setCustomTabs(reordered);
    try {
      await subcategoryAdminService.reorderCustomTabs(subcategoryId, reordered.map((tab) => tab.id));
    } catch (error) {
      console.error('Failed to reorder tabs:', error);
    }
  };

  useEffect(() => {
    if (!subcategoryId) return;
    const bootstrap = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadSubcategoryInfo(),
          loadPageContent(),
          loadCustomTabs()
        ]);
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, [subcategoryId]);

  const isSpecialTab = useMemo(() => activeTabId === 'mock-tests' || activeTabId === 'previous-papers', [activeTabId]);

  const updateSectionsForActiveTab = useCallback((updatedSubset: Section[]) => {
    const specialTabId = activeTabId === 'mock-tests' || activeTabId === 'previous-papers' ? activeTabId : null;
    setSections((prev) => {
      const retain: Section[] = [];
      const currentSubset: Section[] = [];

      prev.forEach((section) => {
        // Sidebar sections are never part of the editor subset — always retain them
        if (section.is_sidebar) {
          retain.push(section);
          return;
        }
        const sectionSpecialTab = section.settings?.special_tab_type;
        const belongsToActive = activeTabId === 'overview'
          ? !section.custom_tab_id && !sectionSpecialTab
          : specialTabId
            ? sectionSpecialTab === specialTabId
            : section.custom_tab_id === activeTabId;
        if (belongsToActive) {
          currentSubset.push(section);
        } else {
          retain.push(section);
        }
      });

      const normalizedSubset = updatedSubset.map((section, index) => ({
        ...section,
        custom_tab_id: activeTabId === 'overview' || specialTabId ? null : activeTabId,
        display_order: index,
        blocks: section.blocks || [],
        settings: (() => {
          const nextSettings = { ...(section.settings || {}) };
          if (specialTabId) {
            nextSettings.special_tab_type = specialTabId;
            if (reservedPositions[specialTabId] !== undefined) {
              nextSettings.reserved_position = reservedPositions[specialTabId];
            }
          } else if (nextSettings.special_tab_type) {
            delete nextSettings.special_tab_type;
            delete nextSettings.reserved_position;
          }
          return nextSettings;
        })()
      }));

      if (serializeSections(currentSubset) === serializeSections(normalizedSubset)) {
        return prev;
      }

      return [...retain, ...normalizedSubset];
    });
  }, [activeTabId, reservedPositions]);

  const sectionsForActiveTab = useMemo(() => (
    sections
      .filter((section) => {
        const sectionSpecialTab = section.settings?.special_tab_type;
        if (activeTabId === 'overview') {
          return !section.is_sidebar && !section.custom_tab_id && !sectionSpecialTab;
        }
        if (activeTabId === 'mock-tests' || activeTabId === 'previous-papers') {
          return !section.is_sidebar && sectionSpecialTab === activeTabId;
        }
        return !section.is_sidebar && section.custom_tab_id === activeTabId;
      })
      .sort((a, b) => a.display_order - b.display_order)
  ), [sections, activeTabId]);

  // Sidebar sections relevant to the active tab (shared + tab-specific)
  const sidebarSectionsForActiveTab = useMemo(() => (
    sections.filter((section) => {
      if (!section.is_sidebar) return false;
      if (!section.sidebar_tab_id) return true; // shared across all tabs
      return section.sidebar_tab_id === activeTabId;
    })
  ), [sections, activeTabId]);

  // Stable merged array for BlockEditor — sidebar sections first so they appear at top
  const editorSections = useMemo(
    () => [...sidebarSectionsForActiveTab, ...sectionsForActiveTab],
    [sidebarSectionsForActiveTab, sectionsForActiveTab]
  );

  const tabOptions = useMemo<TabOption[]>(() => {
    if (tabConfig.length > 0) {
      const configuredTabs = tabConfig
        .map((config) => {
          if (config.tab_type === 'overview') {
            return {
              id: 'overview',
              title: config.tab_label || 'Overview',
              isSpecial: false,
              configId: config.id,
              tabType: config.tab_type,
            } as TabOption;
          }
          if (config.tab_type === 'mock-tests' || config.tab_type === 'previous-papers') {
            return {
              id: config.tab_type,
              title: config.tab_label,
              isSpecial: true,
              configId: config.id,
              tabType: config.tab_type,
            } as TabOption;
          }
          if (config.tab_type === 'custom' && config.custom_tab_id) {
            const customTab = customTabs.find((tab) => tab.id === config.custom_tab_id);
            if (!customTab) return null;
            return {
              id: customTab.id,
              title: config.tab_label || customTab.title,
              isSpecial: false,
              configId: config.id,
              tabType: config.tab_type,
              customTabId: customTab.id
            } as TabOption;
          }
          return null;
        })
        .filter((tabOption): tabOption is TabOption => Boolean(tabOption));

      const seenIds = new Set(configuredTabs.map((tab) => tab.id));
      const missingCustomTabs = customTabs
        .filter((tab) => !seenIds.has(tab.id))
        .map((tab) => ({ id: tab.id, title: tab.title, isSpecial: false } satisfies TabOption));

      return [...configuredTabs, ...missingCustomTabs];
    }

    return [
      { id: 'overview', title: 'Overview', isSpecial: false },
      ...customTabs.map((tab) => ({ id: tab.id, title: tab.title, isSpecial: false })),
      { id: 'mock-tests', title: 'Mock Tests', isSpecial: true },
      { id: 'previous-papers', title: 'Previous Papers', isSpecial: true }
    ];
  }, [tabConfig, customTabs]);

  const canMoveTabDirection = useCallback((tabId: string, direction: 'left' | 'right') => {
    const index = tabOptions.findIndex((tab) => tab.id === tabId);
    if (index === -1) return false;
    if (direction === 'left') {
      return index - 1 >= 0 && tabOptions[index - 1]?.id !== 'overview';
    }
    return index + 1 < tabOptions.length;
  }, [tabOptions]);

  const mediaUploadConfig = useMemo(() => ({
    maxSizeMB: 150,
    onUpload: async (file: File, context: { blockType: 'image' | 'video' }) => {
      const folder = context.blockType === 'image' ? 'blocks/images' : 'blocks/videos';
      const response = await subcategoryAdminService.uploadPageMedia(subcategoryId, file, {
        folder: `${folder}/${activeTabId}`
      });
      return {
        url: response.file_url,
        alt: response.file_name,
        caption: response.caption || undefined
      };
    },
    onUploadError: (message: string) => {
      toast({
        title: 'Upload failed',
        description: message,
        variant: 'destructive'
      });
    },
    onUploadSuccess: (message?: string) => {
      toast({
        title: message || 'Upload complete',
        description: 'File is ready to use inside the block editor.'
      });
    }
  }), [subcategoryId, activeTabId, toast]);

  const loadSubcategoryInfo = async () => {
    try {
      const token = getAuthToken();
      const endpoint = buildApiUrl(`/taxonomy/subcategory-id/${subcategoryId}`);
      debugLog('Fetching subcategory info', endpoint);
      const response = await fetch(endpoint, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subcategory info');
      }
      
      const raw = await response.json();
      const payload = raw?.data ?? raw;
      const normalized = {
        ...payload,
        category_slug: payload.category_slug || payload.category?.slug || subcategoryInfo?.category_slug || null
      } as SubcategoryInfo;

      setSubcategoryInfo(normalized);
      syncSettingsForm(normalized);
      return normalized;
    } catch (error) {
      console.error('Error loading subcategory info:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subcategory information',
        variant: 'destructive'
      });
      return null;
    }
  };

  const syncSettingsForm = (info: SubcategoryInfo) => {
    setSettingsForm({
      name: info.name || '',
      slug: info.slug || '',
      description: info.description || '',
      display_order: (info.display_order ?? 0).toString(),
      is_active: info.is_active ?? true,
    });
    setLogoPreview(info.logo_url || '');
    setLogoFile(null);
    setDescriptionInput(info.description || '');
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setLogoFile(null);
      setLogoPreview(subcategoryInfo?.logo_url || '');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const resetDescriptionInput = () => {
    setDescriptionInput(subcategoryInfo?.description || '');
  };

  const handleSaveDescription = async () => {
    if (!subcategoryInfo) return;
    if (savingDescription) return;
    try {
      setSavingDescription(true);
      await subcategoryAdminService.updateSubcategory(subcategoryId, {
        name: subcategoryInfo.name,
        slug: subcategoryInfo.slug || undefined,
        description: descriptionInput,
        display_order: (subcategoryInfo.display_order ?? 0).toString(),
        is_active: subcategoryInfo.is_active ?? true,
      });
      toast({ title: 'Saved', description: 'Description updated successfully.' });
      await loadSubcategoryInfo();
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Could not save description',
        variant: 'destructive'
      });
    } finally {
      setSavingDescription(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsForm.name.trim()) {
      toast({ title: 'Error', description: 'Subcategory name is required', variant: 'destructive' });
      return;
    }
    try {
      setSavingSettings(true);
      await subcategoryAdminService.updateSubcategory(subcategoryId, {
        name: settingsForm.name.trim(),
        slug: settingsForm.slug.trim() || undefined,
        description: settingsForm.description,
        display_order: settingsForm.display_order || '0',
        is_active: settingsForm.is_active,
        logo: logoFile || undefined,
      });
      toast({ title: 'Success', description: 'Subcategory settings saved successfully' });
      await loadSubcategoryInfo();
      setShowSettingsPanel(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const loadPageContent = async ({ skipInit = false }: { skipInit?: boolean } = {}) => {
    if (!subcategoryId) return;

    try {
      const token = getAuthToken();
      const endpoint = buildApiUrl(`/page-content/${subcategoryId}`);
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
      const nextTabConfig = data.tabConfig || [];
      setSections(nextSections);
      setOriginalSections(nextSections);
      setSeoData(data.seo || {});
      setCustomTabs(nextTabs);
      setTabConfig(nextTabConfig);
      setTocOrder(data.tocOrder || {});
      setTabHeadings(data.tabHeadings || {});
      setTabSeo(data.tabSeo || {});

      const positions: Record<string, number> = {};
      (data.sections || []).forEach((section: Section) => {
        const specialTab = section.settings?.special_tab_type;
        if (specialTab && section.settings?.reserved_position !== undefined) {
          positions[specialTab] = section.settings.reserved_position;
        }
      });
      setReservedPositions(positions);

      const validTabIds = new Set<string>([
        'overview',
        'mock-tests',
        'previous-papers',
        ...nextTabs.map((tab: CustomTab) => tab.id)
      ]);
      setActiveTabId((prev) => (validTabIds.has(prev) ? prev : 'overview'));

      if (!skipInit && nextTabConfig.length === 0 && !tabConfigInitAttemptedRef.current) {
        tabConfigInitAttemptedRef.current = true;
        try {
          const token = getAuthToken();
          const initResponse = await fetch(buildApiUrl(`/page-content/${subcategoryId}/tab-config/initialize`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          });
          const initData = await initResponse.json();
          if (initResponse.ok && initData.success) {
            await loadPageContent({ skipInit: true });
          }
        } catch (initError) {
          console.error('Failed to initialize tab configuration:', initError);
        }
      }
    } catch (error) {
      console.error('Error loading page content:', error);
      toast({
        title: 'Error',
        description: 'Failed to load page content',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async (sectionsFromClosure: Section[]) => {
    // Wait briefly to allow any pending onBlur events (from content-editable elements) 
    // to propagate their state updates to the parent component before saving.
    await new Promise(resolve => setTimeout(resolve, 200));
    const updatedSections = latestSectionsRef.current;

    try {
      setSaving(true);
      const token = getAuthToken();
      
      if (!token) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in to save changes',
          variant: 'destructive'
        });
        return;
      }

      const currentIds = new Set(updatedSections.map((section) => section.id).filter(Boolean));
      const originalIds = new Set(originalSections.map((section) => section.id).filter(Boolean));
      const deletedSectionIds = Array.from(originalIds).filter((id) => !currentIds.has(id));

      const syncPayload = {
        sections: updatedSections.map((section) => ({
          ...section,
          blocks: (section.blocks || []).map((block, idx) => ({
            ...block,
            display_order: block.display_order ?? idx
          })),
          display_order: section.display_order ?? 0,
          is_sidebar: section.is_sidebar ?? false,
          sidebar_tab_id: section.sidebar_tab_id ?? null
        })),
        deletedSectionIds
      };

      const endpoint = buildApiUrl(`/page-content/${subcategoryId}/sections/sync`);
      debugLog('Syncing sections', { endpoint, payloadSize: syncPayload.sections.length, deleted: deletedSectionIds.length });
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(syncPayload)
      });

      if (!response.ok) {
        throw new Error('Section sync failed');
      }

      // Create revision asynchronously (don't wait for it)
      const revisionEndpoint = buildApiUrl(`/page-content/${subcategoryId}/revisions`);
      fetch(revisionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          change_summary: 'Content updated via block editor'
        })
      }).catch(err => console.warn('Failed to create revision:', err));

      toast({
        title: 'Success',
        description: 'Page content saved successfully'
      });



      await loadPageContent();
      setOriginalSections(updatedSections);
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
        toast({
          title: 'Authentication Error',
          description: 'Please log in to upload images',
          variant: 'destructive'
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `seo/${subcategoryId}`);

      const uploadResponse = await fetch(
        buildApiUrl(`/page-content/${subcategoryId}/media`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      if (!uploadData?.file_url) {
        throw new Error('Upload did not return a URL');
      }

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

  const handleSaveSEO = async () => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in to save SEO settings',
          variant: 'destructive'
        });
        return;
      }

      const response = await fetch(
        buildApiUrl(`/page-content/${subcategoryId}/seo`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(seoData)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save SEO settings');
      }

      toast({
        title: 'Success',
        description: 'SEO settings saved successfully'
      });
      
      setShowSEOPanel(false);
    } catch (error) {
      console.error('Error saving SEO:', error);
      toast({
        title: 'Error',
        description: 'Failed to save SEO settings',
        variant: 'destructive'
      });
    }
  };

  const handleSaveTocOrder = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast({ title: 'Authentication Error', description: 'Please log in', variant: 'destructive' });
        return;
      }
      const cleanOrder: Record<string, number> = {};
      Object.entries(tocOrder).forEach(([tab, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          cleanOrder[tab] = Number(val);
        }
      });
      const existingStructuredToc = typeof seoData.structured_data === 'string'
        ? (() => { try { return JSON.parse(seoData.structured_data); } catch { return {}; } })()
        : (seoData.structured_data || {});
      const response = await fetch(buildApiUrl(`/page-content/${subcategoryId}/seo`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...seoData,
          structured_data: { ...existingStructuredToc, toc_order: cleanOrder }
        })
      });
      if (!response.ok) throw new Error('Failed to save TOC order');
      setSeoData((prev) => ({
        ...prev,
        structured_data: { ...existingStructuredToc, toc_order: cleanOrder }
      }));
      toast({ title: 'Success', description: 'TOC positions saved' });
      setShowTocPanel(false);
    } catch (error) {
      console.error('Error saving TOC order:', error);
      toast({ title: 'Error', description: 'Failed to save TOC positions', variant: 'destructive' });
    }
  };

  const handleSaveTabHeadings = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast({ title: 'Authentication Error', description: 'Please log in', variant: 'destructive' });
        return;
      }
      const cleanHeadings: Record<string, string> = {};
      Object.entries(tabHeadings).forEach(([tab, val]) => {
        if (val && val.trim()) cleanHeadings[tab] = val.trim();
      });
      const existingStructured = typeof seoData.structured_data === 'string'
        ? (() => { try { return JSON.parse(seoData.structured_data); } catch { return {}; } })()
        : (seoData.structured_data || {});
      const response = await fetch(buildApiUrl(`/page-content/${subcategoryId}/seo`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...seoData,
          structured_data: { ...existingStructured, tab_headings: cleanHeadings }
        })
      });
      if (!response.ok) throw new Error('Failed to save tab headings');
      setSeoData((prev) => ({
        ...prev,
        structured_data: { ...existingStructured, tab_headings: cleanHeadings }
      }));
      toast({ title: 'Success', description: 'Tab headings saved' });
      setShowTabHeadingsPanel(false);
    } catch (error) {
      console.error('Error saving tab headings:', error);
      toast({ title: 'Error', description: 'Failed to save tab headings', variant: 'destructive' });
    }
  };

  const handleSaveTabSeo = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast({ title: 'Authentication Error', description: 'Please log in', variant: 'destructive' });
        return;
      }
      const cleanTabSeo: Record<string, { meta_title?: string; meta_description?: string; meta_keywords?: string }> = {};
      Object.entries(tabSeo).forEach(([tab, vals]) => {
        const t = vals.meta_title?.trim();
        const d = vals.meta_description?.trim();
        const k = vals.meta_keywords?.trim();
        if (t || d || k) {
          cleanTabSeo[tab] = {};
          if (t) cleanTabSeo[tab].meta_title = t;
          if (d) cleanTabSeo[tab].meta_description = d;
          if (k) cleanTabSeo[tab].meta_keywords = k;
        }
      });
      const existingStructured = typeof seoData.structured_data === 'string'
        ? (() => { try { return JSON.parse(seoData.structured_data); } catch { return {}; } })()
        : (seoData.structured_data || {});
      const response = await fetch(buildApiUrl(`/page-content/${subcategoryId}/seo`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...seoData,
          structured_data: { ...existingStructured, tab_seo: cleanTabSeo }
        })
      });
      if (!response.ok) throw new Error('Failed to save tab SEO');
      setSeoData((prev) => ({
        ...prev,
        structured_data: { ...existingStructured, tab_seo: cleanTabSeo }
      }));
      setTabSeo(cleanTabSeo);
      toast({ title: 'Success', description: 'Tab SEO saved' });
      setShowTabSeoPanel(false);
    } catch (error) {
      console.error('Error saving tab SEO:', error);
      toast({ title: 'Error', description: 'Failed to save tab SEO', variant: 'destructive' });
    }
  };

  const handlePreview = async () => {
    let subcategorySlug = subcategoryInfo?.slug;

    if (!subcategorySlug) {
      const refreshed = await loadSubcategoryInfo();
      if (refreshed) {
        subcategorySlug = refreshed.slug;
      }
    }

    if (subcategorySlug) {
      window.open(`/${subcategorySlug}`, '_blank');
      return;
    }

    toast({
      title: 'Preview Unavailable',
      description: 'Cannot generate preview URL',
      variant: 'destructive'
    });
  };

  const handleRefresh = () => {
    if (!subcategoryId) return;
    const refresh = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadSubcategoryInfo(),
          loadPageContent(),
          loadCustomTabs()
        ]);
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
    <div className="min-h-screen bg-gray-50">
      {/* Collapsed mini-bar */}
      {headerCollapsed && (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 md:px-6 flex items-center gap-3 h-10">
          <Link href="/admin" className="text-gray-400 hover:text-gray-700 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold text-gray-800 truncate flex-1">
            {subcategoryInfo?.name || 'Editor'}
            <span className="ml-2 text-xs font-normal text-gray-400">
              — {tabOptions.find((t) => t.id === activeTabId)?.title || 'Overview'}
            </span>
          </span>
          <Button
            size="sm"
            onClick={() => handleSave(sections)}
            disabled={saving}
            className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 flex-shrink-0"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </Button>
          <button
            onClick={() => setHeaderCollapsed(false)}
            className="flex-shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
            title="Expand"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Full header + tabs (hidden when collapsed) */}
      {!headerCollapsed && (
        <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6">
          {/* Row 1: identity */}
          <div className="flex items-center gap-3 py-3 border-b border-gray-100">
            <Link href="/admin" className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="" className="w-full h-full object-contain p-0.5" />
              ) : subcategoryInfo?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={subcategoryInfo.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
              ) : (
                <ImageIcon className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Breadcrumbs
                items={[
                  AdminBreadcrumb(),
                  { label: 'Subcategories', href: '/admin' },
                  { label: subcategoryInfo?.name || 'Loading...' }
                ]}
                className="mb-0.5"
              />
              <h1 className="text-base font-bold text-gray-900 leading-tight truncate">
                {subcategoryInfo?.name || 'Loading...'}
                {subcategoryInfo?.category?.name && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {subcategoryInfo.category.name} / {subcategoryInfo.slug}
                  </span>
                )}
              </h1>
            </div>
            <button
              onClick={() => setHeaderCollapsed(true)}
              className="ml-auto flex-shrink-0 p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              title="Collapse — maximize editor area"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: actions */}
          <div className="flex items-center gap-1 py-2">
            {/* Left group */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 h-8 w-8 p-0" title="Back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-px h-5 bg-gray-200" />
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="h-8 w-8 p-0" title="Refresh">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => { if (subcategoryInfo) syncSettingsForm(subcategoryInfo); setShowSettingsPanel(true); }}
                className="h-8 px-2.5 text-xs gap-1"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </div>

            <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" />

            {/* SEO group */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowSEOPanel(true)} className="h-8 px-2.5 text-xs">
                SEO
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setShowTabHeadingsPanel(true)}
                className="h-8 px-2.5 text-xs border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 whitespace-nowrap"
              >
                Tab Headings
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => { setTabSeoActiveTab('overview'); setShowTabSeoPanel(true); }}
                className="h-8 px-2.5 text-xs border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 whitespace-nowrap"
              >
                Tab SEO
              </Button>
            </div>

            {/* Right group — pushed to end */}
            <div className="flex items-center gap-1 ml-auto flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handlePreview} className="h-8 px-2.5 text-xs gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave(sections)}
                disabled={saving}
                className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 whitespace-nowrap"
              >
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="hidden sm:inline">Saving...</span></>
                ) : (
                  <><Save className="w-3.5 h-3.5" /><span>Save Changes</span></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Manager */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {!tabsCollapsed && <span className="text-sm font-semibold text-gray-700">Page Tabs</span>}
              {!tabsCollapsed && <div className="flex flex-wrap gap-2">
                {tabOptions.map((tab) => {
                  const isActive = activeTabId === tab.id;
                  const isSpecial = tab.isSpecial || false;
                  const linkedCustomTab = !isSpecial ? customTabs.find((customTab) => customTab.id === tab.id) : null;
                  return (
                    <div key={tab.id} className={`flex items-center gap-2 rounded-full border px-3 py-1 ${isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'}`}>
                      <button onClick={() => setActiveTabId(tab.id)} className="font-semibold text-sm">
                        {tab.title}
                      </button>
                      {isSpecial && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          Reserved
                        </span>
                      )}
                      {tab.id !== 'overview' && (
                        <div className="flex items-center gap-1 text-xs">
                          <button onClick={() => handleMoveTab(tab.id, 'left')} className={`px-1 ${canMoveTabDirection(tab.id, 'left') ? 'text-gray-500 hover:text-gray-800' : 'text-gray-300 cursor-not-allowed'}`} disabled={!canMoveTabDirection(tab.id, 'left')}>◀</button>
                          <button onClick={() => handleMoveTab(tab.id, 'right')} className={`px-1 ${canMoveTabDirection(tab.id, 'right') ? 'text-gray-500 hover:text-gray-800' : 'text-gray-300 cursor-not-allowed'}`} disabled={!canMoveTabDirection(tab.id, 'right')}>▶</button>
                          {!isSpecial && linkedCustomTab && (
                            <>
                              <button onClick={() => handleRenameTab(linkedCustomTab)} className="px-1 text-gray-500 hover:text-gray-800">Edit</button>
                              <button onClick={() => handleDeleteTab(linkedCustomTab)} className="px-1 text-red-500 hover:text-red-700">Delete</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>}
              {tabsCollapsed && (
                <span className="text-sm text-gray-500">
                  Tab: <span className="font-semibold text-gray-800">{tabOptions.find((t) => t.id === activeTabId)?.title || 'Overview'}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {!tabsCollapsed && <Button size="sm" onClick={handleCreateTab} variant="secondary" className="h-7 text-xs px-2.5">+ Add Tab</Button>}
              <button
                onClick={() => setTabsCollapsed((v) => !v)}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                title={tabsCollapsed ? 'Show tabs' : 'Hide tabs'}
              >
                {tabsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Block Editor */}
      <BlockEditor
        key={activeTabId}
        sections={editorSections}
        onSave={() => handleSave(sections)}
        onSectionsChange={(next) => {
          // Split back into sidebar and main sections
          const nextSidebar = (next as Section[]).filter(s => s.is_sidebar);
          const nextMain = (next as Section[]).filter(s => !s.is_sidebar);
          // Update sidebar sections directly in state
          if (nextSidebar.length > 0 || sidebarSectionsForActiveTab.length > 0) {
            setSections(prev => {
              const otherSections = prev.filter(s =>
                !sidebarSectionsForActiveTab.some(sb => sb.id === s.id)
              );
              return [...otherSections, ...nextSidebar];
            });
          }
          updateSectionsForActiveTab(nextMain);
        }}
        tabLabel={tabOptions.find((tab) => tab.id === activeTabId)?.title}
        mediaUploadConfig={mediaUploadConfig}
        onTocOrderClick={() => setShowTocPanel(true)}
        reservedTabInfo={activeTabId === 'mock-tests' || activeTabId === 'previous-papers' ? {
          tabType: activeTabId,
          message: activeTabId === 'mock-tests'
            ? 'This area is reserved for displaying mock tests automatically. You can add custom sections above or below this reserved area.'
            : 'This area is reserved for displaying previous year question papers automatically. You can add custom sections above or below this reserved area.',
          position: reservedPositions[activeTabId] ?? 0
        } : undefined}
        onReservedPositionChange={(position) => {
          if (activeTabId === 'mock-tests' || activeTabId === 'previous-papers') {
            setReservedPositions(prev => ({ ...prev, [activeTabId]: position }));
          }
        }}
        availableTabs={tabOptions.map((tab) => ({ id: tab.id, label: tab.title }))}
      />

      {/* TOC Order Panel */}
      {showTocPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">TOC Mobile Position</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Set the CSS <code className="bg-gray-100 px-1 rounded">order</code> of the Table of Contents on mobile per tab. Lower = appears earlier. Default is 0 (top).
                </p>
              </div>
              <button onClick={() => setShowTocPanel(false)} className="text-gray-500 hover:text-gray-700 ml-4 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { id: 'overview', title: 'Overview' },
                { id: 'mock-tests', title: 'Mock Tests' },
                { id: 'previous-papers', title: 'Previous Papers' },
                ...customTabs.map((tab) => ({ id: tab.id, title: tab.title }))
              ].map((tab) => (
                <div key={tab.id} className="flex items-center justify-between gap-4">
                  <label className="text-sm font-medium text-gray-700 flex-1">{tab.title}</label>
                  <input
                    type="number"
                    min={0}
                    value={tocOrder[tab.id] ?? ''}
                    onChange={(e) => setTocOrder((prev) => ({
                      ...prev,
                      [tab.id]: e.target.value === '' ? '' : parseInt(e.target.value, 10)
                    }))}
                    placeholder="0"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setShowTocPanel(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleSaveTocOrder} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Save Positions</button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Headings Panel */}
      {showTabHeadingsPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold">Tab Headings</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Set a custom heading shown at the top of each tab's content. Leave blank to use the tab label.
                </p>
              </div>
              <button onClick={() => setShowTabHeadingsPanel(false)} className="text-gray-500 hover:text-gray-700 ml-4 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {[
                { id: 'overview', title: 'Overview' },
                { id: 'mock-tests', title: 'Mock Tests' },
                { id: 'previous-papers', title: 'Previous Papers' },
                ...customTabs.map((tab) => ({ id: tab.id, title: tab.title }))
              ].map((tab) => (
                <div key={tab.id} className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{tab.title}</label>
                  <input
                    type="text"
                    value={tabHeadings[tab.id] || ''}
                    onChange={(e) => setTabHeadings((prev) => ({ ...prev, [tab.id]: e.target.value }))}
                    placeholder={`e.g. ${tab.title} for SSC CGL`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
              <button onClick={() => setShowTabHeadingsPanel(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleSaveTabHeadings} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">Save Headings</button>
            </div>
          </div>
        </div>
      )}

      {/* Tab SEO Panel */}
      {showTabSeoPanel && (() => {
        const allTabs = [
          { id: 'overview', title: 'Overview' },
          { id: 'mock-tests', title: 'Mock Tests' },
          { id: 'previous-papers', title: 'Previous Papers' },
          ...customTabs.map((tab) => ({ id: tab.id, title: tab.title }))
        ];
        const activeTabSeo = tabSeo[tabSeoActiveTab] || {};
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Tab SEO</h2>
                  <p className="text-sm text-gray-500 mt-1">Set per-tab meta title, description and keywords. Overrides global SEO for that tab.</p>
                </div>
                <button onClick={() => setShowTabSeoPanel(false)} className="text-gray-500 hover:text-gray-700 ml-4 text-xl">✕</button>
              </div>

              {/* Tab selector */}
              <div className="px-6 pt-4 flex flex-wrap gap-2 flex-shrink-0">
                {allTabs.map((tab) => {
                  const hasSeo = tabSeo[tab.id]?.meta_title || tabSeo[tab.id]?.meta_description;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setTabSeoActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        tabSeoActiveTab === tab.id
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'border-gray-300 text-gray-600 hover:border-teal-400 hover:text-teal-700'
                      }`}
                    >
                      {tab.title}
                      {hasSeo && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-teal-400 align-middle" />}
                    </button>
                  );
                })}
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                    <span>Meta Title</span>
                    <span className={`text-xs ${(activeTabSeo.meta_title?.length || 0) > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                      {activeTabSeo.meta_title?.length || 0}/60
                    </span>
                  </label>
                  <input
                    type="text"
                    value={activeTabSeo.meta_title || ''}
                    onChange={(e) => setTabSeo((prev) => ({
                      ...prev,
                      [tabSeoActiveTab]: { ...prev[tabSeoActiveTab], meta_title: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g. SSC CGL Mock Tests 2025 | Bharat Mock"
                    maxLength={70}
                  />
                  <p className="mt-1 text-xs text-gray-400">Leave blank to use the global meta title.</p>
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                    <span>Meta Description</span>
                    <span className={`text-xs ${(activeTabSeo.meta_description?.length || 0) > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                      {activeTabSeo.meta_description?.length || 0}/160
                    </span>
                  </label>
                  <textarea
                    value={activeTabSeo.meta_description || ''}
                    onChange={(e) => setTabSeo((prev) => ({
                      ...prev,
                      [tabSeoActiveTab]: { ...prev[tabSeoActiveTab], meta_description: e.target.value }
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g. Attempt free SSC CGL mock tests with detailed analytics..."
                    maxLength={200}
                  />
                  <p className="mt-1 text-xs text-gray-400">Leave blank to use the global meta description.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
                  <input
                    type="text"
                    value={activeTabSeo.meta_keywords || ''}
                    onChange={(e) => setTabSeo((prev) => ({
                      ...prev,
                      [tabSeoActiveTab]: { ...prev[tabSeoActiveTab], meta_keywords: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>

                {/* Preview */}
                {(activeTabSeo.meta_title || activeTabSeo.meta_description) && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase font-semibold text-gray-400 mb-2">Search Preview</p>
                    <p className="text-xs text-gray-400">google.com › {subcategoryInfo?.slug || 'page'}</p>
                    <p className="text-base text-blue-700 font-semibold leading-tight mt-0.5">
                      {activeTabSeo.meta_title || seoData.meta_title || subcategoryInfo?.name || 'Title'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {activeTabSeo.meta_description || seoData.meta_description || 'Description preview'}
                    </p>
                  </div>
                )}

                {(activeTabSeo.meta_title || activeTabSeo.meta_description || activeTabSeo.meta_keywords) && (
                  <button
                    onClick={() => setTabSeo((prev) => {
                      const next = { ...prev };
                      delete next[tabSeoActiveTab];
                      return next;
                    })}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Clear SEO for this tab
                  </button>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
                <button onClick={() => setShowTabSeoPanel(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
                <button onClick={handleSaveTabSeo} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">Save Tab SEO</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SEO Settings Panel */}
      {showSEOPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">SEO Settings</h2>
                <p className="text-sm text-gray-500">Optimize metadata for Google Search and social platforms.</p>
              </div>
              <button
                onClick={() => setShowSEOPanel(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-8">
              <section className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                      <span>Meta Title</span>
                      <span className={`text-xs ${seoData.meta_title && seoData.meta_title.length > 60 ? 'text-red-500' : 'text-gray-500'}`}>
                        {seoData.meta_title?.length || 0}/60
                      </span>
                    </label>
                    <input
                      type="text"
                      value={seoData.meta_title || ''}
                      onChange={(e) => handleSeoChange('meta_title', e.target.value)}
                      className={`mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        seoData.meta_title && seoData.meta_title.length > 60 ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter a compelling title (50-60 characters)"
                      maxLength={70}
                    />
                    <p className="mt-1 text-xs text-gray-500">Adds the HTML &lt;title&gt; tag and Google headline.</p>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                      <span>Meta Description</span>
                      <span className={`text-xs ${seoData.meta_description && seoData.meta_description.length > 160 ? 'text-red-500' : 'text-gray-500'}`}>
                        {seoData.meta_description?.length || 0}/160
                      </span>
                    </label>
                    <textarea
                      value={seoData.meta_description || ''}
                      onChange={(e) => handleSeoChange('meta_description', e.target.value)}
                      rows={3}
                      className={`mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        seoData.meta_description && seoData.meta_description.length > 160 ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Explain the page in 150-160 characters"
                      maxLength={200}
                    />
                    <p className="mt-1 text-xs text-gray-500">Displayed beneath the title in search results.</p>
                  </div>
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
                    <p className="text-xs text-gray-500">google.com › {subcategoryInfo?.slug || 'subcategory'}</p>
                    <p className="text-lg text-blue-700 font-semibold leading-tight">{seoData.meta_title || subcategoryInfo?.name || 'Meta title preview'}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {seoData.meta_description || 'Meta description preview will appear here once you add it.'}
                    </p>
                  </div>
                  {seoData.og_image_url && (
                    <div className="w-full md:w-40 flex-shrink-0">
                      <img
                        src={seoData.og_image_url}
                        alt="OG preview"
                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <p className="mt-1 text-[11px] text-gray-500 text-center">Social thumbnail</p>
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
                      placeholder="https://bharatmock.com/ssc/cgl"
                    />
                    <p className="mt-1 text-xs text-gray-500">Helps avoid duplicate-content penalties.</p>
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
                    value={typeof seoData.structured_data === 'string' ? seoData.structured_data : ''}
                    onChange={(e) => handleSeoChange('structured_data' as keyof SEOData, e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add reminders for schema markup (e.g., FAQ, Breadcrumbs)"
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

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-2 sticky bottom-0 bg-white">
              <Button
                variant="outline"
                onClick={() => setShowSEOPanel(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSEO}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save SEO Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory Settings Panel */}
      {showSettingsPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Subcategory Settings</h2>
                <p className="text-sm text-gray-500">Update name, slug, logo, display order, and status.</p>
              </div>
              <button
                onClick={() => setShowSettingsPanel(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., CGL, CHSL"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={settingsForm.slug}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Auto-generated from name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={settingsForm.display_order}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, display_order: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Lower number = shown first on homepage &quot;Choose your exam&quot;</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={settingsForm.is_active ? 'true' : 'false'}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, is_active: e.target.value === 'true' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Short description for the subcategory"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory Logo</label>
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 flex-shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Subcategory logo" className="w-full h-full object-contain p-2 rounded-lg" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500">Recommended: Square image (PNG/SVG). This logo will appear on the homepage &quot;Choose your exam&quot; cards.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-2 sticky bottom-0 bg-white">
              <Button
                variant="outline"
                onClick={() => setShowSettingsPanel(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
