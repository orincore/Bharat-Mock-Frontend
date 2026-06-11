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
  Search,
  ListOrdered,
  Type,
  Code2,
  ExternalLink,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  CheckCircle2
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
  show_mock_tests_tab?: boolean;
  show_previous_papers_tab?: boolean;
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
  const [tabSeo, setTabSeo] = useState<Record<string, { meta_title?: string; meta_description?: string; meta_keywords?: string; canonical_url?: string; robots_meta?: string; structured_data?: string }>>({}); 
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
    show_mock_tests_tab: true,
    show_previous_papers_tab: true,
  });
  const [descriptionInput, setDescriptionInput] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);

  const loadCustomTabs = async () => {
    try {
      const tabs = await subcategoryAdminService.getCustomTabs(subcategoryId);
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

      // Mock Tests / Previous Papers are built-in reserved tabs that must always be
      // available for adding content, even when the saved tab config doesn't include
      // a row for them (otherwise they silently disappear from the Page Tabs list).
      const reservedTabs: TabOption[] = [
        { id: 'mock-tests', title: 'Mock Tests', isSpecial: true },
        { id: 'previous-papers', title: 'Previous Papers', isSpecial: true },
      ];
      const missingReservedTabs = reservedTabs.filter((tab) => !seenIds.has(tab.id));

      return [...configuredTabs, ...missingCustomTabs, ...missingReservedTabs];
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
      const endpoint = buildApiUrl(`/taxonomy/subcategory-id/${subcategoryId}?_t=${Date.now()}`);
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
      show_mock_tests_tab: info.show_mock_tests_tab ?? true,
      show_previous_papers_tab: info.show_previous_papers_tab ?? true,
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
        show_mock_tests_tab: settingsForm.show_mock_tests_tab,
        show_previous_papers_tab: settingsForm.show_previous_papers_tab,
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
      const separator = subcategoryId.includes('?') ? '&' : '?';
      const endpoint = buildApiUrl(`/page-content/${subcategoryId}${separator}_t=${Date.now()}`);
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

      // Renumber each section's blocks by their on-screen array position so the public
      // page (which orders blocks by display_order) renders them in the exact same
      // sequence shown in the editor. Deleting then adding blocks could otherwise leave
      // duplicate display_order values, making the public block order non-deterministic.
      // Section display_order is left untouched — it's maintained per-tab by moveSection.
      const syncPayload = {
        sections: updatedSections.map((section) => ({
          ...section,
          blocks: (section.blocks || []).map((block, blockIndex) => ({
            ...block,
            display_order: blockIndex
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

      const response = await fetch(
        buildApiUrl(`/page-content/${subcategoryId}/seo`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...seoData,
            structured_data: parsedStructuredData
          })
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
      const cleanTabSeo: Record<string, { meta_title?: string; meta_description?: string; meta_keywords?: string; canonical_url?: string; robots_meta?: string; structured_data?: string }> = {};
      Object.entries(tabSeo).forEach(([tab, vals]) => {
        const t = vals.meta_title?.trim();
        const d = vals.meta_description?.trim();
        const k = vals.meta_keywords?.trim();
        const c = vals.canonical_url?.trim();
        const r = vals.robots_meta?.trim();
        const s = vals.structured_data?.trim();
        if (t || d || k || c || r || s) {
          cleanTabSeo[tab] = {};
          if (t) cleanTabSeo[tab].meta_title = t;
          if (d) cleanTabSeo[tab].meta_description = d;
          if (k) cleanTabSeo[tab].meta_keywords = k;
          if (c) cleanTabSeo[tab].canonical_url = c;
          if (r) cleanTabSeo[tab].robots_meta = r;
          if (s) cleanTabSeo[tab].structured_data = s;
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


  const hasUnsavedChanges = serializeSections(sections) !== serializeSections(originalSections);

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex overflow-hidden">

      {/* ══ MAIN EDITOR COLUMN ═════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ marginRight: '264px' }}>

        {/* Slim top bar */}
        <div className="bg-white border-b border-gray-200 h-11 flex items-center px-4 gap-3 sticky top-0 z-10 shadow-sm">
          <Link href="/admin" className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="w-7 h-7 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {(logoPreview || subcategoryInfo?.logo_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview || subcategoryInfo?.logo_url || ''} alt="" className="w-full h-full object-contain p-0.5" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 truncate leading-none">
              {subcategoryInfo?.name || 'Loading…'}
              {subcategoryInfo?.category?.name && (
                <span className="ml-1.5 text-xs font-normal text-gray-400">· {subcategoryInfo.category.name}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasUnsavedChanges && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved
              </span>
            )}
            <span className="text-[11px] text-gray-500 border border-gray-200 rounded-full px-2.5 py-0.5 bg-gray-50 whitespace-nowrap">
              {tabOptions.find(t => t.id === activeTabId)?.title || 'Overview'}
            </span>
          </div>
        </div>

        {/* Block editor — full remaining height */}
        <BlockEditor
          key={activeTabId}
          sections={editorSections}
          onSave={() => handleSave(sections)}
          onSectionsChange={(next) => {
            const nextSidebar = (next as Section[]).filter(s => s.is_sidebar);
            const nextMain    = (next as Section[]).filter(s => !s.is_sidebar);
            if (nextSidebar.length > 0 || sidebarSectionsForActiveTab.length > 0) {
              setSections(prev => {
                const others = prev.filter(s => !sidebarSectionsForActiveTab.some(sb => sb.id === s.id));
                return [...others, ...nextSidebar];
              });
            }
            updateSectionsForActiveTab(nextMain);
          }}
          tabLabel={tabOptions.find(t => t.id === activeTabId)?.title}
          mediaUploadConfig={mediaUploadConfig}
          onTocOrderClick={() => setShowTocPanel(true)}
          reservedTabInfo={
            activeTabId === 'mock-tests' || activeTabId === 'previous-papers' ? {
              tabType: activeTabId,
              message: activeTabId === 'mock-tests'
                ? 'This area is reserved for displaying mock tests automatically.'
                : 'This area is reserved for displaying previous year papers automatically.',
              position: reservedPositions[activeTabId] ?? 0
            } : undefined
          }
          onReservedPositionChange={(position) => {
            if (activeTabId === 'mock-tests' || activeTabId === 'previous-papers') {
              setReservedPositions(prev => ({ ...prev, [activeTabId]: position }));
            }
          }}
          availableTabs={tabOptions.map(t => ({ id: t.id, label: t.title }))}
        />
      </div>

      {/* ══ RIGHT SIDEBAR — fixed full height ══════════════════ */}
      <aside className="fixed right-0 top-0 bottom-0 bg-white border-l border-gray-200 flex flex-col z-[110] overflow-hidden shadow-xl" style={{ width: '264px' }}>

        {/* Identity */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {(logoPreview || subcategoryInfo?.logo_url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview || subcategoryInfo?.logo_url || ''} alt="" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">{subcategoryInfo?.name || '—'}</p>
              <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">/{subcategoryInfo?.slug || '…'}</p>
            </div>
            <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
              subcategoryInfo?.is_active !== false
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                : 'text-gray-500 bg-gray-100 border border-gray-200'
            }`}>
              {subcategoryInfo?.is_active !== false ? 'Live' : 'Draft'}
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">

          {/* Primary actions */}
          <div className="px-4 py-3.5 border-b border-gray-100 space-y-2">
            <button
              onClick={() => handleSave(sections)}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                saving
                  ? 'bg-blue-400 text-white cursor-not-allowed opacity-70'
                  : hasUnsavedChanges
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200/60 ring-2 ring-blue-500 ring-offset-2'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                : <><Save className="w-4 h-4" />Save Changes</>}
            </button>

            <div className="flex gap-2">
              <button
                onClick={handlePreview}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-800 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                title="Reload from server"
                className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-800 transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Page Tabs */}
          <div className="px-4 py-3.5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Page Tabs</p>
              <button
                onClick={handleCreateTab}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md px-2.5 py-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Tab
              </button>
            </div>

            <div className="space-y-0.5">
              {tabOptions.map((tab) => {
                const isActive = activeTabId === tab.id;
                const isSpecial = tab.isSpecial || false;
                const linkedCustomTab = !isSpecial ? customTabs.find(ct => ct.id === tab.id) : null;
                return (
                  <div
                    key={tab.id}
                    className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-all ${
                      isActive
                        ? 'bg-blue-50 ring-1 ring-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${isActive ? 'bg-blue-500' : 'bg-gray-300 group-hover:bg-gray-400'}`} />
                    <span className={`flex-1 text-sm truncate ${isActive ? 'font-semibold text-blue-700' : 'font-medium text-gray-700'}`}>
                      {tab.title}
                    </span>
                    {isSpecial && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex-shrink-0">
                        Auto
                      </span>
                    )}
                    {tab.id !== 'overview' && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleMoveTab(tab.id, 'left')}
                          disabled={!canMoveTabDirection(tab.id, 'left')}
                          className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveTab(tab.id, 'right')}
                          disabled={!canMoveTabDirection(tab.id, 'right')}
                          className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        {!isSpecial && linkedCustomTab && (
                          <>
                            <button
                              onClick={() => handleRenameTab(linkedCustomTab)}
                              className="p-1 rounded hover:bg-white text-gray-400 hover:text-gray-600 transition-colors"
                              title="Rename tab"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteTab(linkedCustomTab)}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete tab"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
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
                { label: 'Settings',       icon: Settings,     accent: 'text-gray-600',   bg: 'hover:bg-gray-50',   onClick: () => { if (subcategoryInfo) syncSettingsForm(subcategoryInfo); setShowSettingsPanel(true); } },
                { label: 'SEO Settings',   icon: Search,       accent: 'text-blue-500',   bg: 'hover:bg-blue-50',   onClick: () => setShowSEOPanel(true) },
                { label: 'Tab Headings',   icon: Type,         accent: 'text-purple-500', bg: 'hover:bg-purple-50', onClick: () => setShowTabHeadingsPanel(true) },
                { label: 'Tab SEO',        icon: Code2,        accent: 'text-teal-500',   bg: 'hover:bg-teal-50',   onClick: () => { setTabSeoActiveTab('overview'); setShowTabSeoPanel(true); } },
                { label: 'TOC Order',      icon: ListOrdered,  accent: 'text-orange-500', bg: 'hover:bg-orange-50', onClick: () => setShowTocPanel(true) },
              ] as const).map(({ label, icon: Icon, accent, bg, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-transparent hover:border-gray-100 ${bg} transition-all duration-100`}
                >
                  <Icon className={`w-4 h-4 ${accent} flex-shrink-0`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Description quick-edit */}
          <div className="px-4 py-3.5 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Description</p>
            <textarea
              value={descriptionInput}
              onChange={e => setDescriptionInput(e.target.value)}
              rows={3}
              placeholder="Short description shown on category cards…"
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 resize-none bg-gray-50 placeholder:text-gray-400 transition-colors"
            />
            <button
              onClick={handleSaveDescription}
              disabled={savingDescription || descriptionInput === (subcategoryInfo?.description || '')}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {savingDescription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {savingDescription ? 'Saving…' : 'Save Description'}
            </button>
          </div>

          {/* Page meta */}
          <div className="px-4 py-3.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Page Info</p>
            <div className="space-y-1.5">
              {subcategoryInfo?.category?.name && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Category</span>
                  <span className="font-medium text-gray-700">{subcategoryInfo.category.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Sections</span>
                <span className="font-medium text-gray-700">{sections.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Tabs</span>
                <span className="font-medium text-gray-700">{tabOptions.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50/70">
          <Link href="/admin" className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Admin
          </Link>
        </div>
      </aside>

      {/* ══ MODALS ══════════════════════════════════════════════ */}

      {/* TOC Order */}
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
              {[
                { id: 'overview', title: 'Overview' },
                { id: 'mock-tests', title: 'Mock Tests' },
                { id: 'previous-papers', title: 'Previous Papers' },
                ...customTabs.map(tab => ({ id: tab.id, title: tab.title }))
              ].map(tab => (
                <div key={tab.id} className="flex items-center justify-between gap-4">
                  <label className="text-sm font-medium text-gray-700 flex-1">{tab.title}</label>
                  <input
                    type="number" min={0}
                    value={tocOrder[tab.id] ?? ''}
                    onChange={e => setTocOrder(prev => ({ ...prev, [tab.id]: e.target.value === '' ? '' : parseInt(e.target.value, 10) }))}
                    placeholder="0"
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                  />
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

      {/* Tab Headings */}
      {showTabHeadingsPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTabHeadingsPanel(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">Tab Headings</h2>
                <p className="text-xs text-gray-500 mt-0.5">Custom heading shown at the top of each tab. Leave blank to use tab label.</p>
              </div>
              <button onClick={() => setShowTabHeadingsPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 -mr-1 -mt-1 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {[
                { id: 'overview', title: 'Overview' },
                { id: 'mock-tests', title: 'Mock Tests' },
                { id: 'previous-papers', title: 'Previous Papers' },
                ...customTabs.map(tab => ({ id: tab.id, title: tab.title }))
              ].map(tab => (
                <div key={tab.id} className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{tab.title}</label>
                  <input
                    type="text"
                    value={tabHeadings[tab.id] || ''}
                    onChange={e => setTabHeadings(prev => ({ ...prev, [tab.id]: e.target.value }))}
                    placeholder={`e.g. ${tab.title} for SSC CGL`}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-colors"
                  />
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

      {/* Tab SEO */}
      {showTabSeoPanel && (() => {
        const allTabs = [
          { id: 'overview', title: 'Overview' },
          { id: 'mock-tests', title: 'Mock Tests' },
          { id: 'previous-papers', title: 'Previous Papers' },
          ...customTabs.map(tab => ({ id: tab.id, title: tab.title }))
        ];
        const activeTabSeo = tabSeo[tabSeoActiveTab] || {};
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTabSeoPanel(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-gray-100">
              <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Tab SEO</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Per-tab meta overrides — only applied when that tab is active.</p>
                </div>
                <button onClick={() => setShowTabSeoPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 -mr-1 -mt-1 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="px-6 pt-4 flex flex-wrap gap-1.5 flex-shrink-0">
                {allTabs.map(tab => {
                  const hasSeo = tabSeo[tab.id]?.meta_title || tabSeo[tab.id]?.meta_description || tabSeo[tab.id]?.canonical_url;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setTabSeoActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        tabSeoActiveTab === tab.id
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50'
                      }`}
                    >
                      {tab.title}
                      {hasSeo && <span className={`w-1.5 h-1.5 rounded-full ${tabSeoActiveTab === tab.id ? 'bg-white/70' : 'bg-teal-400'}`} />}
                    </button>
                  );
                })}
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1.5">
                    Meta Title
                    {activeTabSeo.meta_title && (
                      <span className={`text-xs font-normal ${activeTabSeo.meta_title.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                        {activeTabSeo.meta_title.length}/60
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={activeTabSeo.meta_title || ''}
                    onChange={e => setTabSeo(prev => ({ ...prev, [tabSeoActiveTab]: { ...prev[tabSeoActiveTab], meta_title: e.target.value } }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition-colors"
                    placeholder="e.g. SSC CGL Mock Tests 2026 | BharatMock"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1.5">
                    Meta Description
                    {activeTabSeo.meta_description && (
                      <span className={`text-xs font-normal ${activeTabSeo.meta_description.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                        {activeTabSeo.meta_description.length}/160
                      </span>
                    )}
                  </label>
                  <textarea
                    value={activeTabSeo.meta_description || ''}
                    onChange={e => setTabSeo(prev => ({ ...prev, [tabSeoActiveTab]: { ...prev[tabSeoActiveTab], meta_description: e.target.value } }))}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-400 resize-none transition-colors"
                    placeholder="Attempt free SSC CGL mock tests with detailed analytics…"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meta Keywords</label>
                  <input
                    type="text"
                    value={activeTabSeo.meta_keywords || ''}
                    onChange={e => setTabSeo(prev => ({ ...prev, [tabSeoActiveTab]: { ...prev[tabSeoActiveTab], meta_keywords: e.target.value } }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition-colors"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Canonical URL</label>
                  <input
                    type="url"
                    value={activeTabSeo.canonical_url || ''}
                    onChange={e => setTabSeo(prev => ({ ...prev, [tabSeoActiveTab]: { ...prev[tabSeoActiveTab], canonical_url: e.target.value } }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition-colors"
                    placeholder="https://bharatmock.com/…"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Robots</label>
                    <select
                      value={activeTabSeo.robots_meta || 'index,follow'}
                      onChange={e => setTabSeo(prev => ({ ...prev, [tabSeoActiveTab]: { ...prev[tabSeoActiveTab], robots_meta: e.target.value } }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition-colors"
                    >
                      <option value="index,follow">Index, Follow</option>
                      <option value="noindex,follow">No Index, Follow</option>
                      <option value="index,nofollow">Index, No Follow</option>
                      <option value="noindex,nofollow">No Index, No Follow</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">JSON-LD Schema</label>
                    <textarea
                      rows={2}
                      value={activeTabSeo.structured_data || ''}
                      onChange={e => setTabSeo(prev => ({ ...prev, [tabSeoActiveTab]: { ...prev[tabSeoActiveTab], structured_data: e.target.value } }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-400 resize-none font-mono transition-colors"
                      placeholder='{"@type":"WebPage"} or <script> tags'
                    />
                  </div>
                </div>

                {(activeTabSeo.meta_title || activeTabSeo.meta_description) && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">Search Preview</p>
                    <p className="text-xs text-gray-400">google.com › {subcategoryInfo?.slug || 'page'}</p>
                    <p className="text-sm text-blue-700 font-semibold leading-tight mt-0.5 line-clamp-1">
                      {activeTabSeo.meta_title || seoData.meta_title || subcategoryInfo?.name || 'Title'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {activeTabSeo.meta_description || seoData.meta_description || 'Description preview'}
                    </p>
                  </div>
                )}

                {(activeTabSeo.meta_title || activeTabSeo.meta_description || activeTabSeo.meta_keywords) && (
                  <button
                    onClick={() => setTabSeo(prev => { const next = { ...prev }; delete next[tabSeoActiveTab]; return next; })}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                  >
                    Clear SEO for this tab
                  </button>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
                <button onClick={() => setShowTabSeoPanel(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleSaveTabSeo} className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors">Save Tab SEO</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Global SEO Settings */}
      {showSEOPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSEOPanel(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-gray-900">SEO Settings</h2>
                <p className="text-xs text-gray-500 mt-0.5">Optimize metadata for Google Search and social platforms.</p>
              </div>
              <button onClick={() => setShowSEOPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 -mr-1 -mt-1 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1.5">
                    Meta Title
                    <span className={`text-xs font-normal ${seoData.meta_title && seoData.meta_title.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                      {seoData.meta_title?.length || 0}/60
                    </span>
                  </label>
                  <input
                    type="text"
                    value={seoData.meta_title || ''}
                    onChange={e => handleSeoChange('meta_title', e.target.value)}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors ${seoData.meta_title && seoData.meta_title.length > 60 ? 'border-red-300' : 'border-gray-200'}`}
                    placeholder="Enter a compelling title (50-60 characters)"
                    maxLength={70}
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1.5">
                    Meta Description
                    <span className={`text-xs font-normal ${seoData.meta_description && seoData.meta_description.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                      {seoData.meta_description?.length || 0}/160
                    </span>
                  </label>
                  <textarea
                    value={seoData.meta_description || ''}
                    onChange={e => handleSeoChange('meta_description', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 resize-none transition-colors ${seoData.meta_description && seoData.meta_description.length > 160 ? 'border-red-300' : 'border-gray-200'}`}
                    placeholder="Explain the page in 150-160 characters"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meta Keywords</label>
                  <input
                    type="text"
                    value={seoData.meta_keywords || ''}
                    onChange={e => handleSeoChange('meta_keywords', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
              </div>

              {/* Search preview */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">Search Preview</p>
                <p className="text-xs text-gray-400">google.com › {subcategoryInfo?.slug || 'subcategory'}</p>
                <p className="text-sm text-blue-700 font-semibold leading-tight mt-0.5">{seoData.meta_title || subcategoryInfo?.name || 'Meta title preview'}</p>
                <p className="text-xs text-gray-600 mt-1">{seoData.meta_description || 'Meta description will appear here.'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Open Graph Title</label>
                    <input type="text" value={seoData.og_title || ''} onChange={e => handleSeoChange('og_title', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors"
                      placeholder="Title for Facebook / LinkedIn" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Open Graph Description</label>
                    <textarea value={seoData.og_description || ''} onChange={e => handleSeoChange('og_description', e.target.value)}
                      rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 resize-none transition-colors"
                      placeholder="Short description for social sharing" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">OG Image</label>
                    <div className="flex gap-2">
                      <input type="url" value={seoData.og_image_url || ''} onChange={e => handleSeoChange('og_image_url', e.target.value)}
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors"
                        placeholder="https://…/og-image.jpg" />
                      <label className={`inline-flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors ${uploadingOgImage ? 'opacity-60 pointer-events-none' : ''}`}>
                        {uploadingOgImage ? 'Uploading…' : 'Upload'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingOgImage}
                          onChange={e => { const f = e.target.files?.[0]; if (f) void handleOgImageFile(f); }} />
                      </label>
                    </div>
                    {seoData.og_image_url && (
                      <div className="mt-2 border border-dashed border-gray-300 rounded-lg p-2 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={seoData.og_image_url} alt="OG preview" className="w-full h-28 object-cover rounded" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Canonical URL</label>
                    <input type="url" value={seoData.canonical_url || ''} onChange={e => handleSeoChange('canonical_url', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors"
                      placeholder="https://bharatmock.com/ssc-cgl-exam" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Robots</label>
                  <select value={seoData.robots_meta || 'index,follow'} onChange={e => handleSeoChange('robots_meta', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors">
                    <option value="index,follow">Index, Follow</option>
                    <option value="noindex,follow">No Index, Follow</option>
                    <option value="index,nofollow">Index, No Follow</option>
                    <option value="noindex,nofollow">No Index, No Follow</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">JSON-LD Schema</label>
                  <textarea
                    value={typeof seoData.structured_data === 'string' ? seoData.structured_data : ''}
                    onChange={e => handleSeoChange('structured_data' as keyof SEOData, e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 font-mono resize-none transition-colors"
                    placeholder='{"@context":"https://schema.org","@type":"Course"}'
                  />
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <p className="text-[10px] uppercase font-bold text-blue-500 mb-3 tracking-widest">Page Attribution</p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Author Name</label>
                  <input type="text" value={seoData.author_name || ''} onChange={e => handleSeoChange('author_name', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors"
                    placeholder="e.g. BharatMock Editorial Team" />
                  <p className="mt-1 text-xs text-gray-500">Shown on the public page below the title. Leave blank to hide.</p>
                </div>
                {seoData.updated_at && (
                  <p className="mt-3 text-xs text-gray-500">
                    Last updated: <span className="font-medium text-gray-700">{new Date(seoData.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowSEOPanel(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSaveSEO} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">Save SEO Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory Settings */}
      {showSettingsPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettingsPanel(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                <h2 className="text-base font-bold text-gray-900">Subcategory Settings</h2>
                <p className="text-xs text-gray-500 mt-0.5">Update name, slug, logo, display order and status.</p>
              </div>
              <button onClick={() => setShowSettingsPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 -mr-1 -mt-1 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name *</label>
                  <input type="text" value={settingsForm.name} onChange={e => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors"
                    placeholder="e.g., CGL, CHSL" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slug</label>
                  <input type="text" value={settingsForm.slug} onChange={e => setSettingsForm(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 font-mono transition-colors"
                    placeholder="auto-generated" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Display Order</label>
                  <input type="number" value={settingsForm.display_order} onChange={e => setSettingsForm(prev => ({ ...prev, display_order: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors" />
                  <p className="mt-1 text-xs text-gray-400">Lower = shown first on homepage</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                  <select value={settingsForm.is_active ? 'true' : 'false'} onChange={e => setSettingsForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors">
                    <option value="true">Active (Live)</option>
                    <option value="false">Inactive (Draft)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mock Tests Tab</label>
                  <select value={settingsForm.show_mock_tests_tab ? 'true' : 'false'} onChange={e => setSettingsForm(prev => ({ ...prev, show_mock_tests_tab: e.target.value === 'true' }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors">
                    <option value="true">Visible on public page</option>
                    <option value="false">Hidden (URL returns 404)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-400">Hides the reserved Mock Tests tab and de-indexes its URL</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Previous Papers Tab</label>
                  <select value={settingsForm.show_previous_papers_tab ? 'true' : 'false'} onChange={e => setSettingsForm(prev => ({ ...prev, show_previous_papers_tab: e.target.value === 'true' }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-colors">
                    <option value="true">Visible on public page</option>
                    <option value="false">Hidden (URL returns 404)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-400">Hides the reserved Previous Papers tab and de-indexes its URL</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={settingsForm.description} onChange={e => setSettingsForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 resize-none transition-colors"
                  placeholder="Short description for the subcategory" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Logo</label>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 flex-shrink-0">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2 rounded-xl" />
                    ) : (
                      <ImageIcon className="h-7 w-7 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleLogoChange}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />
                    <p className="mt-1.5 text-xs text-gray-400">Square image recommended (PNG/SVG). Shown on homepage cards.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowSettingsPanel(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSaveSettings} disabled={savingSettings}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                {savingSettings ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
