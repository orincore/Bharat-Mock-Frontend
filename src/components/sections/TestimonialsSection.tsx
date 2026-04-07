"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { testimonialsService, Testimonial } from "@/lib/api/testimonialsService";
import { cn } from "@/lib/utils";

interface TestimonialsSectionProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  limit?: number;
  className?: string;
}

const limitWords = (value: string, limit = 90) => {
  const words = value.trim().split(/\s+/);
  if (words.length <= limit) return value.trim();
  return `${words.slice(0, limit).join(" ")}…`;
};

const formatTestimonialContent = (content: string) => limitWords(content || "", 90);

const scrollByOffset = (ref: React.RefObject<HTMLDivElement>, offset: number) => {
  if (ref.current) {
    ref.current.scrollBy({ left: offset, behavior: "smooth" });
  }
};

export function TestimonialsSection({
  eyebrow = "View Reviews",
  title = "Trusted by Aspirants",
  description = "Real feedback from toppers and serious contenders—curated from app reviews and our student community—to remind you that consistent practice here translates into real selection stories.",
  limit = 12,
  className
}: TestimonialsSectionProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      setLoading(true);
      try {
        const data = await testimonialsService.getPublicTestimonials(limit);
        setTestimonials(data);
      } catch (error) {
        console.error("Failed to load testimonials", error);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, [limit]);

  const sectionContent = useMemo(() => {
    if (loading) {
      return (
        <div className="flex gap-4 overflow-x-auto hide-scrollbar">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex-shrink-0 w-80">
              <Skeleton className="h-56 w-full rounded-2xl bg-white/60" />
            </div>
          ))}
        </div>
      );
    }

    if (testimonials.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-white/70 bg-white/70 p-10 text-center">
          <h3 className="font-display text-2xl font-semibold text-slate-900 mb-2">No stories yet</h3>
          <p className="text-slate-600">New testimonials will appear here as admins publish them.</p>
        </div>
      );
    }

    return (
      <div className="relative group">
        <button
          onClick={() => scrollByOffset(scrollRef, -320)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          aria-label="Scroll testimonials left"
        >
          <ChevronLeft className="h-5 w-5 text-slate-700" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto px-4 -mx-4 sm:px-0 sm:mx-0 pb-6 snap-x snap-mandatory hide-scrollbar scroll-smooth"
        >
          {testimonials.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-[17rem] sm:w-[22rem] max-w-[85vw] snap-start">
              <div className="relative h-full rounded-3xl bg-gradient-to-br from-white via-white to-white/80 p-[1px] shadow-lg">
                <div className="h-full rounded-[calc(1.5rem-1px)] bg-white/95 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    {item.profilePhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.profilePhotoUrl}
                        alt={item.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-base font-semibold text-orange-600">
                        {item.name?.slice(0, 1) || "A"}
                      </div>
                    )}
                    <div>
                      <p className="text-base font-semibold text-slate-900">{item.name}</p>
                      {item.exam && (
                        <p className="text-xs font-medium uppercase tracking-wide text-orange-500">{item.exam}</p>
                      )}
                    </div>
                    {item.highlight && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                    “{formatTestimonialContent(item.review || "")}”
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => scrollByOffset(scrollRef, 320)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          aria-label="Scroll testimonials right"
        >
          <ChevronRight className="h-5 w-5 text-slate-700" />
        </button>
      </div>
    );
  }, [loading, testimonials]);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,_#fef3c7,_#fdf2f8_50%,_#f5f3ff)] border border-border/40 p-5 sm:p-8 md:p-12",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-16 -right-24 h-64 w-64 rounded-full bg-orange-200 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-pink-200 blur-3xl" />
      </div>

      <div className="relative z-10 space-y-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
              {eyebrow}
            </div>
            <h2 className="font-display text-2xl md:text-4xl font-semibold text-slate-900 leading-tight whitespace-nowrap">
              {title}
            </h2>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
        </div>

        <div className="relative">{sectionContent}</div>
      </div>
    </section>
  );
}
