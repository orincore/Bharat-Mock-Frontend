"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Save, Plus, Trash2, Search, ExternalLink, Upload } from 'lucide-react';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { adminCurrentAffairsService } from '@/lib/api/adminCurrentAffairsService';
import { CurrentAffairsPayload, CurrentAffairsSettings, CurrentAffairsVideo, CurrentAffairsQuizLink } from '@/lib/api/currentAffairsService';
import { adminService } from '@/lib/api/adminService';
import { Exam } from '@/types';

interface VideoFormState {
  id?: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  description: string;
  platform: string;
  durationSeconds: string;
  tag: string;
  displayOrder: string;
  isFeatured: boolean;
  isPublished: boolean;
}

interface QuizFormState {
  id?: string;
  examId: string;
  highlightLabel: string;
  summary: string;
  badge: string;
  tag: string;
  displayOrder: string;
  isPublished: boolean;
}

const DEFAULT_VIDEO_FORM: VideoFormState = {
  title: '',
  videoUrl: '',
  thumbnailUrl: '',
  description: '',
  platform: 'youtube',
  durationSeconds: '',
  tag: 'daily',
  displayOrder: '0',
  isFeatured: false,
  isPublished: true
};

const DEFAULT_QUIZ_FORM: QuizFormState = {
  examId: '',
  highlightLabel: '',
  summary: '',
  badge: '',
  tag: 'daily',
  displayOrder: '0',
  isPublished: true
};

export default function AdminCurrentAffairsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CurrentAffairsSettings | null>(null);
  const [videos, setVideos] = useState<CurrentAffairsVideo[]>([]);
  const [quizzes, setQuizzes] = useState<CurrentAffairsQuizLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [videoForm, setVideoForm] = useState<VideoFormState>(DEFAULT_VIDEO_FORM);
  const [quizForm, setQuizForm] = useState<QuizFormState>(DEFAULT_QUIZ_FORM);
  const [videoSaving, setVideoSaving] = useState(false);
  const [quizSaving, setQuizSaving] = useState(false);
  const [examSearch, setExamSearch] = useState('');
  const [examResults, setExamResults] = useState<Exam[]>([]);
  const [searchingExams, setSearchingExams] = useState(false);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);
  const videoUploadInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingVideoAsset, setUploadingVideoAsset] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const payload = await adminCurrentAffairsService.getPage();
        setSettings(payload.settings);
        setVideos(payload.videos);
        setQuizzes(payload.quizzes);
      } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to load data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [toast]);

  const handleSettingsChange = (key: keyof CurrentAffairsSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSettingsSaving(true);
    try {
      const updated = await adminCurrentAffairsService.updateSettings({
        heroBadge: settings.heroBadge,
        heroTitle: settings.heroTitle,
        heroSubtitle: settings.heroSubtitle,
        heroDescription: settings.heroDescription,
        heroCtaLabel: settings.heroCtaLabel,
        heroCtaUrl: settings.heroCtaUrl,
        seoTitle: settings.seoTitle,
        seoDescription: settings.seoDescription,
        seoKeywords: settings.seoKeywords
      });
      setSettings(updated);
      toast({ title: 'Settings updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSettingsSaving(false);
    }
  };

  const startEditVideo = (video: CurrentAffairsVideo) => {
    setVideoForm({
      id: video.id,
      title: video.title,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || '',
      description: video.description || '',
      platform: video.platform || 'youtube',
      durationSeconds: video.durationSeconds ? String(video.durationSeconds) : '',
      tag: video.tag || 'daily',
      displayOrder: String(video.displayOrder || 0),
      isFeatured: video.isFeatured,
      isPublished: video.isPublished
    });
  };

  const resetVideoForm = () => setVideoForm(DEFAULT_VIDEO_FORM);

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoForm.title.trim() || !videoForm.videoUrl.trim()) {
      toast({ title: 'Missing fields', description: 'Title and video URL are required', variant: 'destructive' });
      return;
    }
    setVideoSaving(true);
    const payload = {
      title: videoForm.title,
      videoUrl: videoForm.videoUrl,
      thumbnailUrl: videoForm.thumbnailUrl,
      description: videoForm.description,
      platform: videoForm.platform,
      durationSeconds: videoForm.durationSeconds ? Number(videoForm.durationSeconds) : null,
      tag: videoForm.tag,
      displayOrder: Number(videoForm.displayOrder) || 0,
      isFeatured: videoForm.isFeatured,
      isPublished: videoForm.isPublished
    };
    try {
      let updated: CurrentAffairsVideo;
      if (videoForm.id) {
        updated = await adminCurrentAffairsService.updateVideo(videoForm.id, payload);
        setVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        toast({ title: 'Video updated' });
      } else {
        updated = await adminCurrentAffairsService.createVideo(payload);
        setVideos((prev) => [updated, ...prev]);
        toast({ title: 'Video added' });
      }
      resetVideoForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save video', variant: 'destructive' });
    } finally {
      setVideoSaving(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Delete this video entry?')) return;
    try {
      await adminCurrentAffairsService.deleteVideo(id);
      setVideos((prev) => prev.filter((video) => video.id !== id));
      toast({ title: 'Video deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete video', variant: 'destructive' });
    }
  };

  const startEditQuiz = (quiz: CurrentAffairsQuizLink) => {
    setQuizForm({
      id: quiz.id,
      examId: quiz.examId,
      highlightLabel: quiz.highlightLabel || '',
      summary: quiz.summary || '',
      badge: quiz.badge || '',
      tag: quiz.tag || 'daily',
      displayOrder: String(quiz.displayOrder || 0),
      isPublished: quiz.isPublished
    });
  };

  const resetQuizForm = () => setQuizForm(DEFAULT_QUIZ_FORM);

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizForm.examId.trim()) {
      toast({ title: 'Missing exam', description: 'Select an exam to attach', variant: 'destructive' });
      return;
    }
    setQuizSaving(true);
    const payload = {
      examId: quizForm.examId,
      highlightLabel: quizForm.highlightLabel || undefined,
      summary: quizForm.summary || undefined,
      badge: quizForm.badge || undefined,
      tag: quizForm.tag || undefined,
      displayOrder: Number(quizForm.displayOrder) || 0,
      isPublished: quizForm.isPublished
    };

    try {
      let response: CurrentAffairsQuizLink;
      if (quizForm.id) {
        response = await adminCurrentAffairsService.updateQuiz(quizForm.id, payload);
        setQuizzes((prev) => prev.map((item) => (item.id === response.id ? response : item)));
        toast({ title: 'Quiz entry updated' });
      } else {
        response = await adminCurrentAffairsService.createQuiz(payload);
        setQuizzes((prev) => [response, ...prev]);
        toast({ title: 'Quiz entry added' });
      }
      resetQuizForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save quiz entry', variant: 'destructive' });
    } finally {
      setQuizSaving(false);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('Remove this quiz from the page?')) return;
    try {
      await adminCurrentAffairsService.deleteQuiz(id);
      setQuizzes((prev) => prev.filter((quiz) => quiz.id !== id));
      toast({ title: 'Quiz entry removed' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete quiz entry', variant: 'destructive' });
    }
  };

  const handleVideoUpload = async (file: File) => {
    try {
      setUploadingVideoAsset(true);
      const uploadedUrl = await adminCurrentAffairsService.uploadVideoAsset(file);
      setVideoForm((prev) => ({ ...prev, videoUrl: uploadedUrl }));
      toast({ title: 'Video uploaded', description: 'URL attached to the form automatically.' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error?.message || 'Could not upload video', variant: 'destructive' });
    } finally {
      setUploadingVideoAsset(false);
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    try {
      setUploadingThumbnail(true);
      const uploadedUrl = await adminCurrentAffairsService.uploadThumbnailAsset(file);
      setVideoForm((prev) => ({ ...prev, thumbnailUrl: uploadedUrl }));
      toast({ title: 'Thumbnail uploaded', description: 'Preview updated automatically.' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error?.message || 'Could not upload thumbnail', variant: 'destructive' });
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const performExamSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setExamResults([]);
      return;
    }
    setSearchingExams(true);
    try {
      const response = await adminService.getExams({ search: term, limit: 10 });
      setExamResults(response.data);
    } catch (error) {
      console.error('Exam search failed', error);
      setExamResults([]);
    } finally {
      setSearchingExams(false);
    }
  }, []);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => performExamSearch(examSearch), 400);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [examSearch, performExamSearch]);

  const examLabel = useMemo(() => {
    if (!quizForm.examId) return 'Search exam to attach';
    const match = examResults.find((exam) => exam.id === quizForm.examId) || quizzes.find((quiz) => quiz.exam?.id === quizForm.examId)?.exam;
    return match ? `${match.title} (${match.category || match.status || ''})` : quizForm.examId;
  }, [quizForm.examId, examResults, quizzes]);

  if (loading || !settings) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Breadcrumbs items={[AdminBreadcrumb(), { label: 'Current Affairs' }]} className="mb-4" />
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">Current Affairs Control Center</h1>
        <p className="text-muted-foreground max-w-3xl">
          Manage hero copy, attach explainer videos, curate notes, and link live quizzes. Notes are driven by the existing blogs editor—mark any article as a current affairs note to surface it here.
        </p>
      </header>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Hero & SEO Settings</h2>
            <p className="text-sm text-muted-foreground">Adjust the top messaging and meta tags shown on the public Current Affairs page.</p>
          </div>
          <Button onClick={handleSaveSettings} disabled={settingsSaving}>
            <Save className="w-4 h-4 mr-2" />
            {settingsSaving ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero Badge</label>
            <Input value={settings.heroBadge || ''} onChange={(e) => handleSettingsChange('heroBadge', e.target.value)} placeholder="Daily updated" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero Title *</label>
            <Input value={settings.heroTitle || ''} onChange={(e) => handleSettingsChange('heroTitle', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero Subtitle</label>
            <Input value={settings.heroSubtitle || ''} onChange={(e) => handleSettingsChange('heroSubtitle', e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero CTA Label</label>
            <Input value={settings.heroCtaLabel || ''} onChange={(e) => handleSettingsChange('heroCtaLabel', e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero CTA URL</label>
            <Input value={settings.heroCtaUrl || ''} onChange={(e) => handleSettingsChange('heroCtaUrl', e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Hero Description</label>
          <Textarea value={settings.heroDescription || ''} onChange={(e) => handleSettingsChange('heroDescription', e.target.value)} rows={3} />
        </div>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">SEO Title</label>
            <Input value={settings.seoTitle || ''} onChange={(e) => handleSettingsChange('seoTitle', e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">SEO Keywords (comma separated)</label>
            <Input
              value={settings.seoKeywords?.join(', ') || ''}
              onChange={(e) => handleSettingsChange('seoKeywords', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">SEO Description</label>
          <Textarea value={settings.seoDescription || ''} onChange={(e) => handleSettingsChange('seoDescription', e.target.value)} rows={3} />
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Video Playlist</h2>
            <p className="text-sm text-muted-foreground">Add YouTube or platform links that will render in the Current Affairs Videos row.</p>
          </div>
        </div>
        <form onSubmit={handleVideoSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input value={videoForm.title} onChange={(e) => setVideoForm((prev) => ({ ...prev, title: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Video Asset *</label>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  value={videoForm.videoUrl}
                  placeholder="Upload a video to generate URL"
                  readOnly
                  className="md:flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => videoUploadInputRef.current?.click()}
                  disabled={uploadingVideoAsset}
                  className="md:w-auto"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingVideoAsset ? 'Uploading…' : 'Upload Video'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Accepted formats: MP4, WebM, MOV up to 150MB.</p>
            </div>
            <input
              ref={videoUploadInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleVideoUpload(file);
                event.target.value = '';
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Thumbnail Image</label>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  value={videoForm.thumbnailUrl}
                  placeholder="Upload thumbnail to generate URL"
                  readOnly
                  className="md:flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => thumbnailUploadInputRef.current?.click()}
                  disabled={uploadingThumbnail}
                  className="md:w-auto"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingThumbnail ? 'Uploading…' : 'Upload Image'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">PNG/JPEG/WebP up to 10MB.</p>
            </div>
            <input
              ref={thumbnailUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleThumbnailUpload(file);
                event.target.value = '';
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Duration (seconds)</label>
            <Input type="number" value={videoForm.durationSeconds} onChange={(e) => setVideoForm((prev) => ({ ...prev, durationSeconds: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tag</label>
            <Input value={videoForm.tag} onChange={(e) => setVideoForm((prev) => ({ ...prev, tag: e.target.value }))} placeholder="daily / weekly" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Order</label>
            <Input type="number" value={videoForm.displayOrder} onChange={(e) => setVideoForm((prev) => ({ ...prev, displayOrder: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={videoForm.description} onChange={(e) => setVideoForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} />
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={videoForm.isFeatured} onChange={(e) => setVideoForm((prev) => ({ ...prev, isFeatured: e.target.checked }))} />
              Featured badge
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={videoForm.isPublished} onChange={(e) => setVideoForm((prev) => ({ ...prev, isPublished: e.target.checked }))} />
              Published
            </label>
            {videoForm.id && (
              <Button type="button" variant="ghost" size="sm" onClick={resetVideoForm}>
                Cancel edit
              </Button>
            )}
            <Button type="submit" disabled={videoSaving}>
              {videoSaving ? 'Saving…' : videoForm.id ? 'Update Video' : 'Add Video'}
            </Button>
          </div>
        </form>
        <Separator />
        <div className="grid gap-4">
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No videos yet.</p>
          ) : (
            videos.map((video) => (
              <div key={video.id} className="flex flex-col gap-2 border rounded-xl p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{video.title}</p>
                  <p className="text-xs text-muted-foreground">{video.videoUrl}</p>
                  <p className="text-xs text-muted-foreground">Tag: {video.tag || '—'} · Order {video.displayOrder}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEditVideo(video)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteVideo(video.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Attach Quizzes</h2>
            <p className="text-sm text-muted-foreground">Link existing exams (mock tests or quizzes) to appear in the "Current Affairs Quizzes" rail.</p>
          </div>
        </div>
        <form onSubmit={handleQuizSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Search exam *</label>
            <div className="relative">
              <Input value={examSearch} onChange={(e) => setExamSearch(e.target.value)} placeholder="Search existing exams" />
              {searchingExams && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Attach exam: {examLabel}</p>
            {examResults.length > 0 && (
              <div className="mt-2 border rounded-md max-h-56 overflow-auto">
                {examResults.map((exam) => (
                  <button
                    type="button"
                    key={exam.id}
                    onClick={() => {
                      setQuizForm((prev) => ({ ...prev, examId: exam.id }));
                      setExamSearch(exam.title);
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-muted ${quizForm.examId === exam.id ? 'bg-muted' : ''}`}
                  >
                    {exam.title}
                    <span className="text-xs text-muted-foreground ml-2">{exam.category || exam.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Highlight Label</label>
              <Input value={quizForm.highlightLabel} onChange={(e) => setQuizForm((prev) => ({ ...prev, highlightLabel: e.target.value }))} placeholder="Daily Quiz" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Badge</label>
              <Input value={quizForm.badge} onChange={(e) => setQuizForm((prev) => ({ ...prev, badge: e.target.value }))} placeholder="Free" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tag</label>
              <Input value={quizForm.tag} onChange={(e) => setQuizForm((prev) => ({ ...prev, tag: e.target.value }))} placeholder="daily / weekly" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Order</label>
              <Input type="number" value={quizForm.displayOrder} onChange={(e) => setQuizForm((prev) => ({ ...prev, displayOrder: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Summary</label>
            <Textarea value={quizForm.summary} onChange={(e) => setQuizForm((prev) => ({ ...prev, summary: e.target.value }))} rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={quizForm.isPublished} onChange={(e) => setQuizForm((prev) => ({ ...prev, isPublished: e.target.checked }))} />
              Published
            </label>
            {quizForm.id && (
              <Button type="button" variant="ghost" size="sm" onClick={resetQuizForm}>
                Cancel edit
              </Button>
            )}
            <Button type="submit" disabled={quizSaving}>
              {quizSaving ? 'Saving…' : quizForm.id ? 'Update Entry' : 'Add Entry'}
            </Button>
          </div>
        </form>
        <Separator />
        <div className="grid gap-4">
          {quizzes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quiz entries yet.</p>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-xl p-4">
                <div>
                  <p className="font-medium">{quiz.exam?.title || quiz.examId}</p>
                  <p className="text-xs text-muted-foreground">
                    {quiz.highlightLabel || '—'} · Badge: {quiz.badge || '—'} · Order {quiz.displayOrder}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEditQuiz(quiz)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteQuiz(quiz.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Notes (Block Editor)</h2>
            <p className="text-sm text-muted-foreground">Open any blog in the editor and enable "Current Affairs Note" to have it appear on the public page.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/admin/blogs" className="inline-flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Go to Blogs
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {quizzes.length === 0 && videos.length === 0 && (
            <p className="text-sm text-muted-foreground">Notes will populate automatically once they are marked inside the blog editor.</p>
          )}
          {quizzes.length > 0 && (
            <p className="text-sm text-muted-foreground">Current number of linked quizzes: {quizzes.length}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
