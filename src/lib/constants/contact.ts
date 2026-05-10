import { ContactInfo } from '@/types';
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaWhatsapp,
  FaTelegram,
  FaGlobe,
  FaGithub,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';

export const socialIconMap: Record<string, IconType> = {
  facebook:  FaFacebook,
  twitter:   FaTwitter,
  instagram: FaInstagram,
  linkedin:  FaLinkedin,
  youtube:   FaYoutube,
  whatsapp:  FaWhatsapp,
  telegram:  FaTelegram,
  website:   FaGlobe,
  github:    FaGithub,
};

export const fallbackContactInfo: ContactInfo = {
  id: 'fallback-contact',
  headline: 'Connect with Bharat Mock',
  subheading: 'We respond within 24 hours on business days',
  description:
    "Whether you're preparing for your next big examination or need help with our platform, our support specialists are ready to guide you.",
  support_email: 'info@bharatmock.com',
  support_phone: '+91 8806727785',
  whatsapp_number: '+91 8806727785',
  address_line1: 'Gondia',
  address_line2: 'Nagpur',
  city: 'Maharashtra',
  state: '',
  postal_code: '441911',
  country: 'India',
  support_hours: 'Monday - Saturday · 9:00 AM to 8:00 PM IST',
  map_embed_url: 'https://www.google.com/maps?q=Gondia,Maharashtra&output=embed',
  contact_social_links: [
    { id: 'fb', platform: 'facebook', label: 'Facebook', url: 'https://facebook.com/bharatmock', icon: 'facebook', display_order: 0, is_active: true },
    { id: 'ig', platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/bharatmock', icon: 'instagram', display_order: 1, is_active: true },
    { id: 'li', platform: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/bharatmock', icon: 'linkedin', display_order: 2, is_active: true },
    { id: 'yt', platform: 'youtube', label: 'YouTube', url: 'https://youtube.com/@bharatmock', icon: 'youtube', display_order: 3, is_active: true },
    { id: 'tw', platform: 'twitter', label: 'Twitter', url: 'https://twitter.com/bharatmock', icon: 'twitter', display_order: 4, is_active: true }
  ]
};
