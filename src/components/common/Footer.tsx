"use client";

import Link from 'next/link';
import Image from '@/components/common/Image';
import { Mail, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaTwitter,
} from 'react-icons/fa';

const CONTACT = {
  email: 'info@bharatmock.com',
  phone: '+91 8806727785',
};

const SOCIAL_LINKS = [
  { label: 'Facebook',  href: 'https://www.facebook.com/bharatmock',        Icon: FaFacebook },
  { label: 'Instagram', href: 'https://www.instagram.com/bharatmock',       Icon: FaInstagram },
  { label: 'LinkedIn',  href: 'https://linkedin.com/company/bharatmock',    Icon: FaLinkedin },
  { label: 'YouTube',   href: 'https://www.youtube.com/@bharatmock',        Icon: FaYoutube },
  { label: 'Twitter',   href: 'https://x.com/bharatmock',                   Icon: FaTwitter },
];

export function Footer() {
  const t = useTranslations('footer');

  const FOOTER_SECTIONS = [
    {
      title: t('popularExams'),
      links: [
        { label: 'SSC',     href: '/ssc' },
        { label: 'Banking', href: '/banking' },
        { label: 'Railway', href: '/railway' },
        { label: 'Police',  href: '/police' },
      ],
    },
    {
      title: t('resources'),
      links: [
        { label: t('blogs'),              href: '/blogs' },
        { label: t('mockTest'),           href: '/mock-test-series' },
        { label: t('liveTest'),           href: '/live-tests' },
        { label: t('previousYearPapers'), href: '/previous-year-papers' },
      ],
    },
    {
      title: t('company'),
      links: [
        { label: t('aboutUs'),        href: '/about' },
        { label: t('contactUs'),      href: '/contact' },
        { label: t('privacyPolicy'),  href: '/privacy-policy' },
        { label: t('termsOfService'), href: '/terms' },
        { label: t('refundPolicy'),   href: '/refund-policy' },
      ],
    },
  ];

  return (
    <footer className="bg-foreground text-background/90">
      <div className="container-main py-6 sm:py-7">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-3">
              <div className="relative h-8 w-28 sm:h-9 sm:w-32 flex items-center">
                <Image
                  src="/logo.png"
                  alt="Bharat Mock Logo"
                  fill
                  sizes="(max-width: 768px) 160px, 180px"
                  className="object-contain"
                />
              </div>
            </Link>

            <p className="hidden sm:block text-background/70 mb-3 max-w-sm text-sm">
              {t('tagline')}
            </p>

            <div className="space-y-2.5 text-sm sm:text-xs lg:text-sm">
              <a
                href={`mailto:${CONTACT.email}`}
                className="flex items-center gap-2 text-background/70 hover:text-primary transition-colors"
                title="Email Support"
              >
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{CONTACT.email}</span>
              </a>
              <a
                href={`tel:${CONTACT.phone.replace(/\s+/g, '')}`}
                className="flex items-center gap-2 text-background/70 hover:text-primary transition-colors"
                title="Call Helpline"
              >
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{CONTACT.phone}</span>
              </a>
            </div>

            <div className="mt-3 space-y-1.5">
              <p className="text-xs uppercase tracking-widest text-background/60">Follow us</p>
              <div className="flex items-center gap-2 flex-wrap">
                {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-background/10 hover:bg-primary hover:text-primary-foreground transition-colors"
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Link sections */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-0 lg:contents">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="font-display font-semibold text-background text-sm mb-2 sm:mb-3">
                  {section.title}
                </p>
                <ul className="space-y-1.5 sm:space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-background/70 hover:text-primary transition-colors text-xs sm:text-sm"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 sm:mt-6 pt-4 border-t border-background/10 flex flex-col items-center text-center">
          <p className="text-background/60 text-xs sm:text-sm">
            © {new Date().getFullYear()} Bharat Mock. {t('rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
