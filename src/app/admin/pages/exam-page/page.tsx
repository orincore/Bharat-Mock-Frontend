"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  ImagePlus,
  Link2,
  X,
  Star,
  StarOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';
import { pagePopularTestsService, PopularTestAdmin } from '@/lib/api/pagePopularTestsService';
import { pageBannersService, PageBanner } from '@/lib/api/pageBannersService';
import { testimonialsService, Testimonial } from '@/lib/api/testimonialsService';
import { examService } from '@/lib/api/examService';
import { Exam } from '@/types';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd';

const PAGE_IDENTIFIER = 'exam_page';
const NEW_TEST_SERIES_IDENTIFIER = 'new_test_series';

export default function ExamPageAdmin() {
  const router = useRouter();
  const { toast } = useToast();
  const [popularTests, setPopularTests] = useState<PopularTestAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Exam[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [newTestSeries, setNewTestSeries] = useState<PopularTestAdmin[]>([]);
  const [newTestSeriesLoading, setNewTestSeriesLoading] = useState(true);
  const [newTestSeriesSaving, setNewTestSeriesSaving] = useState(false);
  const [newTestSeriesSearchQuery, setNewTestSeriesSearchQuery] = useState('');
  const [newTestSeriesSearchResults, setNewTestSeriesSearchResults] = useState<Exam[]>([]);
  const [newTestSeriesSearching, setNewTestSeriesSearching] = useState(false);
  
  const [banners, setBanners] = useState<PageBanner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PageBanner | null>(null);
  const [bannerForm, setBannerForm] = useState({ imageUrl: '', linkUrl: '', altText: '' });

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [testimonialsUpdating, setTestimonialsUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchPopularTests();
    fetchNewTestSeries();
    fetchBanners();
    fetchTestimonials();
  }, []);

  const fetchPopularTests = async () => {
    setLoading(true);
    try {
      const data = await pagePopularTestsService.getPopularTestsAdmin(PAGE_IDENTIFIER);
      setPopularTests(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load popular tests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTestimonialFlag = async (
    testimonialId: string,
    updates: { highlight?: boolean; isPublished?: boolean }
  ) => {
    setTestimonialsUpdating(testimonialId);
    try {
      const updated = await testimonialsService.adminUpdate(testimonialId, updates);
      setTestimonials(testimonials.map(t => (t.id === testimonialId ? updated : t)));
      toast({ title: 'Success', description: 'Testimonial updated' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update testimonial',
        variant: 'destructive'
      });
    } finally {
      setTestimonialsUpdating(null);
    }
  };

  const fetchNewTestSeries = async () => {
    setNewTestSeriesLoading(true);
    try {
      const data = await pagePopularTestsService.getPopularTestsAdmin(NEW_TEST_SERIES_IDENTIFIER);
      setNewTestSeries(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load new test series',
        variant: 'destructive'
      });
    } finally {
      setNewTestSeriesLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await examService.getExams({
        search: searchQuery,
        limit: 10
      });
      setSearchResults(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to search exams',
        variant: 'destructive'
      });
    } finally {
      setSearching(false);
    }
  };

  const handleAddTest = async (exam: Exam) => {
    try {
      const newTest = await pagePopularTestsService.addPopularTest(PAGE_IDENTIFIER, exam.id);
      setPopularTests([...popularTests, newTest]);
      setSearchQuery('');
      setSearchResults([]);
      toast({
        title: 'Success',
        description: 'Test added to popular tests'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add test',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveTest = async (id: string) => {
    try {
      await pagePopularTestsService.removePopularTest(id);
      setPopularTests(popularTests.filter(test => test.id !== id));
      toast({
        title: 'Success',
        description: 'Test removed from popular tests'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove test',
        variant: 'destructive'
      });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await pagePopularTestsService.togglePopularTestStatus(id, !currentStatus);
      setPopularTests(popularTests.map(test =>
        test.id === id ? { ...test, isActive: !currentStatus } : test
      ));
      toast({
        title: 'Success',
        description: `Test ${!currentStatus ? 'activated' : 'deactivated'}`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(popularTests);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPopularTests(items);

    setSaving(true);
    try {
      const orderedIds = items.map(item => item.id);
      await pagePopularTestsService.reorderPopularTests(PAGE_IDENTIFIER, orderedIds);
      toast({
        title: 'Success',
        description: 'Order updated successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update order',
        variant: 'destructive'
      });
      fetchPopularTests();
    } finally {
      setSaving(false);
    }
  };

  const isExamAlreadyAdded = (examId: string) => {
    return popularTests.some(test => test.examId === examId);
  };

  const handleNewTestSeriesSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestSeriesSearchQuery.trim()) {
      setNewTestSeriesSearchResults([]);
      return;
    }

    setNewTestSeriesSearching(true);
    try {
      const response = await examService.getExams({
        search: newTestSeriesSearchQuery,
        limit: 10
      });
      setNewTestSeriesSearchResults(response.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to search exams',
        variant: 'destructive'
      });
    } finally {
      setNewTestSeriesSearching(false);
    }
  };

  const handleAddNewTestSeries = async (exam: Exam) => {
    try {
      const newTest = await pagePopularTestsService.addPopularTest(NEW_TEST_SERIES_IDENTIFIER, exam.id);
      setNewTestSeries([...newTestSeries, newTest]);
      setNewTestSeriesSearchQuery('');
      setNewTestSeriesSearchResults([]);
      toast({
        title: 'Success',
        description: 'Test added to new test series'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add test',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveNewTestSeries = async (id: string) => {
    try {
      await pagePopularTestsService.removePopularTest(id);
      setNewTestSeries(newTestSeries.filter(test => test.id !== id));
      toast({
        title: 'Success',
        description: 'Test removed from new test series'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove test',
        variant: 'destructive'
      });
    }
  };

  const handleToggleNewTestSeriesStatus = async (id: string, currentStatus: boolean) => {
    try {
      await pagePopularTestsService.togglePopularTestStatus(id, !currentStatus);
      setNewTestSeries(newTestSeries.map(test =>
        test.id === id ? { ...test, isActive: !currentStatus } : test
      ));
      toast({
        title: 'Success',
        description: `Test ${!currentStatus ? 'activated' : 'deactivated'}`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const handleNewTestSeriesDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(newTestSeries);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setNewTestSeries(items);

    setNewTestSeriesSaving(true);
    try {
      const orderedIds = items.map(item => item.id);
      await pagePopularTestsService.reorderPopularTests(NEW_TEST_SERIES_IDENTIFIER, orderedIds);
      toast({
        title: 'Success',
        description: 'Order updated successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update order',
        variant: 'destructive'
      });
      fetchNewTestSeries();
    } finally {
      setNewTestSeriesSaving(false);
    }
  };

  const isExamAlreadyAddedToNewSeries = (examId: string) => {
    return newTestSeries.some(test => test.examId === examId);
  };

  const fetchBanners = async () => {
    setBannersLoading(true);
    try {
      const data = await pageBannersService.getAdminBanners(PAGE_IDENTIFIER);
      setBanners(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load banners',
        variant: 'destructive'
      });
    } finally {
      setBannersLoading(false);
    }
  };

  const fetchTestimonials = async () => {
    setTestimonialsLoading(true);
    try {
      const data = await testimonialsService.adminList();
      setTestimonials(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load testimonials',
        variant: 'destructive'
      });
    } finally {
      setTestimonialsLoading(false);
    }
  };

  const handleBannerImageUpload = async (file: File) => {
    setBannerUploading(true);
    try {
      const result = await pageBannersService.uploadBannerImage(file);
      setBannerForm(prev => ({ ...prev, imageUrl: result.url }));
      toast({ title: 'Success', description: 'Image uploaded successfully' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive'
      });
    } finally {
      setBannerUploading(false);
    }
  };

  const handleSaveBanner = async () => {
    if (!bannerForm.imageUrl) {
      toast({ title: 'Error', description: 'Image is required', variant: 'destructive' });
      return;
    }

    try {
      if (editingBanner) {
        const updated = await pageBannersService.updateBanner(editingBanner.id, {
          imageUrl: bannerForm.imageUrl,
          linkUrl: bannerForm.linkUrl || undefined,
          altText: bannerForm.altText || undefined
        });
        setBanners(banners.map(b => b.id === updated.id ? updated : b));
        toast({ title: 'Success', description: 'Banner updated' });
      } else {
        const created = await pageBannersService.createBanner({
          pageIdentifier: PAGE_IDENTIFIER,
          imageUrl: bannerForm.imageUrl,
          linkUrl: bannerForm.linkUrl || undefined,
          altText: bannerForm.altText || undefined,
          isActive: true
        });
        setBanners([...banners, created]);
        toast({ title: 'Success', description: 'Banner created' });
      }
      setBannerForm({ imageUrl: '', linkUrl: '', altText: '' });
      setEditingBanner(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save banner',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await pageBannersService.deleteBanner(id);
      setBanners(banners.filter(b => b.id !== id));
      toast({ title: 'Success', description: 'Banner deleted' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete banner',
        variant: 'destructive'
      });
    }
  };

  const handleEditBanner = (banner: PageBanner) => {
    setEditingBanner(banner);
    setBannerForm({
      imageUrl: banner.image_url,
      linkUrl: banner.link_url || '',
      altText: banner.alt_text || ''
    });
  };

  const handleCancelBannerEdit = () => {
    setEditingBanner(null);
    setBannerForm({ imageUrl: '', linkUrl: '', altText: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Breadcrumbs
                items={[
                  AdminBreadcrumb(),
                  { label: 'Pages', href: '/admin/pages' },
                  { label: 'Exam Page' }
                ]}
                className="mb-2"
              />
              <h1 className="text-2xl font-bold text-gray-900">Exam Page - Popular Tests</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage the popular mock test series section on the exams page
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/pages')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pages
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search and Add Section */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Add Popular Test</h2>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Exams
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by exam name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={searching || !searchQuery.trim()}>
                  {searching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-6 space-y-2 max-h-96 overflow-y-auto">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Search Results</h3>
                  {searchResults.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {exam.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {exam.category || 'Uncategorized'}
                            {exam.subcategory ? ` • ${exam.subcategory}` : ''}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-gray-600">
                            {exam.exam_type && (
                              <span className="px-2 py-0.5 rounded-full border border-gray-200 bg-white">
                                {exam.exam_type.replace(/_/g, ' ')}
                              </span>
                            )}
                            {exam.difficulty && (
                              <span className="px-2 py-0.5 rounded-full border border-gray-200 bg-white capitalize">
                                {exam.difficulty}
                              </span>
                            )}
                            {typeof exam.total_questions === 'number' && exam.total_questions > 0 && (
                              <span className="px-2 py-0.5 rounded-full border border-gray-200 bg-white">
                                {exam.total_questions} questions
                              </span>
                            )}
                            {exam.duration && (
                              <span className="px-2 py-0.5 rounded-full border border-gray-200 bg-white">
                                {exam.duration} mins
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full border ${exam.is_premium ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                              {exam.is_premium ? 'Premium' : 'Free'}
                            </span>
                            {(() => {
                              const rawStatus = (exam.status as string) || 'unknown';
                              const normalized = rawStatus.toLowerCase() as 'upcoming' | 'ongoing' | 'completed' | 'anytime';
                              const statusStyles: Record<string, string> = {
                                upcoming: 'border-blue-200 bg-blue-50 text-blue-700',
                                ongoing: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                                completed: 'border-gray-200 bg-gray-50 text-gray-600',
                                anytime: 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              };

                              return (
                                <span className={`px-2 py-0.5 rounded-full border ${statusStyles[normalized] || 'border-gray-200 bg-white text-gray-600'}`}>
                                  {rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddTest(exam)}
                          disabled={isExamAlreadyAdded(exam.id)}
                        >
                          {isExamAlreadyAdded(exam.id) ? 'Added' : <Plus className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Popular Tests List */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Popular Tests ({popularTests.length})</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Drag to reorder • Click eye icon to toggle visibility
                  </p>
                </div>
                {saving && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </div>
                )}
              </div>

              {popularTests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-medium mb-2">No popular tests added yet</p>
                  <p className="text-sm">Search and add exams to get started</p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="popular-tests">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {popularTests.map((test, index) => (
                          <Draggable key={test.id} draggableId={test.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-4 border border-gray-200 rounded-lg bg-white ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                } ${!test.isActive ? 'opacity-50' : ''}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-1 cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">
                                          {test.exam.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                          {test.exam.category} • {test.exam.subcategory}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                          <span>{test.exam.total_questions} questions</span>
                                          <span>{test.exam.duration} mins</span>
                                          <span className="capitalize">{test.exam.difficulty}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleToggleStatus(test.id, test.isActive)}
                                        >
                                          {test.isActive ? (
                                            <Eye className="w-4 h-4" />
                                          ) : (
                                            <EyeOff className="w-4 h-4" />
                                          )}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleRemoveTest(test.id)}
                                        >
                                          <Trash2 className="w-4 h-4 text-red-600" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </Card>
          </div>
        </div>

        {/* New Test Series For You Management Section */}
        <div className="mt-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">New Test Series For You</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage the new test series section shown on the exams page
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Search and Add Section */}
              <div className="lg:col-span-1">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-md font-semibold mb-4">Add Test</h3>
                  <form onSubmit={handleNewTestSeriesSearch} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Exams
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search by exam name..."
                          value={newTestSeriesSearchQuery}
                          onChange={(e) => setNewTestSeriesSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={newTestSeriesSearching || !newTestSeriesSearchQuery.trim()}>
                      {newTestSeriesSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </form>

                  {newTestSeriesSearchResults.length > 0 && (
                    <div className="mt-6 space-y-2 max-h-96 overflow-y-auto">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Search Results</h4>
                      {newTestSeriesSearchResults.map((exam) => (
                        <div
                          key={exam.id}
                          className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">
                                {exam.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {exam.category || 'Uncategorized'}
                                {exam.subcategory ? ` • ${exam.subcategory}` : ''}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddNewTestSeries(exam)}
                              disabled={isExamAlreadyAddedToNewSeries(exam.id)}
                            >
                              {isExamAlreadyAddedToNewSeries(exam.id) ? 'Added' : <Plus className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* New Test Series List */}
              <div className="lg:col-span-2">
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-md font-semibold">Test Series ({newTestSeries.length})</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Drag to reorder • Click eye icon to toggle visibility
                      </p>
                    </div>
                    {newTestSeriesSaving && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </div>
                    )}
                  </div>

                  {newTestSeries.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-lg font-medium mb-2">No test series added yet</p>
                      <p className="text-sm">Search and add exams to get started</p>
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={handleNewTestSeriesDragEnd}>
                      <Droppable droppableId="new-test-series">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="space-y-3"
                          >
                            {newTestSeries.map((test, index) => (
                              <Draggable key={test.id} draggableId={test.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex items-start gap-4">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing"
                                      >
                                        <GripVertical className="w-5 h-5 text-gray-400" />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-gray-900">
                                          {test.exam.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {test.exam.category || 'Uncategorized'}
                                          {test.exam.subcategory ? ` • ${test.exam.subcategory}` : ''}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleToggleNewTestSeriesStatus(test.id, test.isActive)}
                                        >
                                          {test.isActive ? (
                                            <Eye className="w-4 h-4 text-green-600" />
                                          ) : (
                                            <EyeOff className="w-4 h-4 text-gray-400" />
                                          )}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleRemoveNewTestSeries(test.id)}
                                        >
                                          <Trash2 className="w-4 h-4 text-red-600" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Testimonials Management Section */}
        <div className="mt-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Testimonials</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Review, highlight, and publish testimonials submitted by users
                </p>
              </div>
            </div>

            {testimonialsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium mb-2">No testimonials yet</p>
                <p className="text-sm">They will appear here as soon as users submit feedback</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testimonials.map(testimonial => (
                  <div
                    key={testimonial.id}
                    className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {testimonial.user?.name || 'Unknown User'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {testimonial.user?.email || 'No email provided'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-amber-500 ml-2">
                            {Array.from({ length: 5 }).map((_, index) =>
                              index < testimonial.rating ? (
                                <Star key={index} className="w-4 h-4 fill-current" />
                              ) : (
                                <StarOff key={index} className="w-4 h-4 text-gray-300" />
                              )
                            )}
                          </div>
                        </div>
                        {testimonial.title && (
                          <p className="text-sm font-medium text-gray-800 mb-1">{testimonial.title}</p>
                        )}
                        <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-3">
                          {testimonial.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant={testimonial.highlight ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            handleToggleTestimonialFlag(testimonial.id, {
                              highlight: !testimonial.highlight
                            })
                          }
                          disabled={testimonialsUpdating === testimonial.id}
                        >
                          {testimonial.highlight ? (
                            <>
                              <Star className="w-4 h-4 mr-2" />
                              Highlighted
                            </>
                          ) : (
                            <>
                              <Star className="w-4 h-4 mr-2 text-gray-500" />
                              Highlight
                            </>
                          )}
                        </Button>

                        <Button
                          variant={testimonial.isPublished ? 'outline' : 'secondary'}
                          size="sm"
                          onClick={() =>
                            handleToggleTestimonialFlag(testimonial.id, {
                              isPublished: !testimonial.isPublished
                            })
                          }
                          disabled={testimonialsUpdating === testimonial.id}
                        >
                          {testimonial.isPublished ? (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4 mr-2" />
                              Hidden
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Banner Management Section */}
        <div className="mt-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Dynamic Banner</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage the tappable banner shown after Anytime Exams section
                </p>
              </div>
            </div>

            {bannersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Existing Banners */}
                {banners.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Current Banners</h3>
                    {banners.map((banner) => (
                      <div key={banner.id} className="border border-gray-200 rounded-lg p-4 flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {banner.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={banner.image_url}
                              alt={banner.alt_text || 'Banner'}
                              className="w-32 h-20 object-cover rounded border border-gray-200"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {banner.link_url || 'No link'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {banner.alt_text || 'No alt text'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {banner.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditBanner(banner)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBanner(banner.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Banner Form */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">
                    {editingBanner ? 'Edit Banner' : 'Add New Banner'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Banner Image
                      </label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleBannerImageUpload(file);
                          }}
                          disabled={bannerUploading}
                        />
                        {bannerUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                      </div>
                      {bannerForm.imageUrl && (
                        <div className="mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={bannerForm.imageUrl}
                            alt="Preview"
                            className="w-48 h-32 object-cover rounded border border-gray-200"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Link URL (optional)
                      </label>
                      <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="https://example.com"
                          value={bannerForm.linkUrl}
                          onChange={(e) => setBannerForm(prev => ({ ...prev, linkUrl: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alt Text (optional)
                      </label>
                      <Input
                        type="text"
                        placeholder="Describe the banner image"
                        value={bannerForm.altText}
                        onChange={(e) => setBannerForm(prev => ({ ...prev, altText: e.target.value }))}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Button onClick={handleSaveBanner} disabled={!bannerForm.imageUrl}>
                        <Save className="w-4 h-4 mr-2" />
                        {editingBanner ? 'Update Banner' : 'Create Banner'}
                      </Button>
                      {editingBanner && (
                        <Button variant="outline" onClick={handleCancelBannerEdit}>
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
