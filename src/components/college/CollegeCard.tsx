"use client";

import { College, CollegeFee, CollegeFeeBreakdown } from '@/types';
import Link from 'next/link';
import { MapPin, Star, Trophy, IndianRupee, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CollegeCardProps {
  college: College;
}

export function CollegeCard({ college }: CollegeCardProps) {
  const typeColors = {
    government: 'bg-success/10 text-success border-success/30',
    private: 'bg-primary/10 text-primary border-primary/30',
    deemed: 'bg-warning/10 text-warning border-warning/30',
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${(amount / 1000).toFixed(0)}K`;
  };

  const getFeeRange = () => {
    const summary = college.fees_summary;
    if (summary?.minFee !== undefined && summary?.maxFee !== undefined) {
      return `${formatCurrency(summary.minFee)} - ${formatCurrency(summary.maxFee)}`;
    }

    const fees = college.fees;
    if (!fees) {
      return 'Data NA';
    }

    if (Array.isArray(fees)) {
      const amounts = (fees as CollegeFee[])
        .map((fee) => fee.fee)
        .filter((amount): amount is number => typeof amount === 'number' && !Number.isNaN(amount));

      if (amounts.length) {
        const min = Math.min(...amounts);
        const max = Math.max(...amounts);
        return `${formatCurrency(min)} - ${formatCurrency(max)}`;
      }
      return 'Data NA';
    }

    const breakdown = fees as CollegeFeeBreakdown;
    if (breakdown.minFee !== undefined && breakdown.maxFee !== undefined) {
      return `${formatCurrency(breakdown.minFee)} - ${formatCurrency(breakdown.maxFee)}`;
    }

    const feeDetails = breakdown.details;
    if (Array.isArray(feeDetails) && feeDetails.length) {
      const amounts = feeDetails
        .map((detail) => detail.fee)
        .filter((amount): amount is number => typeof amount === 'number' && !Number.isNaN(amount));

      if (amounts.length) {
        const min = Math.min(...amounts);
        const max = Math.max(...amounts);
        return `${formatCurrency(min)} - ${formatCurrency(max)}`;
      }
    }

    return 'Data NA';
  };

  return (
    <div className="card-interactive group overflow-hidden">
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={college.image || college.image_url || '/placeholder.svg'}
          alt={college.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        
        <div className="absolute top-3 left-3">
          <Badge className={typeColors[college.type] || 'bg-muted text-foreground border-border'}>
            {college.type.charAt(0).toUpperCase() + college.type.slice(1)}
          </Badge>
        </div>
        
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-background/90">
          <Star className="h-4 w-4 fill-warning text-warning" />
          <span className="text-sm font-medium">{college.rating ?? '—'}</span>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display font-semibold text-lg text-background line-clamp-2">
            {college.name}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="h-4 w-4 text-primary" />
          <span>{college.location}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Trophy className="h-4 w-4 text-warning" />
              <span className="text-xs">Ranking</span>
            </div>
            <p className="font-semibold text-foreground">#{college.ranking ?? '—'}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <IndianRupee className="h-4 w-4 text-success" />
              <span className="text-xs">Fees</span>
            </div>
            <p className="font-semibold text-foreground">{getFeeRange()}</p>
          </div>
        </div>

        {Array.isArray(college.courses) && college.courses.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {college.courses.slice(0, 3).map((course) => (
              <span
                key={course}
                className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
              >
                {course}
              </span>
            ))}
            {college.courses.length > 3 && (
              <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                +{college.courses.length - 3}
              </span>
            )}
          </div>
        )}

        <Link href={`/colleges/${college.id}`}>
          <Button variant="outline" className="w-full group/btn">
            View Details
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
