"use client";

import { useEffect, useState } from 'react';
import { homepageAdminService } from '@/lib/api/homepageAdminService';
import { HomepageHero, HomepageHeroMediaItem } from '@/lib/api/homepageService';
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
  Video
} from 'lucide-react';

const layoutOptions = [
  {
    value: 'single',
    title: 'Single Focus',
    description: 'One hero asset with supporting copy.'
  },
  {
    value: 'slideshow',
    title: 'Slideshow',
    description: 'Cycle through multiple assets for immersive storytelling.'
  }
];

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
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchHero = async () => {
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
    };

    fetchHero();
  }, [toast]);

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

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const upload = await homepageAdminService.uploadMedia(file, hero.slug || 'default');
      setHero((prev) => ({
        ...prev,
        media_items: [
          ...prev.media_items,
          {
            url: upload.url,
            asset_type: upload.asset_type,
            tempId: generateTempId(),
            alt_text: upload.original_name,
            headline: '',
            description: ''
          }
        ]
      }));
      toast({
        title: 'Media uploaded',
        description: `${upload.asset_type === 'video' ? 'Video' : 'Image'} ready to use.`
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Unable to upload media. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      event.target.value = '';
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

  const metaTitleCount = hero.meta_title?.length || 0;
  const metaDescriptionCount = hero.meta_description?.length || 0;

  const seoPreviewTitle = hero.meta_title || hero.title || 'Meta title preview';
  const seoPreviewDescription = hero.meta_description || hero.description || 'Meta description preview will appear here.';

  const heroMediaLayout = hero.media_layout || 'single';

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
          <h1 className="font-display text-3xl font-bold">Hero Experience</h1>
          <p className="text-muted-foreground max-w-2xl">
            Update the hero background, CTAs, media storytelling, and SEO metadata. Changes update instantly for visitors.
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <SectionCard
            title="Hero Content"
            description="Control the title, supporting copy, and CTAs."
            icon={<Sparkles className="h-5 w-5" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={hero.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="Your Personal Government Exam Guide"
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input
                  value={hero.subtitle || ''}
                  onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                  placeholder="Trusted by 1M+ learners"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={hero.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Tell learners what makes this platform unique."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary CTA Label</Label>
                <Input
                  value={hero.cta_primary_text || ''}
                  onChange={(e) => handleFieldChange('cta_primary_text', e.target.value)}
                  placeholder="Get Free Mock"
                />
              </div>
              <div className="space-y-2">
                <Label>Primary CTA URL</Label>
                <Input
                  value={hero.cta_primary_url || ''}
                  onChange={(e) => handleFieldChange('cta_primary_url', e.target.value)}
                  placeholder="/exams"
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary CTA Label</Label>
                <Input
                  value={hero.cta_secondary_text || ''}
                  onChange={(e) => handleFieldChange('cta_secondary_text', e.target.value)}
                  placeholder="Explore Resources"
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary CTA URL</Label>
                <Input
                  value={hero.cta_secondary_url || ''}
                  onChange={(e) => handleFieldChange('cta_secondary_url', e.target.value)}
                  placeholder="/resources"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Media Layout"
            description="Choose how the hero displays media. Upload Cloudflare R2 assets and enrich them with copy."
            icon={<ImagePlus className="h-5 w-5" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {layoutOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`p-4 border rounded-xl text-left transition ${
                    heroMediaLayout === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                  onClick={() => handleFieldChange('media_layout', option.value)}
                >
                  <p className="font-semibold">{option.title}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <Label>Media Library ({hero.media_items.length})</Label>
                  <p className="text-xs text-muted-foreground">
                    Upload high-quality images (JPG, PNG, WebP, GIF) or videos (MP4, WebM, MOV). Stored in Cloudflare R2.
                  </p>
                </div>
                <div>
                  <label htmlFor="hero-media-upload" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-pointer hover:bg-muted text-sm">
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" /> Upload Media
                      </>
                    )}
                  </label>
                  <input
                    id="hero-media-upload"
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    disabled={uploading}
                  />
                </div>
              </div>
              <div className="grid gap-4">
                {hero.media_items.length === 0 && (
                  <div className="border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
                    No media yet. Upload assets to build your hero gallery.
                  </div>
                )}
                {hero.media_items.map((item, index) => (
                  <div key={item.tempId} className="border border-border rounded-xl p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.asset_type === 'video' ? (
                          <Video className="h-4 w-4 text-primary" />
                        ) : (
                          <ImagePlus className="h-4 w-4 text-primary" />
                        )}
                        <p className="font-medium">Asset {index + 1}</p>
                        <span className="text-xs text-muted-foreground">{item.asset_type === 'video' ? 'Video' : 'Image'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => handleMediaReorder(item.tempId, 'up')}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === hero.media_items.length - 1}
                          onClick={() => handleMediaReorder(item.tempId, 'down')}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMedia(item.tempId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="aspect-video rounded-lg overflow-hidden border border-border bg-muted">
                      {item.asset_type === 'video' ? (
                        <video src={item.url} className="w-full h-full object-cover" controls preload="metadata" />
                      ) : (
                        <img src={item.url} alt={item.alt_text || ''} className="w-full h-full object-cover" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="SEO & Social"
            description="Optimize SERP snippets, Open Graph, and Twitter cards."
            icon={<Sparkles className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Meta Title</Label>
                  <span className={`text-xs ${metaTitleCount > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {metaTitleCount}/60
                  </span>
                </div>
                <Input
                  value={hero.meta_title || ''}
                  onChange={(e) => handleFieldChange('meta_title', e.target.value)}
                  placeholder="Bharat Mock — Smart Government Exam Preparation"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Meta Description</Label>
                  <span className={`text-xs ${metaDescriptionCount > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {metaDescriptionCount}/160
                  </span>
                </div>
                <Textarea
                  rows={3}
                  value={hero.meta_description || ''}
                  onChange={(e) => handleFieldChange('meta_description', e.target.value)}
                  placeholder="Prepare for SSC, Banking, Railways, Defence, and more with Bharat Mock's adaptive mock tests and guided prep."
                />
              </div>
              <div className="space-y-2">
                <Label>Meta Keywords</Label>
                <Input
                  value={hero.meta_keywords || ''}
                  onChange={(e) => handleFieldChange('meta_keywords', e.target.value)}
                  placeholder="mock tests, ssc cgl, banking exam, railway exam"
                />
              </div>
              <div className="space-y-2">
                <Label>Open Graph Title</Label>
                <Input
                  value={hero.og_title || ''}
                  onChange={(e) => handleFieldChange('og_title', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Open Graph Description</Label>
                <Textarea
                  rows={2}
                  value={hero.og_description || ''}
                  onChange={(e) => handleFieldChange('og_description', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Open Graph Image URL</Label>
                <Input
                  value={hero.og_image_url || ''}
                  onChange={(e) => handleFieldChange('og_image_url', e.target.value)}
                  placeholder="https://cdn.example.com/og-image.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label>Canonical URL</Label>
                <Input
                  value={hero.canonical_url || ''}
                  onChange={(e) => handleFieldChange('canonical_url', e.target.value)}
                  placeholder="https://bharatmock.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Robots Directive</Label>
                <select
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background"
                  value={hero.robots_meta || 'index,follow'}
                  onChange={(e) => handleFieldChange('robots_meta', e.target.value)}
                >
                  {robotsOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Search Preview</Label>
                <div className="border border-border rounded-xl p-4 bg-muted/40 space-y-2">
                  <p className="text-xs text-muted-foreground">bharatmock.com › home</p>
                  <p className="text-primary font-semibold">{seoPreviewTitle}</p>
                  <p className="text-sm text-muted-foreground">{seoPreviewDescription}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Deployment"
            description="Keep customers informed about release status."
            icon={<Loader2 className="h-5 w-5" />}
          >
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Last updated: {hero.updated_at ? new Date(hero.updated_at).toLocaleString() : 'Not published yet'}
              </p>
              <p>Slug: {hero.slug || 'default'}</p>
              <p>
                Status: <span className={hero.is_published ? 'text-green-600' : 'text-yellow-600'}>{hero.is_published ? 'Visible to visitors' : 'Hidden'}</span>
              </p>
            </div>
          </SectionCard>
        </div>
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
  description: string;
  icon: React.ReactNode;
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
