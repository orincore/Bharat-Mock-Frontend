"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  GripVertical,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Trash2
} from 'lucide-react';

import { adminService } from '@/lib/api/adminService';
import { fallbackPrivacyPolicy } from '@/lib/constants/privacy';
import {
  PrivacyPolicyContent,
  PrivacyPolicyData,
  PrivacyPolicyPoint,
  PrivacyPolicySection
} from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

interface UIListItem {
  localId: string;
  term?: string;
  text?: string;
}

interface UIPoint extends Omit<PrivacyPolicyPoint, 'list_items'> {
  localId: string;
  sectionLocalId: string;
  listItems: UIListItem[];
}

interface UISection extends Omit<PrivacyPolicySection, 'points'> {
  localId: string;
  points: UIPoint[];
}

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toListItems = (items?: PrivacyPolicyPoint['list_items']): UIListItem[] =>
  (items || []).map((item) =>
    typeof item === 'string'
      ? { localId: createId(), text: item }
      : { localId: createId(), term: item.term, text: item.text }
  );

const serializeListItems = (items: UIListItem[]) =>
  items
    .map((item) => {
      const term = item.term?.trim();
      const text = item.text?.trim();
      if (term) {
        return { term, text: text || '' };
      }
      return text || '';
    })
    .filter((entry) => {
      if (typeof entry === 'string') {
        return entry.length > 0;
      }
      return Boolean(entry.term) || Boolean(entry.text);
    });

const deserializeSections = (data: PrivacyPolicyData): UISection[] => {
  const sourceSections = data.sections?.length ? data.sections : fallbackPrivacyPolicy.sections;
  return sourceSections.map((section, sectionIndex) => {
    const localId = createId();
    return {
      ...section,
      localId,
      display_order: section.display_order ?? sectionIndex,
      points: (section.points || []).map((point, pointIndex) => ({
        ...point,
        localId: createId(),
        sectionLocalId: localId,
        section_id: point.section_id ?? section.id,
        display_order: point.display_order ?? pointIndex,
        listItems: toListItems(point.list_items)
      }))
    };
  });
};

const moveItem = <T,>(items: T[], from: number, to: number): T[] => {
  const updated = [...items];
  const [moved] = updated.splice(from, 1);
  updated.splice(to, 0, moved);
  return updated;
};

const SectionCard = ({
  section,
  index,
  total,
  onSectionChange,
  onSectionVisibility,
  onRemoveSection,
  onReorderSection,
  onAddPoint,
  onPointChange,
  onPointVisibility,
  onRemovePoint,
  onReorderPoint,
  onAddListItem,
  onListItemChange,
  onRemoveListItem
}: {
  section: UISection;
  index: number;
  total: number;
  onSectionChange: (localId: string, field: keyof PrivacyPolicySection, value: string) => void;
  onSectionVisibility: (localId: string, value: boolean) => void;
  onRemoveSection: (localId: string) => void;
  onReorderSection: (from: number, to: number) => void;
  onAddPoint: (sectionLocalId: string) => void;
  onPointChange: (sectionLocalId: string, pointLocalId: string, field: keyof PrivacyPolicyPoint, value: string) => void;
  onPointVisibility: (sectionLocalId: string, pointLocalId: string, value: boolean) => void;
  onRemovePoint: (sectionLocalId: string, pointLocalId: string) => void;
  onReorderPoint: (sectionLocalId: string, from: number, to: number) => void;
  onAddListItem: (sectionLocalId: string, pointLocalId: string) => void;
  onListItemChange: (
    sectionLocalId: string,
    pointLocalId: string,
    listItemLocalId: string,
    field: keyof Omit<UIListItem, 'localId'>,
    value: string
  ) => void;
  onRemoveListItem: (sectionLocalId: string, pointLocalId: string, listItemLocalId: string) => void;
}) => (
  <Card className="p-5 space-y-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">{section.title || `Section ${index + 1}`}</h3>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id={`section-visible-${section.localId}`}
            checked={section.is_active !== false}
            onCheckedChange={(checked) => onSectionVisibility(section.localId, checked)}
          />
          <Label htmlFor={`section-visible-${section.localId}`} className="text-sm">
            {section.is_active === false ? 'Hidden' : 'Visible'}
          </Label>
        </div>
        <div className="inline-flex flex-col text-xs text-muted-foreground">
          <button
            type="button"
            disabled={index === 0}
            className="hover:text-primary disabled:opacity-30"
            onClick={() => onReorderSection(index, index - 1)}
            aria-label="Move section up"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            className="hover:text-primary disabled:opacity-30"
            onClick={() => onReorderSection(index, index + 1)}
            aria-label="Move section down"
          >
            ↓
          </button>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveSection(section.localId)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={section.title}
          onChange={(e) => onSectionChange(section.localId, 'title', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          rows={3}
          value={section.description || ''}
          onChange={(e) => onSectionChange(section.localId, 'description', e.target.value)}
        />
      </div>
    </div>

    <div className="border border-dashed border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Points ({section.points.length})</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => onAddPoint(section.localId)}>
          <Plus className="h-4 w-4 mr-1" /> Add Point
        </Button>
      </div>

      {section.points.length === 0 ? (
        <p className="text-sm text-muted-foreground">No points added yet.</p>
      ) : (
        <div className="space-y-3">
          {section.points.map((point, pointIndex) => (
            <div key={point.localId} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <p className="font-semibold">{point.heading || `Point ${pointIndex + 1}`}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex flex-col text-xs text-muted-foreground">
                    <button
                      type="button"
                      disabled={pointIndex === 0}
                      className="hover:text-primary disabled:opacity-30"
                      onClick={() => onReorderPoint(section.localId, pointIndex, pointIndex - 1)}
                      aria-label="Move point up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={pointIndex === section.points.length - 1}
                      className="hover:text-primary disabled:opacity-30"
                      onClick={() => onReorderPoint(section.localId, pointIndex, pointIndex + 1)}
                      aria-label="Move point down"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`point-visible-${point.localId}`}
                      checked={point.is_active !== false}
                      onCheckedChange={(checked) => onPointVisibility(section.localId, point.localId, checked)}
                    />
                    <Label htmlFor={`point-visible-${point.localId}`} className="text-sm">
                      {point.is_active === false ? 'Hidden' : 'Visible'}
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemovePoint(section.localId, point.localId)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Heading</Label>
                <Input
                  value={point.heading || ''}
                  onChange={(e) => onPointChange(section.localId, point.localId, 'heading', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  rows={4}
                  value={point.body || ''}
                  onChange={(e) => onPointChange(section.localId, point.localId, 'body', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>List Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onAddListItem(section.localId, point.localId)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
                {point.listItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No list items.</p>
                ) : (
                  <div className="space-y-3">
                    {point.listItems.map((item) => (
                      <div key={item.localId} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-start">
                        <Input
                          placeholder="Term (optional)"
                          value={item.term || ''}
                          onChange={(e) =>
                            onListItemChange(section.localId, point.localId, item.localId, 'term', e.target.value)
                          }
                        />
                        <Input
                          placeholder="Description"
                          value={item.text || ''}
                          onChange={(e) =>
                            onListItemChange(section.localId, point.localId, item.localId, 'text', e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveListItem(section.localId, point.localId, item.localId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </Card>
);

export default function PrivacyAdminPage() {
  const { toast } = useToast();
  const [content, setContent] = useState<PrivacyPolicyContent>(fallbackPrivacyPolicy.content!);
  const [sections, setSections] = useState<UISection[]>([]);
  const [deletedSectionIds, setDeletedSectionIds] = useState<string[]>([]);
  const [deletedPointIds, setDeletedPointIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hydrate = (data: PrivacyPolicyData) => {
    setContent(data.content ?? fallbackPrivacyPolicy.content!);
    setSections(deserializeSections(data));
    setDeletedSectionIds([]);
    setDeletedPointIds([]);
  };

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const data = await adminService.getPrivacyPolicyAdmin();
      hydrate(data);
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Unable to load Privacy Policy',
        description: error?.message || 'Loaded fallback data instead.',
        variant: 'destructive'
      });
      hydrate(fallbackPrivacyPolicy);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sectionTabs = useMemo(
    () => [
      { key: 'content', label: 'Overview' },
      { key: 'sections', label: `Sections (${sections.length})` }
    ],
    [sections.length]
  );

  const updateSection = (
    localId: string,
    updater: (section: UISection) => UISection
  ) => {
    setSections((prev) => prev.map((section) => (section.localId === localId ? updater(section) : section)));
  };

  const updatePoint = (
    sectionLocalId: string,
    pointLocalId: string,
    updater: (point: UIPoint) => UIPoint
  ) => {
    updateSection(sectionLocalId, (section) => ({
      ...section,
      points: section.points.map((point) => (point.localId === pointLocalId ? updater(point) : point))
    }));
  };

  const addSection = () => {
    setSections((prev) => (
      [
        ...prev,
        {
          localId: createId(),
          title: 'New Section',
          description: '',
          display_order: prev.length,
          is_active: true,
          points: []
        }
      ]
    ));
  };

  const removeSection = (localId: string) => {
    setSections((prev) => {
      const target = prev.find((section) => section.localId === localId);
      if (target?.id) {
        setDeletedSectionIds((ids) => [...ids, target.id as string]);
        const pointIds = target.points.map((point) => point.id).filter(Boolean) as string[];
        if (pointIds.length) {
          setDeletedPointIds((ids) => [...ids, ...pointIds]);
        }
      }
      return prev.filter((section) => section.localId !== localId);
    });
  };

  const reorderSections = (from: number, to: number) => {
    setSections((prev) => moveItem(prev, from, to));
  };

  const addPoint = (sectionLocalId: string) => {
    updateSection(sectionLocalId, (section) => ({
      ...section,
      points: [
        ...section.points,
        {
          localId: createId(),
          sectionLocalId,
          section_id: section.id,
          heading: 'New Point',
          body: '',
          display_order: section.points.length,
          is_active: true,
          listItems: []
        }
      ]
    }));
  };

  const removePoint = (sectionLocalId: string, pointLocalId: string) => {
    updateSection(sectionLocalId, (section) => {
      const point = section.points.find((p) => p.localId === pointLocalId);
      if (point?.id) {
        setDeletedPointIds((ids) => [...ids, point.id as string]);
      }
      return { ...section, points: section.points.filter((p) => p.localId !== pointLocalId) };
    });
  };

  const reorderPoints = (sectionLocalId: string, from: number, to: number) => {
    updateSection(sectionLocalId, (section) => ({
      ...section,
      points: moveItem(section.points, from, to)
    }));
  };

  const addListItem = (sectionLocalId: string, pointLocalId: string) => {
    updatePoint(sectionLocalId, pointLocalId, (point) => ({
      ...point,
      listItems: [...point.listItems, { localId: createId(), term: '', text: '' }]
    }));
  };

  const removeListItem = (sectionLocalId: string, pointLocalId: string, listItemLocalId: string) => {
    updatePoint(sectionLocalId, pointLocalId, (point) => ({
      ...point,
      listItems: point.listItems.filter((item) => item.localId !== listItemLocalId)
    }));
  };

  const serializeSectionsPayload = () =>
    sections.map((section, index) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      display_order: index,
      is_active: section.is_active !== false
    }));

  const serializePointsPayload = () =>
    sections.flatMap((section) =>
      section.points.map((point, index) => ({
        id: point.id,
        section_id: point.section_id ?? section.id,
        section_title: !point.section_id && !section.id ? section.title : undefined,
        heading: point.heading,
        body: point.body,
        list_items: serializeListItems(point.listItems),
        display_order: index,
        is_active: point.is_active !== false
      }))
    );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!content.title?.trim()) {
      toast({
        title: 'Title is required',
        description: 'Provide a policy title before saving.',
        variant: 'destructive'
      });
      return;
    }

    if (!content.last_updated) {
      toast({
        title: 'Last updated date missing',
        description: 'Select the last updated date for the policy.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...content,
        sections: serializeSectionsPayload(),
        points: serializePointsPayload(),
        deleted_section_ids: deletedSectionIds,
        deleted_point_ids: deletedPointIds
      };

      const saved = await adminService.upsertPrivacyPolicy(payload);
      hydrate(saved);
      toast({ title: 'Privacy Policy updated successfully' });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Save failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-1">Privacy Policy</p>
          <h1 className="font-display text-3xl font-bold">Privacy Policy Management</h1>
          <p className="text-muted-foreground max-w-2xl">
            Edit the public-facing Privacy Policy content, sections, and bullet points. Changes go live as soon as you save.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={loadPolicy} disabled={loading || saving}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button type="submit" form="privacy-form" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <form id="privacy-form" onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="content">
          <TabsList>
            {sectionTabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="content" className="space-y-6 mt-6">
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">Policy Overview</h2>
                <p className="text-sm text-muted-foreground">
                  Set the headline content that appears at the top of the public Privacy Policy page.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="policy-title">Title</Label>
                  <Input
                    id="policy-title"
                    value={content.title}
                    onChange={(e) => setContent((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policy-date">Last Updated</Label>
                  <Input
                    id="policy-date"
                    type="date"
                    value={content.last_updated?.slice(0, 10) || ''}
                    onChange={(e) => setContent((prev) => ({ ...prev, last_updated: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="policy-intro">Intro Paragraph</Label>
                <Textarea
                  id="policy-intro"
                  rows={5}
                  value={content.intro_body || ''}
                  onChange={(e) => setContent((prev) => ({ ...prev, intro_body: e.target.value }))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="policy-email">Contact Email</Label>
                  <Input
                    id="policy-email"
                    type="email"
                    value={content.contact_email || ''}
                    onChange={(e) => setContent((prev) => ({ ...prev, contact_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policy-url">Contact URL</Label>
                  <Input
                    id="policy-url"
                    value={content.contact_url || ''}
                    onChange={(e) => setContent((prev) => ({ ...prev, contact_url: e.target.value }))}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="sections" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">Sections</h2>
                <p className="text-sm text-muted-foreground">
                  Manage each section of the Privacy Policy and its supporting bullet points.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={addSection}>
                <Plus className="h-4 w-4 mr-2" /> Add Section
              </Button>
            </div>

            <div className="space-y-4">
              {sections.map((section, index) => (
                <SectionCard
                  key={section.localId}
                  section={section}
                  index={index}
                  total={sections.length}
                  onSectionChange={(localId, field, value) =>
                    updateSection(localId, (prevSection) => ({ ...prevSection, [field]: value }))
                  }
                  onSectionVisibility={(localId, visible) =>
                    updateSection(localId, (prevSection) => ({ ...prevSection, is_active: visible }))
                  }
                  onRemoveSection={removeSection}
                  onReorderSection={reorderSections}
                  onAddPoint={addPoint}
                  onPointChange={(sectionLocalId, pointLocalId, field, value) =>
                    updatePoint(sectionLocalId, pointLocalId, (point) => ({ ...point, [field]: value }))
                  }
                  onPointVisibility={(sectionLocalId, pointLocalId, visible) =>
                    updatePoint(sectionLocalId, pointLocalId, (point) => ({ ...point, is_active: visible }))
                  }
                  onRemovePoint={removePoint}
                  onReorderPoint={reorderPoints}
                  onAddListItem={addListItem}
                  onListItemChange={(sectionLocalId, pointLocalId, itemLocalId, field, value) =>
                    updatePoint(sectionLocalId, pointLocalId, (point) => ({
                      ...point,
                      listItems: point.listItems.map((item) =>
                        item.localId === itemLocalId ? { ...item, [field]: value } : item
                      )
                    }))
                  }
                  onRemoveListItem={removeListItem}
                />
              ))}
              {sections.length === 0 && <p className="text-sm text-muted-foreground">No sections yet. Add one to get started.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
