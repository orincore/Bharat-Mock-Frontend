"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';
import { Mail, Phone } from 'lucide-react';
import { FaEnvelope } from 'react-icons/fa';
import { useAppData } from '@/context/AppDataContext';
import { socialIconMap } from '@/lib/constants/contact';
import { mapLinksToFooterSections, FooterSection } from '@/lib/constants/footer';

const PLACEHOLDER_RE = /^\(loading\.{3}\)$|^loading$|^undefined$|^null$/i;

export function Footer() {
  const { footer: footerLinks, contact: contactInfo, isLoading } = useAppData();

  const renderedSections: FooterSection[] = useMemo(() => {
    if (!footerLinks?.length) return [];
    const mapped = mapLinksToFooterSections(footerLinks);
    // Drop sections whose title is still a CMS placeholder
    return mapped.filter((s) => !PLACEHOLDER_RE.test(s.title.trim()));
  }, [footerLinks]);

  const socialLinks = useMemo(
    () =>
      (contactInfo?.contact_social_links ?? [])
        .filter((link) => link.is_active !== false && link.url)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [contactInfo]
  );

  const resolveSocialIcon = (link: { icon?: string | null; platform?: string | null; label?: string | null; url?: string | null }) => {
    const explicitKey = (link.icon || link.platform || link.label || '').toLowerCase().trim();
    if (explicitKey && socialIconMap[explicitKey]) return socialIconMap[explicitKey];

    const url = link.url?.toLowerCase() || '';
    const keywordMap: Record<string, keyof typeof socialIconMap> = {
      twitter: 'twitter', x: 'twitter',
      instagram: 'instagram', whatsapp: 'whatsapp',
      telegram: 'telegram', youtube: 'youtube',
      facebook: 'facebook', linkedin: 'linkedin',
    };
    const found = Object.entries(keywordMap).find(([kw]) => explicitKey === kw || url.includes(kw));
    return (found && socialIconMap[found[1]]) || FaEnvelope;
  };

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
              India's leading platform for exam preparation and personalized learning support. Join millions of students on their journey to success.
            </p>

            {isLoading ? (
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-background/10 animate-pulse" />
                <div className="h-4 w-32 rounded bg-background/10 animate-pulse" />
              </div>
            ) : contactInfo && (
              <div className="space-y-2.5 text-sm sm:text-xs lg:text-sm">
                {contactInfo.support_email && (
                  <a
                    href={`mailto:${contactInfo.support_email}`}
                    className="flex items-center gap-2 text-background/70 hover:text-primary transition-colors"
                    title="Email Support"
                  >
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{contactInfo.support_email}</span>
                  </a>
                )}
                {contactInfo.support_phone && (
                  <a
                    href={`tel:${contactInfo.support_phone.replace(/\s+/g, '')}`}
                    className="flex items-center gap-2 text-background/70 hover:text-primary transition-colors"
                    title="Call Helpline"
                  >
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{contactInfo.support_phone}</span>
                  </a>
                )}
              </div>
            )}

            {!isLoading && socialLinks.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs uppercase tracking-widest text-background/60">Follow us</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {socialLinks.map((link) => {
                    const Icon = resolveSocialIcon(link);
                    return (
                      <a
                        key={link.id ?? link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-background/10 hover:bg-primary hover:text-primary-foreground transition-colors"
                        aria-label={link.label || link.platform}
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Link sections */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-0 lg:contents">
            {isLoading ? (
              // Skeleton columns while API loads
              [0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="h-4 w-24 rounded bg-background/10 animate-pulse mb-3" />
                  <div className="space-y-2">
                    {[0, 1, 2, 3].map((j) => (
                      <div key={j} className="h-3 w-20 rounded bg-background/10 animate-pulse" />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              renderedSections.map((section) => (
                <div key={section.title}>
                  <p className="font-display font-semibold text-background text-sm mb-2 sm:mb-3">
                    {section.title}
                  </p>
                  <ul className="space-y-1.5 sm:space-y-2">
                    {section.links.map((link) => (
                      <li key={`${section.title}-${link.label}`}>
                        <Link
                          href={link.href}
                          target={link.openInNewTab ? '_blank' : undefined}
                          rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                          className="text-background/70 hover:text-primary transition-colors text-xs sm:text-sm"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-5 sm:mt-6 pt-4 border-t border-background/10 flex flex-col items-center text-center">
          <p className="text-background/60 text-xs sm:text-sm">
            © {new Date().getFullYear()} Bharat Mock. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
