import { AboutPageData } from '@/types';
import {
  Target,
  Users,
  Award,
  BookOpen,
  TrendingUp,
  Zap,
  Star,
  Shield,
  MessageCircle,
  Map,
  Clock,
  BarChart3,
  HeartHandshake,
  LucideIcon
} from 'lucide-react';

export const aboutIconRegistry: Record<string, LucideIcon> = {
  target: Target,
  bullseye: Target,
  mission: Target,
  users: Users,
  people: Users,
  community: Users,
  award: Award,
  trophy: Award,
  excellence: Award,
  book: BookOpen,
  'book-open': BookOpen,
  learning: BookOpen,
  'trending-up': TrendingUp,
  growth: TrendingUp,
  zap: Zap,
  star: Star,
  shield: Shield,
  support: MessageCircle,
  'message-circle': MessageCircle,
  map: Map,
  journey: Map,
  clock: Clock,
  'bar-chart-3': BarChart3,
  analytics: BarChart3,
  'heart-handshake': HeartHandshake
};

export const fallbackAboutData: AboutPageData = {
  content: {
    id: 'fallback-about-content',
    hero_heading: "India's exam prep partner for ambitious students",
    hero_subheading: 'Bharat Mock is building an equitable learning runway for every aspirant.',
    hero_description:
      'From metro cities to tier-3 towns, we deliver premium mock exams, analytics, and mentorship so that talent is limited only by imagination—not geography.',
    hero_badge: 'Trusted by 1.2M+ learners',
    mission_heading: 'Mission-first, student-obsessed',
    mission_body:
      'Democratize quality preparation through immersive mock exams, local-language support, and data-backed guidance that keeps students confident through every milestone.',
    story_heading: 'From a small Discord group to a nationwide platform',
    story_body:
      'We launched in 2020 with a community of 50 aspirants. Today, Bharat Mock powers learning journeys for students targeting JEE, NEET, UPSC, SSC, Banking, and more. Our team blends educators, engineers, and designers who obsess over every exam-day detail.',
    impact_heading: 'Impact that compounds every season',
    impact_body:
      'Learners clock 6M+ practice hours on the platform annually, saving an average of ₹18,000 compared to offline coaching while accessing richer analytics and continuous mentorship.',
    offerings_heading: 'What makes us different',
    offerings_body: 'Beyond question banks, we deliver structured programs—mock marathons, crash rooms, and doubt clinics—that mimic the adrenaline of the real exam hall.',
    cta_label: 'Meet our leadership',
    cta_href: '/contact'
  },
  values: [
    {
      id: 'value-1',
      title: 'Student Obsession',
      description: 'Every product decision begins with learner interviews, not vanity metrics.',
      icon: 'users',
      display_order: 0,
      is_active: true
    },
    {
      id: 'value-2',
      title: 'Academic Rigor',
      description: 'Question banks are authored and reviewed by toppers, teachers, and psychometricians.',
      icon: 'book-open',
      display_order: 1,
      is_active: true
    },
    {
      id: 'value-3',
      title: 'Rapid Iteration',
      description: 'Weekly product sprints let us ship faster than legacy coaching players.',
      icon: 'zap',
      display_order: 2,
      is_active: true
    },
    {
      id: 'value-4',
      title: 'Inclusive Access',
      description: 'Scholarships, Hindi-first content, and low-bandwidth modes keep prep accessible.',
      icon: 'heart-handshake',
      display_order: 3,
      is_active: true
    }
  ],
  stats: [
    {
      id: 'stat-1',
      label: 'Active Learners',
      value: '1.2M+',
      helper_text: 'across 28 states',
      display_order: 0,
      is_active: true
    },
    {
      id: 'stat-2',
      label: 'Mock Tests Delivered',
      value: '7.5M',
      helper_text: 'and counting since 2020',
      display_order: 1,
      is_active: true
    },
    {
      id: 'stat-3',
      label: 'Scholarship Grants',
      value: '₹3.4 Cr',
      helper_text: 'awarded to deserving aspirants',
      display_order: 2,
      is_active: true
    },
    {
      id: 'stat-4',
      label: 'Partner Institutes',
      value: '250+',
      helper_text: 'co-creating programs and bootcamps',
      display_order: 3,
      is_active: true
    }
  ],
  offerings: [
    {
      id: 'offering-1',
      title: 'Adaptive Mock Rooms',
      description: 'Timed simulations with AI invigilation keep practice authentic and disciplined.',
      icon: 'clock',
      display_order: 0,
      is_active: true
    },
    {
      id: 'offering-2',
      title: 'Personalized Analytics',
      description: 'Gap analysis, percentile charts, and confidence meters unlock smarter revision.',
      icon: 'bar-chart-3',
      display_order: 1,
      is_active: true
    },
    {
      id: 'offering-3',
      title: 'Mentor Hotline',
      description: 'Certified mentors answer strategy questions via chat, voice notes, or weekly AMAs.',
      icon: 'message-circle',
      display_order: 2,
      is_active: true
    },
    {
      id: 'offering-4',
      title: 'College & Career Navigator',
      description: 'One-click guidance on cut-offs, application timelines, and financial planning.',
      icon: 'map',
      display_order: 3,
      is_active: true
    }
  ]
};
