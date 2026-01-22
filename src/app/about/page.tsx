"use client";

import Image from 'next/image';
import { Target, Users, Award, BookOpen, TrendingUp } from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      icon: Target,
      title: 'Our Mission',
      description: 'To democratize quality exam preparation and make it accessible to every student in India.'
    },
    {
      icon: Users,
      title: 'Student-Centric',
      description: 'Every feature is designed with student success and learning outcomes in mind.'
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'We maintain the highest standards in content quality and platform reliability.'
    },
    {
      icon: TrendingUp,
      title: 'Innovation',
      description: 'Continuously evolving with the latest educational technology and methodologies.'
    }
  ];

  const stats = [
    { value: '1M+', label: 'Active Students' },
    { value: '500+', label: 'Mock Tests' },
    { value: '95%', label: 'Success Rate' },
    { value: '50+', label: 'Exam Categories' }
  ];

  return (
    <div className="min-h-screen">
      <section className="gradient-hero py-20">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="relative h-16 w-48">
                <Image
                  src="/logo.png"
                  alt="Bharat Mock Logo"
                  fill
                  sizes="(min-width: 768px) 240px, 180px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-background mb-6">
              About Bharat Mock
            </h1>
            <p className="text-lg text-background/80">
              India's leading online exam preparation platform, empowering millions of students 
              to achieve their academic and career goals.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl font-bold text-foreground mb-6 text-center">
              Our Story
            </h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-muted-foreground mb-4">
                Founded in 2020, Bharat Mock was born from a simple observation: quality exam 
                preparation resources were either too expensive or not comprehensive enough for 
                the average Indian student.
              </p>
              <p className="text-muted-foreground mb-4">
                We set out to change that by creating a platform that combines the best of 
                technology and pedagogy. Our team of educators, technologists, and exam experts 
                work tirelessly to ensure every student has access to world-class preparation 
                materials.
              </p>
              <p className="text-muted-foreground">
                Today, Bharat Mock serves over a million students across India, helping them 
                prepare for JEE, NEET, CAT, UPSC, and dozens of other competitive exams. Our 
                success is measured not in revenue, but in the dreams we help realize.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-main">
          <h2 className="font-display text-3xl font-bold text-foreground mb-12 text-center">
            Our Values
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 text-primary mb-4">
                  <value.icon className="h-8 w-8" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-main">
          <h2 className="font-display text-3xl font-bold text-foreground mb-12 text-center">
            Our Impact
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </p>
                <p className="text-muted-foreground text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl font-bold text-foreground mb-6 text-center">
              What We Offer
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-xl border border-border">
                <BookOpen className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  Comprehensive Mock Tests
                </h3>
                <p className="text-muted-foreground text-sm">
                  Practice with exam-pattern mock tests designed by subject matter experts.
                </p>
              </div>
              <div className="bg-card p-6 rounded-xl border border-border">
                <Target className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  Detailed Analytics
                </h3>
                <p className="text-muted-foreground text-sm">
                  Track your progress with in-depth performance analysis and insights.
                </p>
              </div>
              <div className="bg-card p-6 rounded-xl border border-border">
                <Users className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  Expert Guidance
                </h3>
                <p className="text-muted-foreground text-sm">
                  Learn from experienced educators and successful exam toppers.
                </p>
              </div>
              <div className="bg-card p-6 rounded-xl border border-border">
                <Award className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  College & Career Info
                </h3>
                <p className="text-muted-foreground text-sm">
                  Access comprehensive information about colleges, courses, and career paths.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
