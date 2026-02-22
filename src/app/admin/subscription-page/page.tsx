"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Eye, EyeOff, GripVertical, Edit2 } from 'lucide-react';
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

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero Section' },
  { value: 'features', label: 'Features Section' },
  { value: 'benefits', label: 'Benefits Section' },
  { value: 'testimonials', label: 'Testimonials Section' },
  { value: 'faq', label: 'FAQ Section' },
  { value: 'pricing_intro', label: 'Pricing Introduction' },
  { value: 'cta', label: 'Call to Action' },
  { value: 'custom', label: 'Custom Section' },
];

const BLOCK_TYPES = [
  { value: 'feature_item', label: 'Feature Item' },
  { value: 'benefit_item', label: 'Benefit Item' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'faq_item', label: 'FAQ Item' },
  { value: 'stat', label: 'Statistic' },
  { value: 'image', label: 'Image' },
  { value: 'text', label: 'Text Block' },
];

export default function SubscriptionPageAdminPage() {
  const [sections, setSections] = useState<SubscriptionPageSection[]>([]);
  const [meta, setMeta] = useState<SubscriptionPageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingSection, setEditingSection] = useState<SubscriptionPageSection | null>(null);
  const [editingBlock, setEditingBlock] = useState<SubscriptionPageBlock | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showMetaDialog, setShowMetaDialog] = useState(false);

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
    setEditingSection({ ...section });
    setShowSectionDialog(true);
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
    setEditingSectionId(sectionId);
    setEditingBlock({
      id: '',
      section_id: sectionId,
      block_type: 'feature_item',
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="icon">Icon (Lucide name)</Label>
                  <Input
                    id="icon"
                    value={editingBlock.icon || ''}
                    onChange={(e) => setEditingBlock({ ...editingBlock, icon: e.target.value })}
                    placeholder="e.g., Sparkles, Check"
                  />
                </div>
                <div>
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={editingBlock.image_url || ''}
                    onChange={(e) =>
                      setEditingBlock({ ...editingBlock, image_url: e.target.value })
                    }
                    placeholder="https://..."
                  />
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
