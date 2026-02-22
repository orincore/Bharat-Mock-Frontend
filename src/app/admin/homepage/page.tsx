"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { homepageAdminService } from '@/lib/api/homepageAdminService';
import { HomepageHero, HomepageHeroMediaItem, HomepageBanner } from '@/lib/api/homepageService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
  UploadCloud,
  Video,
  Link2,
  Type,
  Image as ImageIcon,
  Plus,
  X
} from 'lucide-react';

const generateTempId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `media-${Date.now()}-${Math.random()}`;

const defaultHero: HomepageHero = {
  slug: 'default',
  title: 'Your Personal Government Exam Guide',
  subtitle: 'Bharat Mock Homepage',
  description: 'Start preparing for Government Jobs with free mock tests, resources, and curated guidance.',
  cta_primary_text: 'Get Free Mock',
  cta_primary_url: '/exams',
  media_layout: 'single',
  media_items: [],
  is_published: true
};

const robotsOptions = ['index,follow', 'noindex,follow', 'index,nofollow', 'noindex,nofollow'];

type EditableMediaItem = HomepageHeroMediaItem & { tempId: string };

type HeroFormState = Omit<HomepageHero, 'media_items'> & {
  media_items: EditableMediaItem[];
  updated_at?: string;
};

type EditableBanner = HomepageBanner & { tempId: string };

const createEditableMediaItems = (items?: HomepageHeroMediaItem[]): EditableMediaItem[] => {
  return (items || []).map((item, index) => ({
    ...item,
    order: item.order ?? index,
    tempId: generateTempId()
  }));
};

const stripEditable = (items: EditableMediaItem[]): HomepageHeroMediaItem[] =>
  items.map(({ tempId, ...rest }, index) => ({ ...rest, order: index }));

const initialHeroState: HeroFormState = {
  ...defaultHero,
  media_items: []
};

export default function HomepageAdminPage() {
  const { toast } = useToast();
  const [hero, setHero] = useState<HeroFormState>(initialHeroState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banners, setBanners] = useState<EditableBanner[]>([]);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  const fetchHero = useCallback(async () => {
    try {
      setLoading(true);
      const data = await homepageAdminService.getHero('default');
      if (data) {
        setHero({
          ...defaultHero,
          ...data,
          media_items: createEditableMediaItems(data.media_items),
          updated_at: data.updated_at
        });
      } else {
        setHero({ ...initialHeroState });
      }
    } catch (error: any) {
      toast({
        title: 'Unable to load hero content',
        description: error?.message || 'Please refresh and try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);


  const fetchBanners = useCallback(async () => {
    try {
      const list = await homepageAdminService.getBanners();
      const withTempIds = list.map((banner) => ({ ...banner, tempId: banner.id }));
      setBanners(withTempIds);
    } catch (error: any) {
      toast({
        title: 'Failed to load banners',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchHero();
    fetchBanners();
  }, [fetchHero, fetchBanners]);


  const handleFieldChange = (key: keyof HomepageHero, value: any) => {
    setHero((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleMediaFieldChange = (id: string, key: keyof HomepageHeroMediaItem, value: any) => {
    setHero((prev) => ({
      ...prev,
      media_items: prev.media_items.map((item): EditableMediaItem =>
        item.tempId === id ? { ...item, [key]: value } : item
      )
    }));
  };

  const handleMediaReorder = (id: string, direction: 'up' | 'down') => {
    setHero((prev) => {
      const currentIndex = prev.media_items.findIndex((item) => item.tempId === id);
      if (currentIndex === -1) return prev;
      const swapWith = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (swapWith < 0 || swapWith >= prev.media_items.length) return prev;
      const updated = [...prev.media_items];
      [updated[currentIndex], updated[swapWith]] = [updated[swapWith], updated[currentIndex]];
      return { ...prev, media_items: updated };
    });
  };

  const handleRemoveMedia = (id: string) => {
    setHero((prev) => ({
      ...prev,
      media_items: prev.media_items.filter((item) => item.tempId !== id)
    }));
  };

  const handleBannerFieldChange = (id: string, key: keyof HomepageBanner, value: any) => {
    setBanners((prev) => prev.map((banner) => (banner.tempId === id ? { ...banner, [key]: value } : banner)));
  };

  const handleAddBanner = () => {
    setBanners((prev) => [
      ...prev,
      {
        id: '',
        tempId: generateTempId(),
        title: 'Untitled Banner',
        subtitle: '',
        image_url: '',
        link_url: '',
        button_text: '',
        display_order: prev.length,
        is_active: true
      }
    ]);
  };

  const handleRemoveBanner = async (tempId: string, bannerId?: string) => {
    if (bannerId) {
      try {
        await homepageAdminService.deleteBanner(bannerId);
        toast({ title: 'Banner removed' });
      } catch (error: any) {
        toast({
          title: 'Failed to delete banner',
          description: error?.message || 'Please try again.',
          variant: 'destructive'
        });
        return;
      }
    }
    setBanners((prev) => prev.filter((banner) => banner.tempId !== tempId));
  };

  const handleBannerUpload = async (tempId: string, file?: FileList | null) => {
    const selectedFile = file?.[0];
    if (!selectedFile) return;
    setBannerUploading(true);
    try {
      const uploaded = await homepageAdminService.uploadBannerImage(selectedFile);
      handleBannerFieldChange(tempId, 'image_url', uploaded.url);
      toast({ title: 'Banner image uploaded' });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Unable to upload banner image.',
        variant: 'destructive'
      });
    } finally {
      setBannerUploading(false);
    }
  };

  const handleSaveBanners = async () => {
    try {
      setBannerSaving(true);
      const sorted = banners.map((banner, index) => ({ ...banner, display_order: index }));
      const promises = sorted.map((banner) => {
        const payload = {
          title: banner.title,
          subtitle: banner.subtitle,
          image_url: banner.image_url,
          link_url: banner.link_url,
          button_text: banner.button_text,
          display_order: banner.display_order,
          is_active: banner.is_active,
        };
        if (banner.id) {
          return homepageAdminService.updateBanner(banner.id, payload);
        }
        return homepageAdminService.createBanner(payload);
      });
      const saved = await Promise.all(promises);
      const refreshed = saved.map((banner) => ({ ...banner, tempId: banner.id }));
      setBanners(refreshed);
      toast({ title: 'Banners saved' });
    } catch (error: any) {
      toast({
        title: 'Failed to save banners',
        description: error?.message || 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setBannerSaving(false);
    }
  };

  const handleReorderBanner = (tempId: string, direction: 'up' | 'down') => {
    setBanners((prev) => {
      const index = prev.findIndex((banner) => banner.tempId === tempId);
      if (index === -1) return prev;
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const cloned = [...prev];
      [cloned[index], cloned[swapWith]] = [cloned[swapWith], cloned[index]];
      return cloned.map((banner, idx) => ({ ...banner, display_order: idx }));
    });
  };

  const handleButtonCardUpload = async (tempId: string, files?: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setButtonUploadTarget(tempId);
    try {
      const upload = await homepageAdminService.uploadMedia(file, hero.slug || 'default');
      updateButtonCards((cards) =>
        cards.map((card) =>
          card.tempId === tempId
            ? { ...card, url: upload.url, asset_type: upload.asset_type, alt_text: upload.original_name }
            : card
        )
      );
      toast({ title: 'Button icon uploaded' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setButtonUploadTarget(null);
    }
  };

  const handleHeroIllustrationUpload = async (files?: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setHeroIllustrationUploading(true);
    try {
      const upload = await homepageAdminService.uploadMedia(file, hero.slug || 'default');
      setHeroIllustrationItem({
        url: upload.url,
        asset_type: upload.asset_type,
        tempId: generateTempId(),
        alt_text: upload.original_name,
        overlay_color: 'hero-visual'
      });
      toast({ title: 'Hero illustration updated' });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Unable to upload illustration. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setHeroIllustrationUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: HomepageHero = {
        ...hero,
        media_items: stripEditable(hero.media_items)
      };

      const saved = await homepageAdminService.upsertHero(payload);
      setHero({
        ...saved,
        media_items: createEditableMediaItems(saved.media_items),
        updated_at: saved.updated_at
      });
      toast({ title: 'Homepage hero saved', description: 'Changes are live on the homepage.' });
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


  const [buttonUploadTarget, setButtonUploadTarget] = useState<string | null>(null);
  const [heroIllustrationUploading, setHeroIllustrationUploading] = useState(false);

  const { heroIllustration, buttonCards } = useMemo(() => {
    let visual: EditableMediaItem | null = null;
    const cards: EditableMediaItem[] = [];

    for (const item of hero.media_items) {
      if (item.overlay_color === 'hero-visual') {
        visual = item;
      } else {
        cards.push(item);
      }
    }

    return { heroIllustration: visual, buttonCards: cards };
  }, [hero.media_items]);

  const rebuildMediaItems = (buttons: EditableMediaItem[], illustration: EditableMediaItem | null) => {
    const normalized = buttons.map((card, idx) => ({ ...card, overlay_color: 'button-card', order: idx }));
    return illustration ? [...normalized, { ...illustration, overlay_color: 'hero-visual', order: normalized.length }] : normalized;
  };

  const updateButtonCards = (updater: (cards: EditableMediaItem[]) => EditableMediaItem[]) => {
    setHero((prev) => ({
      ...prev,
      media_items: rebuildMediaItems(updater(buttonCards), heroIllustration || null)
    }));
  };

  const setHeroIllustrationItem = (item: EditableMediaItem | null) => {
    setHero((prev) => ({
      ...prev,
      media_items: rebuildMediaItems(buttonCards, item)
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-primary font-semibold mb-1">Homepage</p>
          <h1 className="font-display text-3xl font-bold">Hero Section</h1>
          <p className="text-muted-foreground max-w-2xl">
            Manage hero title, description, exam buttons, and right-side illustration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="publish-switch"
            checked={hero.is_published ?? true}
            onCheckedChange={(checked) => handleFieldChange('is_published', checked)}
          />
          <Label htmlFor="publish-switch" className="text-sm font-medium">
            {hero.is_published ? 'Published' : 'Hidden'}
          </Label>
          <Button onClick={handleSave} disabled={saving} className="ml-4">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving
              </>
            ) : (
              'Save Hero'
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <SectionCard
          title="Hero Content"
          description="Main title and description displayed on the left side."
          icon={<Type className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={hero.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="Your Personal Government Exam Guide"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={hero.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Start Your Journey With Free Videos, Test Series, Quizzes, Notes, & Information About Government Exams"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
            title="Button Cards"
            description="Manage the four exam buttons that sit beneath the hero copy. Upload icons, set the badge text, and control redirects."
            icon={<ImagePlus className="h-5 w-5" />}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label>Buttons ({buttonCards.length}/4)</Label>
                <p className="text-xs text-muted-foreground">
                  Each button uses a square PNG/SVG icon (transparent preferred). Drag to reorder.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={buttonCards.length >= 4}
                onClick={() =>
                  updateButtonCards((cards) => [
                    ...cards,
                    {
                      tempId: generateTempId(),
                      url: '',
                      headline: '',
                      description: '',
                      cta_url: '',
                      asset_type: 'image',
                      overlay_color: 'button-card'
                    }
                  ])
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Add button
              </Button>
            </div>

            <div className="space-y-4">
              {buttonCards.length === 0 && (
                <div className="border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
                  No buttons configured yet. Add up to 4 to mirror the homepage grid.
                </div>
              )}

              {buttonCards.map((card, index) => (
                <div key={card.tempId} className="border border-border rounded-xl p-4 space-y-4 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Button {index + 1}</span>
                      <span className="text-xs text-muted-foreground">{card.headline || 'Untitled'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={index === 0}
                        onClick={() =>
                          updateButtonCards((cards) => {
                            const clone = [...cards];
                            [clone[index - 1], clone[index]] = [clone[index], clone[index - 1]];
                            return clone;
                          })
                        }
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={index === buttonCards.length - 1}
                        onClick={() =>
                          updateButtonCards((cards) => {
                            const clone = [...cards];
                            [clone[index + 1], clone[index]] = [clone[index], clone[index + 1]];
                            return clone;
                          })
                        }
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => updateButtonCards((cards) => cards.filter((c) => c.tempId !== card.tempId))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-[140px_1fr] gap-4">
                    <div className="space-y-2">
                      <Label>Button icon</Label>
                      <div className="border border-dashed border-border rounded-xl h-32 flex items-center justify-center overflow-hidden bg-muted/20">
                        {card.url ? (
                          <img src={card.url} alt={card.alt_text || ''} className="h-full w-full object-contain" />
                        ) : (
                          <p className="text-xs text-muted-foreground text-center px-4">Upload PNG/SVG icon</p>
                        )}
                      </div>
                      <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-xs cursor-pointer hover:bg-muted">
                        {buttonUploadTarget === card.tempId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleButtonCardUpload(card.tempId, e.target.files)}
                          disabled={buttonUploadTarget === card.tempId}
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Button title</Label>
                        <Input
                          value={card.headline || ''}
                          onChange={(e) => handleMediaFieldChange(card.tempId, 'headline', e.target.value)}
                          placeholder="Delhi Police Head Constable"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Supporting text</Label>
                        <Input
                          value={card.description || ''}
                          onChange={(e) => handleMediaFieldChange(card.tempId, 'description', e.target.value)}
                          placeholder="Exam Date: 7th January 2026"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Redirect URL</Label>
                        <Input
                          value={card.cta_url || ''}
                          onChange={(e) => handleMediaFieldChange(card.tempId, 'cta_url', e.target.value)}
                          placeholder="/exams/delhi-police"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Alt text</Label>
                        <Input
                          value={card.alt_text || ''}
                          onChange={(e) => handleMediaFieldChange(card.tempId, 'alt_text', e.target.value)}
                          placeholder="Icon alt description"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Hero Illustration"
            description="Upload the board/illustration displayed on the right side of the hero. Supports transparent PNGs for seamless blending."
            icon={<ImagePlus className="h-5 w-5" />}
          >
            <div className="grid md:grid-cols-[240px_1fr] gap-6 items-center">
              <div className="border border-dashed border-border rounded-2xl h-64 bg-muted/20 flex items-center justify-center overflow-hidden">
                {heroIllustration?.url ? (
                  heroIllustration.asset_type === 'video' ? (
                    <video src={heroIllustration.url} className="h-full w-full object-contain" controls />
                  ) : (
                    <img src={heroIllustration.url} alt={heroIllustration.alt_text || ''} className="h-full w-full object-contain" />
                  )
                ) : (
                  <p className="text-sm text-muted-foreground text-center px-6">
                    No illustration uploaded yet. PNG/SVG recommended for transparent backgrounds.
                  </p>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Alt text</Label>
                  <Input
                    value={heroIllustration?.alt_text || ''}
                    onChange={(e) =>
                      heroIllustration
                        ? setHeroIllustrationItem({ ...heroIllustration, alt_text: e.target.value })
                        : null
                    }
                    placeholder="Illustration description"
                    disabled={!heroIllustration}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm cursor-pointer hover:bg-muted">
                    {heroIllustrationUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UploadCloud className="h-4 w-4" />
                    )}
                    Upload illustration
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleHeroIllustrationUpload(e.target.files)}
                      disabled={heroIllustrationUploading}
                    />
                  </label>
                  {heroIllustration && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setHeroIllustrationItem(null)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

        <SectionCard
          title="Homepage Banners"
          description="Manage promotional banners displayed on the homepage."
          icon={<ImageIcon className="h-5 w-5" />}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label>Banners ({banners.length})</Label>
              <p className="text-xs text-muted-foreground">Upload images and configure banner links.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleAddBanner}>
                <Plus className="h-4 w-4 mr-1" /> Add banner
              </Button>
              <Button type="button" onClick={handleSaveBanners} disabled={bannerSaving || bannerUploading}>
                {bannerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save banners'}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {banners.length === 0 && (
              <div className="border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
                No banners yet. Click "Add banner" to create one.
              </div>
            )}

            {banners.map((banner, index) => (
              <div key={banner.tempId} className="border border-border rounded-xl p-4 space-y-4 bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Banner {index + 1}</span>
                    <span className="text-xs text-muted-foreground">{banner.is_active ? 'Active' : 'Hidden'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => handleReorderBanner(banner.tempId, 'up')}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === banners.length - 1}
                      onClick={() => handleReorderBanner(banner.tempId, 'down')}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveBanner(banner.tempId, banner.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={banner.title}
                      onChange={(e) => handleBannerFieldChange(banner.tempId, 'title', e.target.value)}
                      placeholder="Banner title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtitle</Label>
                    <Input
                      value={banner.subtitle || ''}
                      onChange={(e) => handleBannerFieldChange(banner.tempId, 'subtitle', e.target.value)}
                      placeholder="Optional subtitle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Button text</Label>
                    <Input
                      value={banner.button_text || ''}
                      onChange={(e) => handleBannerFieldChange(banner.tempId, 'button_text', e.target.value)}
                      placeholder="CTA label"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" /> Link URL
                    </Label>
                    <Input
                      value={banner.link_url || ''}
                      onChange={(e) => handleBannerFieldChange(banner.tempId, 'link_url', e.target.value)}
                      placeholder="https://bharatmock.com/exams"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={banner.is_active}
                        onCheckedChange={(checked) => handleBannerFieldChange(banner.tempId, 'is_active', checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {banner.is_active ? 'Visible to users' : 'Hidden from homepage'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Image URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={banner.image_url}
                        onChange={(e) => handleBannerFieldChange(banner.tempId, 'image_url', e.target.value)}
                        placeholder="https://cdn.example.com/banner.jpg"
                      />
                      <label className="inline-flex items-center gap-1 px-3 py-2 border border-border rounded-lg text-sm cursor-pointer hover:bg-muted">
                        <UploadCloud className="h-4 w-4" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleBannerUpload(banner.tempId, e.target.files)}
                          disabled={bannerUploading}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="border border-dashed border-border rounded-lg h-32 flex items-center justify-center overflow-hidden bg-muted/30">
                      {banner.image_url ? (
                        <img src={banner.image_url} alt="Banner preview" className="w-full h-full object-cover" />
                      ) : (
                        <p className="text-xs text-muted-foreground text-center px-4">Upload an image to preview the banner.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon,
  children
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold text-lg">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
