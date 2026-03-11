"use client";

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import { Plus, Trash2, Save, Eye, EyeOff, GripVertical, Edit2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  subscriptionPageService,
  SubscriptionPageSection,
  SubscriptionPageBlock,
  SubscriptionPageMeta,
} from '@/lib/api/subscriptionPageService';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero Section' },
  { value: 'featured', label: 'Featured Benefits' },
  { value: 'categories', label: 'Exam Categories' },
  { value: 'curriculum', label: 'Course Curriculum' },
  { value: 'curriculum_banners', label: 'Curriculum Banners' },
  { value: 'banners', label: 'Attractive Banners' },
  { value: 'why_us', label: 'Why Bharat Mock' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'faq', label: 'FAQ Section' },
  { value: 'custom', label: 'Custom Section' },
];

const BLOCK_TYPES = [
  { value: 'feature_item', label: 'Feature Item' },
  { value: 'category_item', label: 'Category Item' },
  { value: 'curriculum_item', label: 'Curriculum Item' },
  { value: 'curriculum_banner', label: 'Curriculum Banner' },
  { value: 'banner', label: 'Banner' },
  { value: 'benefit_item', label: 'Benefit Item' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'faq_item', label: 'FAQ Item' },
  { value: 'stat', label: 'Statistic' },
  { value: 'image', label: 'Image' },
  { value: 'text', label: 'Text Block' },
];

const ICON_OPTIONS: string[] = [
  'Activity', 'Award', 'Bell', 'BookOpen', 'Brain', 'Briefcase', 'Calendar', 'Camera', 'CheckCircle',
  'Clock', 'Compass', 'Copy', 'CreditCard', 'Database', 'FileText', 'Filter', 'Flag', 'Folder',
  'Globe', 'Grid', 'Headphones', 'Heart', 'HelpCircle', 'Home', 'Layers', 'Lightbulb', 'LineChart',
  'ListChecks', 'Lock', 'Map', 'Megaphone', 'MessageSquare', 'Monitor', 'PieChart', 'PlayCircle',
  'Rocket', 'Shield', 'ShoppingBag', 'Star', 'Target', 'ThumbsUp', 'Trophy', 'TrendingUp', 'Truck',
  'Users', 'Wifi', 'Zap', 'Sparkles', 'GraduationCap', 'Server', 'ClipboardCheck'
];

type LucideIconComponent = React.ComponentType<{ className?: string }>

const lucideIconRegistry = LucideIcons as unknown as Record<string, LucideIconComponent>;

export default function SubscriptionPageAdminPage() {
  const [sections, setSections] = useState<SubscriptionPageSection[]>([]);
  const [meta, setMeta] = useState<SubscriptionPageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [blockImageUploading, setBlockImageUploading] = useState(false);

  const [editingSection, setEditingSection] = useState<SubscriptionPageSection | null>(null);
  const [editingBlock, setEditingBlock] = useState<SubscriptionPageBlock | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showMetaDialog, setShowMetaDialog] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const heroImageInputRef = useRef<HTMLInputElement | null>(null);
  const blockImageInputRef = useRef<HTMLInputElement | null>(null);

  const getIconComponent = (iconName?: string | null) => {
    if (!iconName) return null;
    return lucideIconRegistry[iconName] ?? null;
  };

  const getDefaultBlockTypeForSection = (sectionType?: string) => {
    switch (sectionType) {
      case 'featured':
        return 'feature_item';
      case 'categories':
        return 'category_item';
      case 'curriculum':
        return 'curriculum_item';
      case 'curriculum_banners':
        return 'curriculum_banner';
      case 'banners':
        return 'banner';
      case 'why_us':
        return 'benefit_item';
      case 'faq':
        return 'faq_item';
      default:
        return 'text';
    }
  };

  const handleBlockImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingBlock) {
      event.target.value = '';
      return;
    }

    setBlockImageUploading(true);
    try {
      const isBanner = editingBlock.block_type?.includes('banner');
      const folder = isBanner ? 'subscription-page/banners' : 'subscription-page/blocks';
      const upload = await subscriptionPageService.uploadMedia(file, folder);
      setEditingBlock((prev) => (prev ? { ...prev, image_url: upload.file_url } : prev));
      toast.success('Block image uploaded');
    } catch (error: any) {
      console.error('Failed to upload block image:', error);
      toast.error(error?.message || 'Failed to upload block image');
    } finally {
      setBlockImageUploading(false);
      event.target.value = '';
    }
  };

  const handleSelectIcon = (iconName: string) => {
    if (!editingBlock) return;
    setEditingBlock((prev) => (prev ? { ...prev, icon: iconName } : prev));
    setIconPickerOpen(false);
  };

  useEffect(() => {
    loadPageContent();
  }, []);

  const loadPageContent = async () => {
    setLoading(true);
    try {
      const data = await subscriptionPageService.getPageContent();
      setSections(data.sections);
      setMeta(data.meta);
    } catch (error: any) {
      console.error('Failed to load subscription page content:', error);
      toast.error(error.message || 'Failed to load page content');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = () => {
    setEditingSection({
      id: '',
      section_key: '',
      section_type: 'custom',
      title: '',
      subtitle: '',
      description: '',
      background_color: '',
      text_color: '',
      display_order: sections.length,
      is_active: true,
      settings: {},
      blocks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setShowSectionDialog(true);
  };

  const handleEditSection = (section: SubscriptionPageSection) => {
    setEditingSection({ ...section, settings: section.settings || {} });
    setShowSectionDialog(true);
  };

  const updateEditingSectionSettings = (updates: Record<string, any>) => {
    setEditingSection((prev) =>
      prev
        ? {
            ...prev,
            settings: {
              ...(prev.settings || {}),
              ...updates
            }
          }
        : prev
    );
  };

  const handleHeroImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingSection) {
      event.target.value = '';
      return;
    }

    setHeroImageUploading(true);
    try {
      const upload = await subscriptionPageService.uploadMedia(file, 'subscription-page/hero');
      updateEditingSectionSettings({
        hero_image_url: upload.file_url,
        hero_image_alt: editingSection.settings?.hero_image_alt || file.name
      });
      toast.success('Hero image uploaded');
    } catch (error: any) {
      console.error('Failed to upload hero image:', error);
      toast.error(error?.message || 'Failed to upload hero image');
    } finally {
      setHeroImageUploading(false);
      event.target.value = '';
    }
  };

  const handleSaveSection = async () => {
    if (!editingSection) return;

    setSaving(true);
    try {
      if (editingSection.id) {
        await subscriptionPageService.updateSection(editingSection.id, editingSection);
        toast.success('Section updated successfully');
      } else {
        await subscriptionPageService.createSection(editingSection);
        toast.success('Section created successfully');
      }
      await loadPageContent();
      setShowSectionDialog(false);
      setEditingSection(null);
    } catch (error: any) {
      console.error('Failed to save section:', error);
      toast.error(error.message || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    setSaving(true);
    try {
      await subscriptionPageService.deleteSection(id);
      toast.success('Section deleted successfully');
      await loadPageContent();
    } catch (error: any) {
      console.error('Failed to delete section:', error);
      toast.error(error.message || 'Failed to delete section');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBlock = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    const defaultBlockType = getDefaultBlockTypeForSection(section?.section_type);
    setEditingSectionId(sectionId);
    setEditingBlock({
      id: '',
      section_id: sectionId,
      block_type: defaultBlockType,
      title: '',
      content: '',
      icon: '',
      image_url: '',
      link_url: '',
      link_text: '',
      display_order: section?.blocks?.length || 0,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setShowBlockDialog(true);
  };

  const handleEditBlock = (block: SubscriptionPageBlock) => {
    setEditingBlock({ ...block });
    setEditingSectionId(block.section_id);
    setShowBlockDialog(true);
  };

  const handleSaveBlock = async () => {
    if (!editingBlock) return;

    setSaving(true);
    try {
      if (editingBlock.id) {
        await subscriptionPageService.updateBlock(editingBlock.id, editingBlock);
        toast.success('Block updated successfully');
      } else {
        await subscriptionPageService.createBlock(editingBlock);
        toast.success('Block created successfully');
      }
      await loadPageContent();
      setShowBlockDialog(false);
      setEditingBlock(null);
      setEditingSectionId(null);
    } catch (error: any) {
      console.error('Failed to save block:', error);
      toast.error(error.message || 'Failed to save block');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm('Are you sure you want to delete this block?')) return;

    setSaving(true);
    try {
      await subscriptionPageService.deleteBlock(id);
      toast.success('Block deleted successfully');
      await loadPageContent();
    } catch (error: any) {
      console.error('Failed to delete block:', error);
      toast.error(error.message || 'Failed to delete block');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeta = async () => {
    if (!meta) return;

    setSaving(true);
    try {
      await subscriptionPageService.updateMeta(meta);
      toast.success('SEO metadata updated successfully');
      setShowMetaDialog(false);
    } catch (error: any) {
      console.error('Failed to save metadata:', error);
      toast.error(error.message || 'Failed to save metadata');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription page content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Breadcrumbs 
            items={[
              AdminBreadcrumb(),
              { label: 'Subscription Page' }
            ]}
            className="mb-3"
          />
          <h1 className="text-3xl font-bold text-gray-900">Subscription Page Editor</h1>
          <p className="text-gray-600 mt-2">Manage all content on the subscription landing page</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowMetaDialog(true)}>
            Edit SEO Meta
          </Button>
          <Button onClick={handleCreateSection}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.id} className="border-2">
            <CardHeader className="bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {section.title || section.section_key}
                      {!section.is_active && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          Hidden
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {section.section_type} • Order: {section.display_order}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEditSection(section)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSection(section.id)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {section.subtitle && (
                <p className="text-sm text-gray-600 mb-4">{section.subtitle}</p>
              )}
              {section.description && (
                <p className="text-sm text-gray-700 mb-4">{section.description}</p>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm text-gray-700">
                    Content Blocks ({section.blocks?.length || 0})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCreateBlock(section.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Block
                  </Button>
                </div>

                {section.blocks && section.blocks.length > 0 ? (
                  <div className="space-y-2">
                    {section.blocks.map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{block.title || 'Untitled Block'}</p>
                          <p className="text-xs text-gray-500">
                            {block.block_type} • Order: {block.display_order}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditBlock(block)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBlock(block.id)}
                            disabled={saving}
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No blocks yet. Add one to get started.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {sections.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">No sections found. Create your first section to get started.</p>
              <Button onClick={handleCreateSection}>
                <Plus className="h-4 w-4 mr-2" />
                Create Section
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection?.id ? 'Edit Section' : 'Create Section'}
            </DialogTitle>
            <DialogDescription>
              Configure the section details and styling
            </DialogDescription>
          </DialogHeader>

          {editingSection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="section_key">Section Key *</Label>
                  <Input
                    id="section_key"
                    value={editingSection.section_key}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, section_key: e.target.value })
                    }
                    placeholder="e.g., hero, features"
                  />
                </div>
                <div>
                  <Label htmlFor="section_type">Section Type *</Label>
                  <Select
                    value={editingSection.section_type}
                    onValueChange={(value) =>
                      setEditingSection({ ...editingSection, section_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editingSection.title || ''}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, title: e.target.value })
                  }
                  placeholder="Section title"
                />
              </div>

              <div>
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={editingSection.subtitle || ''}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, subtitle: e.target.value })
                  }
                  placeholder="Section subtitle"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingSection.description || ''}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, description: e.target.value })
                  }
                  placeholder="Section description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={editingSection.display_order}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="background_color">Background Color</Label>
                  <Input
                    id="background_color"
                    value={editingSection.background_color || ''}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, background_color: e.target.value })
                    }
                    placeholder="#ffffff"
                  />
                </div>
                <div>
                  <Label htmlFor="text_color">Text Color</Label>
                  <Input
                    id="text_color"
                    value={editingSection.text_color || ''}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, text_color: e.target.value })
                    }
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={editingSection.is_active}
                  onCheckedChange={(checked) =>
                    setEditingSection({ ...editingSection, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Section is active (visible on page)</Label>
              </div>

              {editingSection.section_type === 'hero' && (
                <div className="space-y-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4">
                  <div>
                    <Label>Hero Image URL</Label>
                    <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
                      <Input
                        value={editingSection.settings?.hero_image_url || ''}
                        onChange={(e) =>
                          updateEditingSectionSettings({ hero_image_url: e.target.value })
                        }
                        placeholder="https://..."
                      />
                      <div className="flex items-center gap-2">
                        <input
                          ref={heroImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleHeroImageUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => heroImageInputRef.current?.click()}
                          disabled={heroImageUploading}
                        >
                          {heroImageUploading ? 'Uploading…' : 'Upload Image'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Hero Image Alt Text</Label>
                    <Input
                      className="mt-2"
                      value={editingSection.settings?.hero_image_alt || ''}
                      onChange={(e) =>
                        updateEditingSectionSettings({ hero_image_alt: e.target.value })
                      }
                      placeholder="Describe the hero illustration"
                    />
                  </div>
                  {editingSection.settings?.hero_image_url && (
                    <div className="rounded-lg border bg-white p-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">Preview</p>
                      <img
                        src={editingSection.settings.hero_image_url}
                        alt={editingSection.settings?.hero_image_alt || 'Hero preview'}
                        className="w-full rounded-md object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSection} disabled={saving}>
              {saving ? 'Saving...' : 'Save Section'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBlock?.id ? 'Edit Block' : 'Create Block'}</DialogTitle>
            <DialogDescription>Configure the block content and settings</DialogDescription>
          </DialogHeader>

          {editingBlock && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="block_type">Block Type *</Label>
                  <Select
                    value={editingBlock.block_type}
                    onValueChange={(value) =>
                      setEditingBlock({ ...editingBlock, block_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCK_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="display_order_block">Display Order</Label>
                  <Input
                    id="display_order_block"
                    type="number"
                    value={editingBlock.display_order}
                    onChange={(e) =>
                      setEditingBlock({
                        ...editingBlock,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="block_title">Title</Label>
                <Input
                  id="block_title"
                  value={editingBlock.title || ''}
                  onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
                  placeholder="Block title"
                />
              </div>

              <div>
                <Label htmlFor="block_content">Content</Label>
                <Textarea
                  id="block_content"
                  value={editingBlock.content || ''}
                  onChange={(e) => setEditingBlock({ ...editingBlock, content: e.target.value })}
                  placeholder="Block content"
                  rows={4}
                />
                {editingBlock.block_type === 'curriculum_banner' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Leave the title or content empty to render a pure image banner.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="icon">Icon</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="icon"
                      value={editingBlock.icon || ''}
                      onChange={(e) => setEditingBlock({ ...editingBlock, icon: e.target.value })}
                      placeholder="Start typing or pick below"
                    />
                    <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="h-11 w-12 p-0">
                          {(() => {
                            const IconComp = getIconComponent(editingBlock.icon);
                            if (IconComp) {
                              return <IconComp className="h-5 w-5" />;
                            }
                            return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
                          })()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 bg-white text-foreground shadow-xl" align="end">
                        <p className="text-xs text-muted-foreground mb-2">Pick an icon (Lucide)</p>
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                          {ICON_OPTIONS.map((iconName) => {
                            const IconComp = getIconComponent(iconName);
                            return (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => handleSelectIcon(iconName)}
                                className={cn(
                                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-left hover:bg-muted transition',
                                  editingBlock.icon === iconName ? 'border-primary bg-primary/5' : 'border-border'
                                )}
                              >
                                {IconComp ? <IconComp className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
                                <span className="text-sm font-medium">{iconName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div>
                  <Label htmlFor="image_url">Image URL</Label>
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        id="image_url"
                        className="flex-1"
                        value={editingBlock.image_url || ''}
                        onChange={(e) =>
                          setEditingBlock({ ...editingBlock, image_url: e.target.value })
                        }
                        placeholder="https://..."
                      />
                      <input
                        ref={blockImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBlockImageUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => blockImageInputRef.current?.click()}
                        disabled={blockImageUploading}
                      >
                        {blockImageUploading ? 'Uploading…' : 'Upload'}
                      </Button>
                    </div>
                    {editingBlock.image_url && (
                      <div className="rounded-lg border bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={editingBlock.image_url}
                          alt={editingBlock.title || 'Banner preview'}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="link_url">Link URL</Label>
                  <Input
                    id="link_url"
                    value={editingBlock.link_url || ''}
                    onChange={(e) => setEditingBlock({ ...editingBlock, link_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="link_text">Link Text</Label>
                  <Input
                    id="link_text"
                    value={editingBlock.link_text || ''}
                    onChange={(e) =>
                      setEditingBlock({ ...editingBlock, link_text: e.target.value })
                    }
                    placeholder="Learn more"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBlock} disabled={saving}>
              {saving ? 'Saving...' : 'Save Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMetaDialog} onOpenChange={setShowMetaDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>SEO Metadata</DialogTitle>
            <DialogDescription>
              Configure SEO and social sharing metadata for the subscription page
            </DialogDescription>
          </DialogHeader>

          {meta && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={meta.meta_title || ''}
                  onChange={(e) => setMeta({ ...meta, meta_title: e.target.value })}
                  placeholder="Page title for search engines"
                />
              </div>

              <div>
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={meta.meta_description || ''}
                  onChange={(e) => setMeta({ ...meta, meta_description: e.target.value })}
                  placeholder="Page description for search engines"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="meta_keywords">Meta Keywords</Label>
                <Input
                  id="meta_keywords"
                  value={meta.meta_keywords || ''}
                  onChange={(e) => setMeta({ ...meta, meta_keywords: e.target.value })}
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>

              <div>
                <Label htmlFor="og_title">Open Graph Title</Label>
                <Input
                  id="og_title"
                  value={meta.og_title || ''}
                  onChange={(e) => setMeta({ ...meta, og_title: e.target.value })}
                  placeholder="Title for social media sharing"
                />
              </div>

              <div>
                <Label htmlFor="og_description">Open Graph Description</Label>
                <Textarea
                  id="og_description"
                  value={meta.og_description || ''}
                  onChange={(e) => setMeta({ ...meta, og_description: e.target.value })}
                  placeholder="Description for social media sharing"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="og_image">Open Graph Image URL</Label>
                <Input
                  id="og_image"
                  value={meta.og_image || ''}
                  onChange={(e) => setMeta({ ...meta, og_image: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="canonical_url">Canonical URL</Label>
                <Input
                  id="canonical_url"
                  value={meta.canonical_url || ''}
                  onChange={(e) => setMeta({ ...meta, canonical_url: e.target.value })}
                  placeholder="https://www.bharatmock.com/subscriptions"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMetaDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMeta} disabled={saving}>
              {saving ? 'Saving...' : 'Save Metadata'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
