"use client";

import { useEffect, useState } from 'react';
import { adminService } from '@/lib/api/adminService';
import { AboutOffering, AboutPageContent, AboutPageData, AboutStat, AboutValue } from '@/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Loader2, RefreshCcw, Save, Plus, Trash2, GripVertical } from 'lucide-react';

import { fallbackAboutData, aboutIconRegistry } from '@/lib/constants/about';

interface EditableValue extends AboutValue {
  localId: string;
}

interface EditableStat extends AboutStat {
  localId: string;
}

interface EditableOffering extends AboutOffering {
  localId: string;
}

const generateLocalId = () => `local-${crypto.randomUUID?.() || Date.now()}`;

const iconOptions = Object.keys(aboutIconRegistry).sort();

export default function AboutAdminPage() {
  const { toast } = useToast();
  const [content, setContent] = useState<AboutPageContent>(fallbackAboutData.content);
  const [values, setValues] = useState<EditableValue[]>(
    fallbackAboutData.values.map((value) => ({ ...value, localId: generateLocalId() }))
  );
  const [stats, setStats] = useState<EditableStat[]>(
    fallbackAboutData.stats.map((stat) => ({ ...stat, localId: generateLocalId() }))
  );
  const [offerings, setOfferings] = useState<EditableOffering[]>(
    fallbackAboutData.offerings.map((offering) => ({ ...offering, localId: generateLocalId() }))
  );
  const [deletedValueIds, setDeletedValueIds] = useState<string[]>([]);
  const [deletedStatIds, setDeletedStatIds] = useState<string[]>([]);
  const [deletedOfferingIds, setDeletedOfferingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAboutContent = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAboutContentAdmin();
      hydrateState(data);
    } catch (error: any) {
      toast({
        title: 'Unable to load About content',
        description: error?.message || 'Loaded fallback data instead.',
        variant: 'destructive'
      });
      hydrateState(fallbackAboutData);
    } finally {
      setLoading(false);
    }
  };

  const hydrateState = (data: AboutPageData) => {
    setContent(data.content || fallbackAboutData.content);
    setValues((data.values?.length ? data.values : fallbackAboutData.values).map((value) => ({
      ...value,
      localId: generateLocalId()
    })));
    setStats((data.stats?.length ? data.stats : fallbackAboutData.stats).map((stat) => ({
      ...stat,
      localId: generateLocalId()
    })));
    setOfferings((data.offerings?.length ? data.offerings : fallbackAboutData.offerings).map((offering) => ({
      ...offering,
      localId: generateLocalId()
    })));
    setDeletedValueIds([]);
    setDeletedStatIds([]);
    setDeletedOfferingIds([]);
  };

  useEffect(() => {
    loadAboutContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContentChange = (field: keyof AboutPageContent, value: string) => {
    setContent((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const reorderItems = <T extends { localId: string }>(items: T[], from: number, to: number) => {
    const updated = [...items];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    return updated.map((item, index) => ({ ...item, display_order: index }));
  };

  const handleValueReorder = (from: number, to: number) => {
    setValues((prev) => reorderItems(prev, from, to));
  };

  const handleStatReorder = (from: number, to: number) => {
    setStats((prev) => reorderItems(prev, from, to));
  };

  const handleOfferingReorder = (from: number, to: number) => {
    setOfferings((prev) => reorderItems(prev, from, to));
  };

  const addValue = () => {
    setValues((prev) => [
      ...prev,
      {
        localId: generateLocalId(),
        title: 'New Value',
        description: '',
        icon: 'star',
        display_order: prev.length,
        is_active: true
      }
    ]);
  };

  const addStat = () => {
    setStats((prev) => [
      ...prev,
      {
        localId: generateLocalId(),
        label: 'New Metric',
        value: '0',
        helper_text: '',
        display_order: prev.length,
        is_active: true
      }
    ]);
  };

  const addOffering = () => {
    setOfferings((prev) => [
      ...prev,
      {
        localId: generateLocalId(),
        title: 'New Offering',
        description: '',
        icon: 'sparkles',
        display_order: prev.length,
        is_active: true
      }
    ]);
  };

  const removeItem = <T extends { localId: string; id?: string }>(
    items: T[],
    setItems: React.Dispatch<React.SetStateAction<T[]>>,
    setDeleted: React.Dispatch<React.SetStateAction<string[]>>,
    localId: string
  ) => {
    setItems((prev) => prev.filter((item) => item.localId !== localId));
    const target = items.find((item) => item.localId === localId);
    if (target?.id) {
      setDeleted((prev) => [...prev, target.id as string]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.hero_heading?.trim()) {
      toast({
        title: 'Hero heading is required',
        description: 'Provide a strong headline for the About page hero section.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...content,
        values: values.map((value, index) => ({
          id: value.id,
          title: value.title,
          description: value.description,
          icon: value.icon,
          display_order: index,
          is_active: value.is_active !== false
        })),
        stats: stats.map((stat, index) => ({
          id: stat.id,
          label: stat.label,
          value: stat.value,
          helper_text: stat.helper_text,
          display_order: index,
          is_active: stat.is_active !== false
        })),
        offerings: offerings.map((offering, index) => ({
          id: offering.id,
          title: offering.title,
          description: offering.description,
          icon: offering.icon,
          display_order: index,
          is_active: offering.is_active !== false
        })),
        deleted_value_ids: deletedValueIds,
        deleted_stat_ids: deletedStatIds,
        deleted_offering_ids: deletedOfferingIds
      };

      const saved = await adminService.upsertAboutContent(payload);
      hydrateState(saved);
      toast({ title: 'About page updated successfully' });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const renderIconSelect = (
    value: string | undefined,
    onChange: (icon: string) => void
  ) => (
    <select
      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {iconOptions.map((icon) => (
        <option key={icon} value={icon}>
          {icon}
        </option>
      ))}
    </select>
  );

  const sectionTabs = [
    { key: 'hero', label: 'Hero & Mission' },
    { key: 'values', label: 'Values' },
    { key: 'stats', label: 'Impact Metrics' },
    { key: 'offerings', label: 'Offerings' }
  ];

  const reorderButtons = (index: number, total: number, onMove: (targetIndex: number) => void) => (
    <div className="inline-flex flex-col text-muted-foreground">
      <button
        type="button"
        disabled={index === 0}
        className="hover:text-primary disabled:opacity-30"
        onClick={() => onMove(index - 1)}
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={index === total - 1}
        className="hover:text-primary disabled:opacity-30"
        onClick={() => onMove(index + 1)}
        aria-label="Move down"
      >
        ↓
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-1">About Page</p>
          <h1 className="font-display text-3xl font-bold">About Bharat Mock</h1>
          <p className="text-muted-foreground max-w-2xl">
            Manage the hero copy, mission statement, values, impact stats, and offerings for the About page. Changes
            reflect instantly on the public website.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={loadAboutContent} disabled={loading || saving}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button type="submit" form="about-form" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <form id="about-form" onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="hero">
          <TabsList>
            {sectionTabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="hero" className="space-y-6 mt-6">
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">Hero Section</h2>
                <p className="text-sm text-muted-foreground">Primary hero copy displayed above the fold.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hero-heading">Hero Heading</Label>
                  <Input
                    id="hero-heading"
                    value={content.hero_heading}
                    onChange={(e) => handleContentChange('hero_heading', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero-subheading">Hero Subheading</Label>
                  <Input
                    id="hero-subheading"
                    value={content.hero_subheading || ''}
                    onChange={(e) => handleContentChange('hero_subheading', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-description">Hero Description</Label>
                <Textarea
                  id="hero-description"
                  rows={4}
                  value={content.hero_description || ''}
                  onChange={(e) => handleContentChange('hero_description', e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hero-badge">Hero Badge</Label>
                  <Input
                    id="hero-badge"
                    value={content.hero_badge || ''}
                    onChange={(e) => handleContentChange('hero_badge', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta-label">CTA Label</Label>
                  <Input
                    id="cta-label"
                    value={content.cta_label || ''}
                    onChange={(e) => handleContentChange('cta_label', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta-href">CTA Link</Label>
                  <Input
                    id="cta-href"
                    value={content.cta_href || ''}
                    onChange={(e) => handleContentChange('cta_href', e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">Mission & Story</h2>
                <p className="text-sm text-muted-foreground">Explain the brand mission and origin story.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mission-heading">Mission Heading</Label>
                  <Input
                    id="mission-heading"
                    value={content.mission_heading || ''}
                    onChange={(e) => handleContentChange('mission_heading', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story-heading">Story Heading</Label>
                  <Input
                    id="story-heading"
                    value={content.story_heading || ''}
                    onChange={(e) => handleContentChange('story_heading', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mission-body">Mission Body</Label>
                  <Textarea
                    id="mission-body"
                    rows={4}
                    value={content.mission_body || ''}
                    onChange={(e) => handleContentChange('mission_body', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="story-body">Story Body</Label>
                  <Textarea
                    id="story-body"
                    rows={4}
                    value={content.story_body || ''}
                    onChange={(e) => handleContentChange('story_body', e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">Impact Narrative</h2>
                <p className="text-sm text-muted-foreground">Describe the measurable impact and offerings overview.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="impact-heading">Impact Heading</Label>
                  <Input
                    id="impact-heading"
                    value={content.impact_heading || ''}
                    onChange={(e) => handleContentChange('impact_heading', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerings-heading">Offerings Heading</Label>
                  <Input
                    id="offerings-heading"
                    value={content.offerings_heading || ''}
                    onChange={(e) => handleContentChange('offerings_heading', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="impact-body">Impact Body</Label>
                  <Textarea
                    id="impact-body"
                    rows={4}
                    value={content.impact_body || ''}
                    onChange={(e) => handleContentChange('impact_body', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerings-body">Offerings Body</Label>
                  <Textarea
                    id="offerings-body"
                    rows={4}
                    value={content.offerings_body || ''}
                    onChange={(e) => handleContentChange('offerings_body', e.target.value)}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="values" className="space-y-6 mt-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold">Values</h2>
                  <p className="text-sm text-muted-foreground">Displayed as icons with descriptions.</p>
                </div>
                <Button type="button" variant="outline" onClick={addValue}>
                  <Plus className="h-4 w-4 mr-2" /> Add Value
                </Button>
              </div>

              <div className="space-y-4">
                {values.map((value, index) => (
                  <div key={value.localId} className="border border-border rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <p className="font-semibold text-foreground">{value.title || 'Untitled value'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {reorderButtons(index, values.length, (targetIndex) => handleValueReorder(index, targetIndex))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`value-visible-${value.localId}`}
                            checked={value.is_active !== false}
                            onCheckedChange={(checked) =>
                              setValues((prev) =>
                                prev.map((item) =>
                                  item.localId === value.localId ? { ...item, is_active: checked } : item
                                )
                              )
                            }
                          />
                          <Label htmlFor={`value-visible-${value.localId}`} className="text-sm">
                            {value.is_active === false ? 'Hidden' : 'Visible'}
                          </Label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeItem(values, setValues, setDeletedValueIds, value.localId)
                          }
                          aria-label="Remove value"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={value.title}
                          onChange={(e) =>
                            setValues((prev) =>
                              prev.map((item) =>
                                item.localId === value.localId ? { ...item, title: e.target.value } : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Icon Key</Label>
                        {renderIconSelect(value.icon, (icon) =>
                          setValues((prev) =>
                            prev.map((item) =>
                              item.localId === value.localId ? { ...item, icon } : item
                            )
                          )
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={3}
                        value={value.description || ''}
                        onChange={(e) =>
                          setValues((prev) =>
                            prev.map((item) =>
                              item.localId === value.localId ? { ...item, description: e.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6 mt-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold">Impact Metrics</h2>
                  <p className="text-sm text-muted-foreground">Shorthand stats shown in highlight cards.</p>
                </div>
                <Button type="button" variant="outline" onClick={addStat}>
                  <Plus className="h-4 w-4 mr-2" /> Add Stat
                </Button>
              </div>

              <div className="space-y-4">
                {stats.map((stat, index) => (
                  <div key={stat.localId} className="border border-border rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <p className="font-semibold text-foreground">{stat.label || 'Metric'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {reorderButtons(index, stats.length, (targetIndex) => handleStatReorder(index, targetIndex))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`stat-visible-${stat.localId}`}
                            checked={stat.is_active !== false}
                            onCheckedChange={(checked) =>
                              setStats((prev) =>
                                prev.map((item) =>
                                  item.localId === stat.localId ? { ...item, is_active: checked } : item
                                )
                              )
                            }
                          />
                          <Label htmlFor={`stat-visible-${stat.localId}`} className="text-sm">
                            {stat.is_active === false ? 'Hidden' : 'Visible'}
                          </Label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeItem(stats, setStats, setDeletedStatIds, stat.localId)
                          }
                          aria-label="Remove stat"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          value={stat.label}
                          onChange={(e) =>
                            setStats((prev) =>
                              prev.map((item) =>
                                item.localId === stat.localId ? { ...item, label: e.target.value } : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Value</Label>
                        <Input
                          value={stat.value}
                          onChange={(e) =>
                            setStats((prev) =>
                              prev.map((item) =>
                                item.localId === stat.localId ? { ...item, value: e.target.value } : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Helper Text</Label>
                        <Input
                          value={stat.helper_text || ''}
                          onChange={(e) =>
                            setStats((prev) =>
                              prev.map((item) =>
                                item.localId === stat.localId ? { ...item, helper_text: e.target.value } : item
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="offerings" className="space-y-6 mt-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold">Offerings</h2>
                  <p className="text-sm text-muted-foreground">Cards describing differentiators.</p>
                </div>
                <Button type="button" variant="outline" onClick={addOffering}>
                  <Plus className="h-4 w-4 mr-2" /> Add Offering
                </Button>
              </div>

              <div className="space-y-4">
                {offerings.map((offering, index) => (
                  <div key={offering.localId} className="border border-border rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <p className="font-semibold text-foreground">{offering.title || 'Offering'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {reorderButtons(index, offerings.length, (targetIndex) => handleOfferingReorder(index, targetIndex))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`offering-visible-${offering.localId}`}
                            checked={offering.is_active !== false}
                            onCheckedChange={(checked) =>
                              setOfferings((prev) =>
                                prev.map((item) =>
                                  item.localId === offering.localId ? { ...item, is_active: checked } : item
                                )
                              )
                            }
                          />
                          <Label htmlFor={`offering-visible-${offering.localId}`} className="text-sm">
                            {offering.is_active === false ? 'Hidden' : 'Visible'}
                          </Label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeItem(offerings, setOfferings, setDeletedOfferingIds, offering.localId)
                          }
                          aria-label="Remove offering"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={offering.title}
                          onChange={(e) =>
                            setOfferings((prev) =>
                              prev.map((item) =>
                                item.localId === offering.localId ? { ...item, title: e.target.value } : item
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Icon Key</Label>
                        {renderIconSelect(offering.icon, (icon) =>
                          setOfferings((prev) =>
                            prev.map((item) =>
                              item.localId === offering.localId ? { ...item, icon } : item
                            )
                          )
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={3}
                        value={offering.description || ''}
                        onChange={(e) =>
                          setOfferings((prev) =>
                            prev.map((item) =>
                              item.localId === offering.localId ? { ...item, description: e.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
