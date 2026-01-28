"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, MapPin, Star, Building2, Award, TrendingUp, 
  DollarSign, Users, CheckCircle, ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/common/LoadingStates';
import { collegeService } from '@/lib/api/collegeService';
import { College, CollegeFee, CollegeFeeBreakdown } from '@/types';

export default function CollegeDetailPage() {
  const params = useParams();
  const collegeId = params.id as string;

  const [college, setCollege] = useState<College | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCollegeDetails();
  }, [collegeId]);

  const fetchCollegeDetails = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await collegeService.getCollegeById(collegeId);
      setCollege(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load college details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingPage message="Loading college details..." />;
  }

  if (error || !college) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container-main">
          <div className="max-w-2xl mx-auto text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {error || 'College not found'}
            </h2>
            <Link href="/colleges">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Colleges
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const feeEntries = (() => {
    const fees = college.fees;
    if (!fees) {
      return [] as Array<{
        key: string;
        course: string;
        fee: number;
        currency?: string;
      }>;
    }

    if (Array.isArray(fees)) {
      return fees.map((fee: CollegeFee, index) => ({
        key: fee.id || `${college.id}-fee-${index}`,
        course: fee.course,
        fee: fee.fee,
        currency: fee.currency || college.fees_summary?.currency || 'INR'
      }));
    }

    const breakdown = fees as CollegeFeeBreakdown;
    if (Array.isArray(breakdown.details)) {
      return breakdown.details.map((detail, index) => ({
        key: `${college.id}-fee-detail-${index}`,
        course: detail.program || detail.course || 'Course',
        fee: detail.fee,
        currency:
          detail.currency ||
          breakdown.currency ||
          college.fees_summary?.currency ||
          'INR'
      }));
    }

    return [];
  })();

  const hasFeeEntries = feeEntries.length > 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <section className="gradient-hero py-12">
        <div className="container-main">
          <Link href="/colleges" className="inline-flex items-center text-background/80 hover:text-background mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Colleges
          </Link>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1">
              {college.logo_url && (
                <div className="mb-4">
                  <img 
                    src={college.logo_url} 
                    alt={college.name}
                    className="h-20 w-20 object-contain bg-background rounded-lg p-2"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-background/20 text-background text-sm capitalize">
                  {college.type}
                </span>
                {college.ranking && (
                  <span className="px-3 py-1 rounded-full bg-warning/20 text-warning text-sm">
                    Rank #{college.ranking}
                  </span>
                )}
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-bold text-background mb-4">
                {college.name}
              </h1>

              <div className="flex flex-wrap gap-4 text-background/90 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>{college.location}</span>
                </div>
                {college.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-current" />
                    <span>{college.rating}/5.0</span>
                  </div>
                )}
                {college.established && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <span>Est. {college.established}</span>
                  </div>
                )}
              </div>

              {college.website && (
                <a 
                  href={college.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-background hover:text-background/80"
                >
                  <ExternalLink className="h-4 w-4" />
                  Visit Website
                </a>
              )}
            </div>

            {college.image_url && (
              <div className="lg:w-96">
                <img 
                  src={college.image_url}
                  alt={college.name}
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
            {/* Overview */}
            {college.overview && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                  Overview
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {college.overview}
                </p>
              </div>
            )}

            {/* Accreditations */}
            {college.accreditations && college.accreditations.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                  Accreditations
                </h2>
                <div className="flex flex-wrap gap-3">
                  {college.accreditations.map((acc, index) => (
                    <div 
                      key={index}
                      className="px-4 py-2 bg-primary/10 text-primary rounded-lg border border-primary/20 font-medium"
                    >
                      {acc}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Facilities */}
            {college.facilities && college.facilities.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                  Facilities
                </h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {college.facilities.map((facility, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      <span className="text-foreground">{facility}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fee Structure */}
            {hasFeeEntries && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                  Fee Structure
                </h2>
                <div className="space-y-3">
                  {feeEntries.map((fee) => (
                    <div 
                      key={fee.key}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <span className="font-medium text-foreground">{fee.course}</span>
                      <span className="font-bold text-primary">
                        {fee.currency} {fee.fee.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cutoffs */}
            {college.cutoffs && college.cutoffs.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                  Cutoff Trends
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Exam</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Year</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Category</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {college.cutoffs.slice(0, 5).map((cutoff) => (
                        <tr key={cutoff.id} className="border-b border-border/50">
                          <td className="py-3 px-4 text-foreground">{cutoff.exam}</td>
                          <td className="py-3 px-4 text-muted-foreground">{cutoff.year}</td>
                          <td className="py-3 px-4 text-muted-foreground">{cutoff.category}</td>
                          <td className="py-3 px-4 font-semibold text-primary">{cutoff.rank}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-semibold text-foreground capitalize">{college.type}</span>
                </div>
                {college.ranking && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ranking</span>
                    <span className="font-semibold text-foreground">#{college.ranking}</span>
                  </div>
                )}
                {college.rating && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rating</span>
                    <span className="font-semibold text-foreground">{college.rating}/5.0</span>
                  </div>
                )}
                {college.established && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Established</span>
                    <span className="font-semibold text-foreground">{college.established}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Placements */}
            {college.placements && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  Placements
                </h3>
                <div className="space-y-4">
                  {college.placements.average_package && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Average Package</p>
                      <p className="text-2xl font-bold text-success">
                        ₹{college.placements.average_package} LPA
                      </p>
                    </div>
                  )}
                  {college.placements.highest_package && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Highest Package</p>
                      <p className="text-2xl font-bold text-primary">
                        ₹{college.placements.highest_package} LPA
                      </p>
                    </div>
                  )}
                  {college.placements.placement_percentage && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Placement Rate</p>
                      <p className="text-2xl font-bold text-warning">
                        {college.placements.placement_percentage}%
                      </p>
                    </div>
                  )}
                </div>

                {college.placements.top_recruiters && college.placements.top_recruiters.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-sm font-semibold text-foreground mb-3">Top Recruiters</p>
                    <div className="flex flex-wrap gap-2">
                      {college.placements.top_recruiters.slice(0, 6).map((recruiter, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-muted text-xs rounded"
                        >
                          {recruiter}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Apply CTA */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-primary-foreground">
              <h3 className="font-display text-xl font-bold mb-2">
                Interested?
              </h3>
              <p className="text-sm opacity-90 mb-4">
                Get more information about admissions and courses.
              </p>
              {college.website && (
                <a href={college.website} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Website
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
