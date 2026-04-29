"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileText,
  GraduationCap,
  Settings,
  ImagePlus,
  Trash2,
  Edit,
  Save,
  Plus,
  Link2,
  Type,
  Eye
} from 'lucide-react';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { testSeriesService, TestSeries } from '@/lib/api/testSeriesService';
import { pageBannersService, PageBanner } from '@/lib/api/pageBannersService';

const PAGE_IDENTIFIER = 'test_series_sidebar';

interface TestSeriesWithDetails extends Omit<TestSeries, 'sections' | 'exams'> {
  sections: Array<{
    id: string;
    test_series_id: string;
    name: string;
    description?: string;
    display_order: number;
    created_at: string;
    updated_at: string;
    topics: Array<{
      id: string;
      section_id: string;
      name: string;
      description?: string;
      display_order: number;
      created_at: string;
      updated_at: string;
    }>;
  }>;
  exams: Array<{
    id: string;
    title: string;
    display_order: number;
    is_published: boolean;
    is_free: boolean;
    supports_hindi?: boolean;
    test_series_section_id?: string;
    test_series_topic_id?: string;
  }>;
}

export default function TestSeriesSidebarAdmin() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<'ordering' | 'banners'>('ordering');

  // Test Series Ordering State
  const [testSeries, setTestSeries] = useState<TestSeriesWithDetails[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Banner Management State
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PageBanner | null>(null);
  const [form, setForm] = useState({ imageUrl: '', linkUrl: '', altText: '' });

  // Inline Edit State
  const [editingItem, setEditingItem] = useState<{ type: 'series' | 'section' | 'topic'; id: string; name: string } | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Icon Management State
  const [selectedSeries, setSelectedSeries] = useState<TestSeriesWithDetails | null>(null);
  const [iconUploading, setIconUploading] = useState<{ logo: boolean; thumbnail: boolean }>({ logo: false, thumbnail: false });
  const [showIconModal, setShowIconModal] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeTab === 'ordering') {
      fetchTestSeries();
    } else {
      fetchBanners();
    }
  }, [activeTab]);
  // Test Series Functions
  const fetchTestSeries = async () => {
    setSeriesLoading(true);
    try {
      const response = await testSeriesService.getTestSeries({ limit: 100 });
      
      const detailedSeries = await Promise.all(
        response.data.map(async (series) => {
          try {
            const detailed = await testSeriesService.getTestSeriesById(series.id);
            return {
              ...detailed,
              sections: detailed.sections || [],
              exams: detailed.exams?.map(exam => ({
                ...exam,
                display_order: (exam as any).display_order || 0,
                is_published: (exam as any).is_published || false,
                is_free: exam.is_free || false
              })) || []
            } as TestSeriesWithDetails;
          } catch (error) {
            console.error(`Failed to fetch details for series ${series.id}:`, error);
            return {
              ...series,
              sections: [],
              exams: []
            } as TestSeriesWithDetails;
          }
        })
      );

      setTestSeries(detailedSeries);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load test series',
        variant: 'destructive'
      });
    } finally {
      setSeriesLoading(false);
    }
  };

  const toggleSeriesExpansion = (seriesId: string) => {
    setExpandedSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seriesId)) {
        newSet.delete(seriesId);
      } else {
        newSet.add(seriesId);
      }
      return newSet;
    });
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const moveSectionUp = async (seriesId: string, sectionIndex: number) => {
    if (sectionIndex === 0) return;

    const series = testSeries.find(s => s.id === seriesId);
    if (!series) return;

    const newSections = [...series.sections];
    const [movedSection] = newSections.splice(sectionIndex, 1);
    newSections.splice(sectionIndex - 1, 0, movedSection);

    newSections.forEach((section, index) => {
      section.display_order = index;
    });

    setTestSeries(prev => prev.map(s => 
      s.id === seriesId ? { ...s, sections: newSections } : s
    ));

    try {
      const orderedIds = newSections.map(s => s.id);
      await testSeriesService.reorderSections(orderedIds);
      toast({
        title: 'Success',
        description: 'Section order updated successfully'
      });
    } catch (error) {
      console.error('Failed to update section order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update section order',
        variant: 'destructive'
      });
      fetchTestSeries();
    }
  };
  const moveSectionDown = async (seriesId: string, sectionIndex: number) => {
    const series = testSeries.find(s => s.id === seriesId);
    if (!series || sectionIndex === series.sections.length - 1) return;

    const newSections = [...series.sections];
    const [movedSection] = newSections.splice(sectionIndex, 1);
    newSections.splice(sectionIndex + 1, 0, movedSection);

    newSections.forEach((section, index) => {
      section.display_order = index;
    });

    setTestSeries(prev => prev.map(s => 
      s.id === seriesId ? { ...s, sections: newSections } : s
    ));

    try {
      const orderedIds = newSections.map(s => s.id);
      await testSeriesService.reorderSections(orderedIds);
      toast({
        title: 'Success',
        description: 'Section order updated successfully'
      });
    } catch (error) {
      console.error('Failed to update section order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update section order',
        variant: 'destructive'
      });
      fetchTestSeries();
    }
  };

  const moveTopicUp = async (sectionId: string, topicIndex: number) => {
    if (topicIndex === 0) return;

    const series = testSeries.find(s => s.sections.some(sec => sec.id === sectionId));
    if (!series) return;

    const sectionIndex = series.sections.findIndex(sec => sec.id === sectionId);
    if (sectionIndex === -1) return;

    const newTopics = [...series.sections[sectionIndex].topics];
    const [movedTopic] = newTopics.splice(topicIndex, 1);
    newTopics.splice(topicIndex - 1, 0, movedTopic);

    newTopics.forEach((topic, index) => {
      topic.display_order = index;
    });

    setTestSeries(prev => prev.map(s => {
      if (s.id === series.id) {
        const newSections = [...s.sections];
        newSections[sectionIndex] = { ...newSections[sectionIndex], topics: newTopics };
        return { ...s, sections: newSections };
      }
      return s;
    }));

    try {
      const orderedIds = newTopics.map(t => t.id);
      await testSeriesService.reorderTopics(orderedIds);
      toast({
        title: 'Success',
        description: 'Topic order updated successfully'
      });
    } catch (error) {
      console.error('Failed to update topic order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update topic order',
        variant: 'destructive'
      });
      fetchTestSeries();
    }
  };
  const moveTopicDown = async (sectionId: string, topicIndex: number) => {
    const series = testSeries.find(s => s.sections.some(sec => sec.id === sectionId));
    if (!series) return;

    const sectionIndex = series.sections.findIndex(sec => sec.id === sectionId);
    if (sectionIndex === -1) return;

    const section = series.sections[sectionIndex];
    if (topicIndex === section.topics.length - 1) return;

    const newTopics = [...section.topics];
    const [movedTopic] = newTopics.splice(topicIndex, 1);
    newTopics.splice(topicIndex + 1, 0, movedTopic);

    newTopics.forEach((topic, index) => {
      topic.display_order = index;
    });

    setTestSeries(prev => prev.map(s => {
      if (s.id === series.id) {
        const newSections = [...s.sections];
        newSections[sectionIndex] = { ...newSections[sectionIndex], topics: newTopics };
        return { ...s, sections: newSections };
      }
      return s;
    }));

    try {
      const orderedIds = newTopics.map(t => t.id);
      await testSeriesService.reorderTopics(orderedIds);
      toast({
        title: 'Success',
        description: 'Topic order updated successfully'
      });
    } catch (error) {
      console.error('Failed to update topic order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update topic order',
        variant: 'destructive'
      });
      fetchTestSeries();
    }
  };

  const moveExamUp = async (seriesId: string, examIndex: number) => {
    if (examIndex === 0) return;

    const series = testSeries.find(s => s.id === seriesId);
    if (!series) return;

    const newExams = [...series.exams];
    const [movedExam] = newExams.splice(examIndex, 1);
    newExams.splice(examIndex - 1, 0, movedExam);

    newExams.forEach((exam, index) => {
      exam.display_order = index;
    });

    setTestSeries(prev => prev.map(s => 
      s.id === seriesId ? { ...s, exams: newExams } : s
    ));

    try {
      const orderedIds = newExams.map(e => e.id);
      await testSeriesService.reorderExams(orderedIds);
      toast({
        title: 'Success',
        description: 'Exam order updated successfully'
      });
    } catch (error) {
      console.error('Failed to update exam order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update exam order',
        variant: 'destructive'
      });
      fetchTestSeries();
    }
  };
  const moveExamDown = async (seriesId: string, examIndex: number) => {
    const series = testSeries.find(s => s.id === seriesId);
    if (!series || examIndex === series.exams.length - 1) return;

    const newExams = [...series.exams];
    const [movedExam] = newExams.splice(examIndex, 1);
    newExams.splice(examIndex + 1, 0, movedExam);

    newExams.forEach((exam, index) => {
      exam.display_order = index;
    });

    setTestSeries(prev => prev.map(s => 
      s.id === seriesId ? { ...s, exams: newExams } : s
    ));

    try {
      const orderedIds = newExams.map(e => e.id);
      await testSeriesService.reorderExams(orderedIds);
      toast({
        title: 'Success',
        description: 'Exam order updated successfully'
      });
    } catch (error) {
      console.error('Failed to update exam order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update exam order',
        variant: 'destructive'
      });
      fetchTestSeries();
    }
  };

  // Banner Management Functions
  const fetchBanners = async () => {
    setBannersLoading(true);
    try {
      const data = await pageBannersService.getAdminBanners(PAGE_IDENTIFIER);
      setBanners(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load sidebar banners',
        variant: 'destructive'
      });
    } finally {
      setBannersLoading(false);
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setForm({ imageUrl: '', linkUrl: '', altText: '' });
  };

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await pageBannersService.uploadBannerImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
      toast({ title: 'Upload complete', description: 'Banner image uploaded successfully' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload banner image',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };
  const handleSave = async () => {
    if (!form.imageUrl.trim()) {
      toast({ title: 'Image missing', description: 'Please upload a banner image', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingBanner) {
        const updated = await pageBannersService.updateBanner(editingBanner.id, {
          imageUrl: form.imageUrl,
          linkUrl: form.linkUrl || undefined,
          altText: form.altText || undefined
        });
        setBanners((prev) => prev.map((banner) => (banner.id === updated.id ? updated : banner)));
        toast({ title: 'Updated', description: 'Banner updated successfully' });
      } else {
        const created = await pageBannersService.createBanner({
          pageIdentifier: PAGE_IDENTIFIER,
          imageUrl: form.imageUrl,
          linkUrl: form.linkUrl || undefined,
          altText: form.altText || undefined,
          isActive: true,
          displayOrder: banners.length + 1
        });
        setBanners((prev) => [...prev, created]);
        toast({ title: 'Created', description: 'New banner added' });
      }
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save banner',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await pageBannersService.deleteBanner(bannerId);
      setBanners((prev) => prev.filter((banner) => banner.id !== bannerId));
      toast({ title: 'Deleted', description: 'Banner removed' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete banner',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (banner: PageBanner) => {
    try {
      const updated = await pageBannersService.updateBanner(banner.id, {
        isActive: !banner.is_active
      });
      setBanners((prev) => prev.map((item) => (item.id === banner.id ? updated : item)));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (banner: PageBanner) => {
    setEditingBanner(banner);
    setForm({
      imageUrl: banner.image_url,
      linkUrl: banner.link_url || '',
      altText: banner.alt_text || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Inline Edit / Delete Functions
  const startEditing = (type: 'series' | 'section' | 'topic', id: string, name: string) => {
    setEditingItem({ type, id, name });
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditingName('');
  };

  const saveEditing = async () => {
    if (!editingItem || !editingName.trim()) return;
    setEditSaving(true);
    try {
      if (editingItem.type === 'series') {
        await testSeriesService.updateTestSeries(editingItem.id, { title: editingName.trim() });
        setTestSeries(prev => prev.map(s => s.id === editingItem.id ? { ...s, title: editingName.trim() } : s));
      } else if (editingItem.type === 'section') {
        await testSeriesService.updateSection(editingItem.id, { name: editingName.trim() });
        setTestSeries(prev => prev.map(s => ({
          ...s,
          sections: s.sections.map(sec => sec.id === editingItem.id ? { ...sec, name: editingName.trim() } : sec)
        })));
      } else if (editingItem.type === 'topic') {
        await testSeriesService.updateTopic(editingItem.id, { name: editingName.trim() });
        setTestSeries(prev => prev.map(s => ({
          ...s,
          sections: s.sections.map(sec => ({
            ...sec,
            topics: sec.topics.map(t => t.id === editingItem.id ? { ...t, name: editingName.trim() } : t)
          }))
        })));
      }
      toast({ title: 'Saved', description: 'Name updated successfully' });
      cancelEditing();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteSeries = async (seriesId: string, title: string) => {
    if (!confirm(`Delete test series "${title}"? This cannot be undone.`)) return;
    try {
      await testSeriesService.deleteTestSeries(seriesId);
      setTestSeries(prev => prev.filter(s => s.id !== seriesId));
      toast({ title: 'Deleted', description: 'Test series deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleDeleteSection = async (sectionId: string, name: string) => {
    if (!confirm(`Delete section "${name}"?`)) return;
    try {
      await testSeriesService.deleteSection(sectionId);
      setTestSeries(prev => prev.map(s => ({
        ...s,
        sections: s.sections.filter(sec => sec.id !== sectionId)
      })));
      toast({ title: 'Deleted', description: 'Section deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleDeleteTopic = async (topicId: string, name: string) => {
    if (!confirm(`Delete topic "${name}"?`)) return;
    try {
      await testSeriesService.deleteTopic(topicId);
      setTestSeries(prev => prev.map(s => ({
        ...s,
        sections: s.sections.map(sec => ({
          ...sec,
          topics: sec.topics.filter(t => t.id !== topicId)
        }))
      })));
      toast({ title: 'Deleted', description: 'Topic deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  // Icon Management Functions
  const handleIconManagement = (series: TestSeriesWithDetails) => {
    setSelectedSeries(series);
    setShowIconModal(true);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSeries) return;

    setIconUploading(prev => ({ ...prev, logo: true }));
    try {
      const result = await testSeriesService.uploadLogo(selectedSeries.id, file);
      
      // Update the series in state
      setTestSeries(prev => prev.map(s => 
        s.id === selectedSeries.id 
          ? { ...s, logo_url: result.logo_url }
          : s
      ));
      
      // Update selected series
      setSelectedSeries(prev => prev ? { ...prev, logo_url: result.logo_url } : null);
      
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive'
      });
    } finally {
      setIconUploading(prev => ({ ...prev, logo: false }));
      event.target.value = '';
    }
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSeries) return;

    setIconUploading(prev => ({ ...prev, thumbnail: true }));
    try {
      const result = await testSeriesService.uploadThumbnail(selectedSeries.id, file);
      
      // Update the series in state
      setTestSeries(prev => prev.map(s => 
        s.id === selectedSeries.id 
          ? { ...s, thumbnail_url: result.thumbnail_url }
          : s
      ));
      
      // Update selected series
      setSelectedSeries(prev => prev ? { ...prev, thumbnail_url: result.thumbnail_url } : null);
      
      toast({
        title: 'Success',
        description: 'Thumbnail uploaded successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload thumbnail',
        variant: 'destructive'
      });
    } finally {
      setIconUploading(prev => ({ ...prev, thumbnail: false }));
      event.target.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    if (!selectedSeries || !selectedSeries.logo_url) return;

    if (!confirm('Are you sure you want to delete the logo?')) return;

    try {
      await testSeriesService.deleteLogo(selectedSeries.id);
      
      // Update the series in state
      setTestSeries(prev => prev.map(s => 
        s.id === selectedSeries.id 
          ? { ...s, logo_url: undefined }
          : s
      ));
      
      // Update selected series
      setSelectedSeries(prev => prev ? { ...prev, logo_url: undefined } : null);
      
      toast({
        title: 'Success',
        description: 'Logo deleted successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete logo',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteThumbnail = async () => {
    if (!selectedSeries || !selectedSeries.thumbnail_url) return;

    if (!confirm('Are you sure you want to delete the thumbnail?')) return;

    try {
      await testSeriesService.deleteThumbnail(selectedSeries.id);
      
      // Update the series in state
      setTestSeries(prev => prev.map(s => 
        s.id === selectedSeries.id 
          ? { ...s, thumbnail_url: undefined }
          : s
      ));
      
      // Update selected series
      setSelectedSeries(prev => prev ? { ...prev, thumbnail_url: undefined } : null);
      
      toast({
        title: 'Success',
        description: 'Thumbnail deleted successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete thumbnail',
        variant: 'destructive'
      });
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-2">
          <Breadcrumbs
            items={[AdminBreadcrumb(), { label: 'Pages', href: '/admin/pages' }, { label: 'Test Series' }]}
            className="mb-2"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Test Series</p>
            <h1 className="font-display text-3xl font-bold text-slate-900">Sidebar Management</h1>
            <p className="text-muted-foreground">
              Manage test series ordering and sidebar banners for test series pages.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Tab Navigation */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant={activeTab === 'ordering' ? 'default' : 'outline'}
              onClick={() => setActiveTab('ordering')}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Test Series Ordering
            </Button>
            <Button
              variant={activeTab === 'banners' ? 'default' : 'outline'}
              onClick={() => setActiveTab('banners')}
              className="flex items-center gap-2"
            >
              <ImagePlus className="h-4 w-4" />
              Sidebar Banners
            </Button>
          </div>

          {/* Test Series Ordering Tab */}
          {activeTab === 'ordering' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Test Series Order Management</h2>
                <p className="text-sm text-muted-foreground">
                  Manage the display order of test series sections, topics, and exams. Changes are saved automatically.
                </p>
              </div>

              {seriesLoading ? (
                <div className="py-12 flex flex-col items-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4" />
                  <p>Loading test series...</p>
                </div>
              ) : testSeries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No test series found.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {testSeries.map((series) => (
                    <Card key={series.id} className="p-6 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSeriesExpansion(series.id)}
                          >
                            {expandedSeries.has(series.id) ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />
                            }
                          </Button>
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          <div>
                            {editingItem?.type === 'series' && editingItem.id === series.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingName}
                                  onChange={e => setEditingName(e.target.value)}
                                  className="h-8 text-sm w-48"
                                  onKeyDown={e => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing(); }}
                                  autoFocus
                                />
                                <Button size="sm" onClick={saveEditing} disabled={editSaving} className="h-8 px-2">
                                  {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-8 px-2">×</Button>
                              </div>
                            ) : (
                              <h3 className="text-lg font-semibold text-slate-900">{series.title}</h3>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {series.sections?.length || 0} sections • {series.exams?.length || 0} exams
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            asChild
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Link href={`/admin/test-series/${series.id}/editor`}>
                              <FileText className="h-4 w-4" />
                              Edit Content
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing('series', series.id, series.title)}
                            className="flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Rename
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleIconManagement(series)}
                            className="flex items-center gap-2"
                          >
                            <ImagePlus className="h-4 w-4" />
                            Icons
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSeries(series.id, series.title)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            series.is_published 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {series.is_published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      </div>
                      {expandedSeries.has(series.id) && (
                        <div className="space-y-6 mt-6">
                          {/* Sections */}
                          {series.sections && series.sections.length > 0 && (
                            <div>
                              <h4 className="text-md font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Sections ({series.sections.length})
                              </h4>
                              <div className="space-y-3">
                                {series.sections
                                  .sort((a, b) => a.display_order - b.display_order)
                                  .map((section, sectionIndex) => (
                                  <div key={section.id} className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleSectionExpansion(section.id)}
                                        >
                                          {expandedSections.has(section.id) ? 
                                            <ChevronUp className="h-4 w-4" /> : 
                                            <ChevronDown className="h-4 w-4" />
                                          }
                                        </Button>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => moveSectionUp(series.id, sectionIndex)}
                                            disabled={sectionIndex === 0}
                                            className="h-8 w-8 p-0"
                                            title="Move section up"
                                          >
                                            <ArrowUp className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => moveSectionDown(series.id, sectionIndex)}
                                            disabled={sectionIndex === series.sections.length - 1}
                                            className="h-8 w-8 p-0"
                                            title="Move section down"
                                          >
                                            <ArrowDown className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        <FileText className="h-4 w-4 text-green-600" />
                                        {editingItem?.type === 'section' && editingItem.id === section.id ? (
                                          <div className="flex items-center gap-2">
                                            <Input
                                              value={editingName}
                                              onChange={e => setEditingName(e.target.value)}
                                              className="h-7 text-sm w-40"
                                              onKeyDown={e => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing(); }}
                                              autoFocus
                                            />
                                            <Button size="sm" onClick={saveEditing} disabled={editSaving} className="h-7 px-2">
                                              {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-7 px-2">×</Button>
                                          </div>
                                        ) : (
                                          <span className="font-medium">{section.name}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                          {section.topics?.length || 0} topics
                                        </span>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditing('section', section.id, section.name)} title="Rename section">
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteSection(section.id, section.name)} title="Delete section">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Topics */}
                                    {expandedSections.has(section.id) && section.topics && section.topics.length > 0 && (
                                      <div className="mt-4 ml-8 space-y-2">
                                        <h5 className="text-sm font-medium text-slate-700">Topics:</h5>
                                        {section.topics
                                          .sort((a, b) => a.display_order - b.display_order)
                                          .map((topic, topicIndex) => (
                                          <div key={topic.id} className="flex items-center justify-between bg-white rounded p-3">
                                            <div className="flex items-center gap-3">
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => moveTopicUp(section.id, topicIndex)}
                                                  disabled={topicIndex === 0}
                                                  className="h-6 w-6 p-0"
                                                  title="Move topic up"
                                                >
                                                  <ArrowUp className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => moveTopicDown(section.id, topicIndex)}
                                                  disabled={topicIndex === section.topics.length - 1}
                                                  className="h-6 w-6 p-0"
                                                  title="Move topic down"
                                                >
                                                  <ArrowDown className="h-3 w-3" />
                                                </Button>
                                              </div>
                                              {editingItem?.type === 'topic' && editingItem.id === topic.id ? null : (
                                                <span className="text-sm">{topic.name}</span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {editingItem?.type === 'topic' && editingItem.id === topic.id ? (
                                                <div className="flex items-center gap-1">
                                                  <Input
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    className="h-6 text-xs w-32"
                                                    onKeyDown={e => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing(); }}
                                                    autoFocus
                                                  />
                                                  <Button size="sm" onClick={saveEditing} disabled={editSaving} className="h-6 px-1">
                                                    {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                  </Button>
                                                  <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-6 px-1">×</Button>
                                                </div>
                                              ) : (
                                                <>
                                                  <span className="text-xs text-muted-foreground">Order: {topic.display_order + 1}</span>
                                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEditing('topic', topic.id, topic.name)} title="Rename topic">
                                                    <Edit className="h-3 w-3" />
                                                  </Button>
                                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteTopic(topic.id, topic.name)} title="Delete topic">
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Exams */}
                          {series.exams && series.exams.length > 0 && (
                            <div>
                              <h4 className="text-md font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <GraduationCap className="h-4 w-4" />
                                Exams ({series.exams.length})
                              </h4>
                              <div className="space-y-2">
                                {series.exams
                                  .sort((a, b) => a.display_order - b.display_order)
                                  .map((exam, examIndex) => (
                                  <div key={exam.id} className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => moveExamUp(series.id, examIndex)}
                                          disabled={examIndex === 0}
                                          className="h-6 w-6 p-0"
                                          title="Move exam up"
                                        >
                                          <ArrowUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => moveExamDown(series.id, examIndex)}
                                          disabled={examIndex === series.exams.length - 1}
                                          className="h-6 w-6 p-0"
                                          title="Move exam down"
                                        >
                                          <ArrowDown className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <GraduationCap className="h-4 w-4 text-blue-600" />
                                      <span className="font-medium">{exam.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        Order: {exam.display_order + 1}
                                      </span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        exam.is_published 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {exam.is_published ? 'Published' : 'Draft'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sidebar Banners Tab */}
          {activeTab === 'banners' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  {editingBanner ? 'Edit Banner' : 'Add New Banner'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Upload and curate banners that appear beside every test series detail page.
                </p>
                {editingBanner && (
                  <Button variant="ghost" onClick={resetForm} className="text-sm mt-2">
                    Cancel Edit
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Banner Image</label>
                  <div className="flex gap-3">
                    <Input
                      value={form.imageUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="Image URL"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button type="button" variant="secondary" onClick={handleFilePick} disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Link URL (Optional)</label>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-slate-400" />
                    <Input
                      value={form.linkUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
                      placeholder="https://"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Alt Text</label>
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-slate-400" />
                    <Input
                      value={form.altText}
                      onChange={(e) => setForm((prev) => ({ ...prev, altText: e.target.value }))}
                      placeholder="Short description"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto mb-8">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editingBanner ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {editingBanner ? 'Update Banner' : 'Add Banner'}
              </Button>

              {/* Existing Banners */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Existing Banners</h3>
                    <p className="text-sm text-muted-foreground">Only one banner is shown at a time; toggled banners rotate.</p>
                  </div>
                </div>

                {bannersLoading ? (
                  <div className="py-12 flex flex-col items-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    Loading banners...
                  </div>
                ) : banners.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No banners yet. Add one above.</div>
                ) : (
                  <div className="grid gap-4">
                    {banners.map((banner) => (
                      <div
                        key={banner.id}
                        className="flex flex-col md:flex-row items-start md:items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={banner.image_url}
                          alt={banner.alt_text || 'Sidebar banner'}
                          className="h-32 w-full md:w-64 object-cover rounded-xl border border-slate-100"
                        />
                        <div className="flex-1 w-full">
                          <p className="text-sm font-semibold text-slate-900">
                            {banner.alt_text || 'Untitled banner'}
                          </p>
                          {banner.link_url && (
                            <a
                              href={banner.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 underline"
                            >
                              {banner.link_url}
                            </a>
                          )}
                          <p className="text-xs text-slate-500 mt-1">
                            Updated {new Date(banner.updated_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Switch
                              checked={banner.is_active}
                              onCheckedChange={() => handleToggleActive(banner)}
                              id={`banner-active-${banner.id}`}
                            />
                            <label htmlFor={`banner-active-${banner.id}`}>Active</label>
                          </div>
                          <Button variant="outline" size="icon" onClick={() => handleEdit(banner)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDelete(banner.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Icon Management Modal */}
        {showIconModal && selectedSeries && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Manage Icons</h3>
                    <p className="text-sm text-muted-foreground">{selectedSeries.title}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIconModal(false)}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Logo Management */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                      <ImagePlus className="h-5 w-5" />
                      Logo
                    </h4>
                    
                    {selectedSeries.logo_url ? (
                      <div className="space-y-3">
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedSeries.logo_url}
                            alt="Test series logo"
                            className="w-full h-32 object-cover rounded-lg border border-slate-200"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteLogo}
                            className="absolute top-2 right-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={iconUploading.logo}
                          className="w-full"
                        >
                          {iconUploading.logo ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Edit className="h-4 w-4 mr-2" />
                          )}
                          Replace Logo
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-500">
                          <div className="text-center">
                            <ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No logo uploaded</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={iconUploading.logo}
                          className="w-full"
                        >
                          {iconUploading.logo ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ImagePlus className="h-4 w-4 mr-2" />
                          )}
                          Upload Logo
                        </Button>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      accept="image/*"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Thumbnail Management */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Thumbnail
                    </h4>
                    
                    {selectedSeries.thumbnail_url ? (
                      <div className="space-y-3">
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedSeries.thumbnail_url}
                            alt="Test series thumbnail"
                            className="w-full h-32 object-cover rounded-lg border border-slate-200"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteThumbnail}
                            className="absolute top-2 right-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => thumbnailInputRef.current?.click()}
                          disabled={iconUploading.thumbnail}
                          className="w-full"
                        >
                          {iconUploading.thumbnail ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Edit className="h-4 w-4 mr-2" />
                          )}
                          Replace Thumbnail
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-500">
                          <div className="text-center">
                            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No thumbnail uploaded</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => thumbnailInputRef.current?.click()}
                          disabled={iconUploading.thumbnail}
                          className="w-full"
                        >
                          {iconUploading.thumbnail ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ImagePlus className="h-4 w-4 mr-2" />
                          )}
                          Upload Thumbnail
                        </Button>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      accept="image/*"
                      ref={thumbnailInputRef}
                      onChange={handleThumbnailUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowIconModal(false)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}