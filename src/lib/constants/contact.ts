import { ContactInfo } from '@/types';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  MessageCircle,
  Send,
  Globe,
  Github,
  LucideIcon
} from 'lucide-react';

export const socialIconMap: Record<string, LucideIcon> = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  whatsapp: MessageCircle,
  telegram: Send,
  website: Globe,
  github: Github
};

export const fallbackContactInfo: ContactInfo = {
  id: 'fallback-contact',
  headline: 'Connect with Bharat Mock',
  subheading: 'We respond within 24 hours on business days',
  description:
    "Whether you're preparing for your next big examination or need help with our platform, our support specialists are ready to guide you.",
  support_email: 'support@bharatmock.com',
  support_phone: '+91 1800-123-4567',
  whatsapp_number: '+91 98765-43210',
  address_line1: '5th Floor, Aurora Business Park',
  address_line2: 'HSR Layout Sector 6',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560102',
  country: 'India',
  support_hours: 'Monday - Saturday · 9:00 AM to 8:00 PM IST',
  map_embed_url:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.8894897918354!2d77.6411544751557!3d12.91413898740154!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae15d6e7c2f72b%3A0x7e1df6ebadc177a8!2sHSR%20Layout%20Sector%206!5e0!3m2!1sen!2sin!4v1707571200000!5m2!1sen!2sin',
  contact_social_links: [
    { id: 'fb', platform: 'facebook', label: 'Facebook', url: 'https://facebook.com/bharatmock', icon: 'facebook', display_order: 0, is_active: true },
    { id: 'ig', platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/bharatmock', icon: 'instagram', display_order: 1, is_active: true },
    { id: 'li', platform: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/bharatmock', icon: 'linkedin', display_order: 2, is_active: true },
    { id: 'yt', platform: 'youtube', label: 'YouTube', url: 'https://youtube.com/@bharatmock', icon: 'youtube', display_order: 3, is_active: true },
    { id: 'tw', platform: 'twitter', label: 'Twitter', url: 'https://twitter.com/bharatmock', icon: 'twitter', display_order: 4, is_active: true }
  ]
};
