"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, GraduationCap, Clock, TrendingUp, CheckCircle, 
  Building2, Briefcase, DollarSign 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';
import { courseService } from '@/lib/api/courseService';
import { Course } from '@/types';

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await courseService.getCourseById(courseId);
      setCourse(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load course details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingPage message="Loading course details..." />;
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container-main">
          <div className="max-w-2xl mx-auto text-center">
            <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {error || 'Course not found'}
            </h2>
            <Link href="/courses">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <section className="gradient-hero py-12">
        <div className="container-main">
          <Link href="/courses" className="inline-flex items-center text-background/80 hover:text-background mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Link>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-background/20 text-background text-sm capitalize">
                  {course.level}
                </span>
                <span className="px-3 py-1 rounded-full bg-warning/20 text-warning text-sm">
                  {course.duration}
                </span>
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-bold text-background mb-4">
                {course.name}
              </h1>

              {course.description && (
                <p className="text-lg text-background/80 mb-6">
                  {course.description}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-background/90">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  <span className="capitalize">{course.level}</span>
                </div>
                {course.average_salary && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    <span>₹{course.average_salary} LPA avg</span>
                  </div>
                )}
              </div>
            </div>

            {course.image_url && (
              <div className="lg:w-96">
                <img 
                  src={course.image_url}
                  alt={course.name}
                  className="w-full h-64 object-cover rounded-xl border-4 border-background/20"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container-main py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Overview */}
            {course.description && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                  Course Overview
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {course.description}
                </p>
              </div>
            )}

            {/* Eligibility */}
            {course.eligibility && course.eligibility.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                  Eligibility Criteria
                </h2>
                <div className="space-y-3">
                  {course.eligibility.map((criteria, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <p className="text-foreground">{criteria}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Career Prospects */}
            {course.career_prospects && course.career_prospects.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Briefcase className="h-6 w-6 text-primary" />
                  Career Prospects
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {course.career_prospects.map((prospect, index) => (
                    <div 
                      key={index}
                      className="p-4 bg-muted/50 rounded-lg border border-border"
                    >
                      <p className="font-medium text-foreground">{prospect}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Colleges */}
            {course.top_colleges && course.top_colleges.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  Top Colleges Offering This Course
                </h2>
                <div className="space-y-3">
                  {course.top_colleges.map((college, index) => (
                    <div 
                      key={index}
                      className="p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <p className="font-semibold text-foreground">{college}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">
                Quick Info
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-semibold text-foreground capitalize">{course.level}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-semibold text-foreground">{course.duration}</span>
                </div>
                {course.average_salary && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Avg Salary</span>
                    <span className="font-semibold text-success">₹{course.average_salary} LPA</span>
                  </div>
                )}
              </div>
            </div>

            {/* Salary Potential */}
            {course.average_salary && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  Salary Potential
                </h3>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-3">
                    <TrendingUp className="h-10 w-10 text-success" />
                  </div>
                  <p className="text-3xl font-bold text-success mb-1">
                    ₹{course.average_salary}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Average Annual Package
                  </p>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-primary-foreground">
              <h3 className="font-display text-xl font-bold mb-2">
                Interested in this course?
              </h3>
              <p className="text-sm opacity-90 mb-4">
                Explore colleges offering this course and start your journey.
              </p>
              <Link href="/colleges">
                <Button variant="secondary" className="w-full">
                  <Building2 className="h-4 w-4 mr-2" />
                  Explore Colleges
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
