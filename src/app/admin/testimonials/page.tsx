"use client";

import { useEffect, useState } from 'react';
import { Loader2, Search, Eye, EyeOff, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { testimonialsService, Testimonial } from '@/lib/api/testimonialsService';
import { useToast } from '@/hooks/use-toast';
import { Breadcrumbs, AdminBreadcrumb } from '@/components/ui/breadcrumbs';
import { cn } from '@/lib/utils';

export default function AdminTestimonialsPage() {
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [filteredTestimonials, setFilteredTestimonials] = useState<Testimonial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  useEffect(() => {
    const filtered = testimonials.filter((testimonial) => {
      const term = searchTerm.toLowerCase();
      return (
        testimonial.user?.name?.toLowerCase().includes(term) ||
        testimonial.user?.email?.toLowerCase().includes(term) ||
        testimonial.content.toLowerCase().includes(term)
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

  const handleToggleHighlight = async (testimonialId: string, highlight: boolean) => {
    setUpdatingId(testimonialId);
    try {
      const updated = await testimonialsService.adminUpdate(testimonialId, { highlight });
      setTestimonials((prev) => prev.map((t) => (t.id === testimonialId ? updated : t)));
      toast({ title: 'Success', description: 'Highlight status updated' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update highlight status',
        variant: 'destructive'
      });
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
      toast({
        title: 'Error',
        description: error.message || 'Failed to update publication status',
        variant: 'destructive'
      });
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
          <p className="text-sm text-muted-foreground">Moderate user feedback, highlight the best ones, and control visibility.</p>
        </div>
      </div>

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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {testimonial.user?.name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {testimonial.user?.email || 'No email provided'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 ml-2">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={cn('w-4 h-4', index < testimonial.rating ? 'fill-current' : 'text-gray-300')}
                        />
                      ))}
                    </div>
                  </div>
                  {testimonial.title && (
                    <p className="text-sm font-medium text-foreground mb-1">{testimonial.title}</p>
                  )}
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {testimonial.content}
                  </p>
                </div>

                <div className="flex items-center gap-3">
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
