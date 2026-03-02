"use client";

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Eye, EyeOff, Plus, Edit2, Trash2, X, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { testimonialsService, Testimonial, CreateTestimonialData, UpdateTestimonialData } from '@/lib/api/testimonialsService';
import { useToast } from '@/hooks/use-toast';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';
import { cn } from '@/lib/utils';

interface FormData {
  name: string;
  review: string;
  exam: string;
  displayOrder: number;
}

export default function AdminTestimonialsPage() {
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [filteredTestimonials, setFilteredTestimonials] = useState<Testimonial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', review: '', exam: '', displayOrder: 0 });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const reviewWordCount = useMemo(() => {
    if (!formData.review.trim()) return 0;
    return formData.review.trim().split(/\s+/).filter(Boolean).length;
  }, [formData.review]);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  useEffect(() => {
    const filtered = testimonials.filter((testimonial) => {
      const term = searchTerm.toLowerCase();
      return (
        testimonial.name?.toLowerCase().includes(term) ||
        testimonial.exam?.toLowerCase().includes(term) ||
        testimonial.review.toLowerCase().includes(term)
      );
    });
    setFilteredTestimonials(filtered);
  }, [searchTerm, testimonials]);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const data = await testimonialsService.adminList();
      setTestimonials(data);
      setFilteredTestimonials(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load testimonials',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', review: '', exam: '', displayOrder: 0 });
    setProfilePhoto(null);
    setPhotoPreview(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingId(testimonial.id);
    setFormData({
      name: testimonial.name,
      review: testimonial.review,
      exam: testimonial.exam || '',
      displayOrder: testimonial.displayOrder
    });
    setPhotoPreview(testimonial.profilePhotoUrl || null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.review.trim()) {
      toast({ title: 'Error', description: 'Name and review are required', variant: 'destructive' });
      return;
    }

    if (reviewWordCount > 100) {
      toast({ title: 'Limit exceeded', description: 'Please keep the review within 100 words.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const updated = await testimonialsService.adminUpdate(editingId, formData, profilePhoto || undefined);
        setTestimonials((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
        toast({ title: 'Success', description: 'Testimonial updated' });
      } else {
        const created = await testimonialsService.adminCreate(formData, profilePhoto || undefined);
        setTestimonials((prev) => [created, ...prev]);
        toast({ title: 'Success', description: 'Testimonial created' });
      }
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save testimonial', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return;
    try {
      await testimonialsService.adminDelete(id);
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'Success', description: 'Testimonial deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleToggleHighlight = async (testimonialId: string, highlight: boolean) => {
    setUpdatingId(testimonialId);
    try {
      const updated = await testimonialsService.adminUpdate(testimonialId, { highlight });
      setTestimonials((prev) => prev.map((t) => (t.id === testimonialId ? updated : t)));
      toast({ title: 'Success', description: 'Highlight status updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTogglePublish = async (testimonialId: string, isPublished: boolean) => {
    setUpdatingId(testimonialId);
    try {
      const updated = await testimonialsService.adminUpdate(testimonialId, { isPublished });
      setTestimonials((prev) => prev.map((t) => (t.id === testimonialId ? updated : t)));
      toast({ title: 'Success', description: 'Publication status updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Breadcrumbs
        items={[AdminBreadcrumb(), { label: 'Testimonials' }]}
        className="mb-4"
      />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Testimonials</h1>
          <p className="text-sm text-muted-foreground">Create and manage testimonials with profile photos.</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="w-4 h-4 mr-2" />
          Add Testimonial
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'Create'} Testimonial</h2>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Profile Photo</label>
              <div className="mt-2 flex items-center gap-4">
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
                )}
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload Photo</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Exam</label>
              <Input
                value={formData.exam}
                onChange={(e) => setFormData({ ...formData, exam: e.target.value })}
                placeholder="e.g., SSC CGL 2024"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Review *</label>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Review *</span>
                  <span className={cn(reviewWordCount > 100 && 'text-red-500 font-semibold')}>
                    {reviewWordCount} / 100 words
                  </span>
                </div>
                <Textarea
                  value={formData.review}
                  onChange={(e) => {
                    const value = e.target.value;
                    const words = value.trim().split(/\s+/).filter(Boolean);
                    if (words.length > 100) {
                      const limited = words.slice(0, 100).join(' ');
                      setFormData({ ...formData, review: limited });
                    } else {
                      setFormData({ ...formData, review: value });
                    }
                  }}
                  placeholder="Enter testimonial review"
                  rows={4}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Display Order</label>
              <Input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search testimonials by name, email, or content"
            className="pl-9"
          />
        </div>
      </div>

      {filteredTestimonials.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No testimonials found.
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTestimonials.map((testimonial) => (
            <Card key={testimonial.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {testimonial.profilePhotoUrl && (
                      <img
                        src={testimonial.profilePhotoUrl}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      {testimonial.exam && (
                        <p className="text-xs text-muted-foreground">{testimonial.exam}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line mb-2">
                    {testimonial.review}
                  </p>
                  <p className="text-xs text-muted-foreground">Display Order: {testimonial.displayOrder}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(testimonial)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant={testimonial.highlight ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleHighlight(testimonial.id, !testimonial.highlight)}
                    disabled={updatingId === testimonial.id}
                  >
                    {testimonial.highlight ? 'Highlighted' : 'Highlight'}
                  </Button>
                  <Button
                    variant={testimonial.isPublished ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={() => handleTogglePublish(testimonial.id, !testimonial.isPublished)}
                    disabled={updatingId === testimonial.id}
                  >
                    {testimonial.isPublished ? (
                      <>
                        <Eye className="w-4 h-4 mr-1" />
                        Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        Hidden
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(testimonial.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
