"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { footerService } from '@/lib/api/footerService';
import { useToast } from '@/components/ui/use-toast';
import { useContactInfo } from '@/hooks/useContactInfo';
import { fallbackContactInfo, socialIconMap } from '@/lib/constants/contact';
import { fallbackFooterSections, mapLinksToFooterSections, FooterSection } from '@/lib/constants/footer';

export function Footer() {
  const { toast } = useToast();
  const [sections, setSections] = useState<FooterSection[]>(fallbackFooterSections);
  const [linkLoading, setLinkLoading] = useState(false);
  const { contactInfo, loading: contactLoading, error: contactError } = useContactInfo();
  const info = contactInfo ?? fallbackContactInfo;

  useEffect(() => {
    const fetchFooterLinks = async () => {
      try {
        setLinkLoading(true);
        const data = await footerService.getFooterLinks();
        const mapped = mapLinksToFooterSections(data);
        if (!mapped.length) {
          setSections(fallbackFooterSections);
          return;
        }
        setSections(mapped);
      } catch (error: any) {
        setSections(fallbackFooterSections);
        toast({
          title: 'Footer links unavailable',
          description: error?.message || 'Using default footer links.',
          variant: 'destructive'
        });
      } finally {
        setLinkLoading(false);
      }
    };

    fetchFooterLinks();
  }, [toast]);

  const renderedSections = useMemo(() => sections, [sections]);
  const socialLinks = useMemo(
    () =>
      (info.contact_social_links || [])
        .filter((link) => link.is_active !== false && link.url)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [info.contact_social_links]
  );

  return (
    <footer className="bg-foreground text-background/90">
      <div className="container-main py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="relative h-10 w-36 flex items-center">
                <Image
                  src="/logo.png"
                  alt="Bharat Mock Logo"
                  fill
                  sizes="(max-width: 768px) 160px, 180px"
                  className="object-contain"
                />
              </div>
            </Link>
            <p className="text-background/70 mb-6 max-w-sm">
              India's leading platform for exam preparation and personalized learning support. Join millions of students on their journey to success.
            </p>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-background/70">
                <Mail className="h-4 w-4" />
                <span>{info.support_email}</span>
              </div>
              <div className="flex items-center gap-3 text-background/70">
                <Phone className="h-4 w-4" />
                <span>{info.support_phone}</span>
              </div>
              <div className="flex items-center gap-3 text-background/70">
                <MapPin className="h-4 w-4" />
                <span>
                  {[info.address_line1, info.address_line2, info.city, info.state, info.postal_code, info.country]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
              {contactError && !contactLoading && (
                <p className="text-xs text-background/60">Showing fallback contact details.</p>
              )}
            </div>
          </div>

          {renderedSections.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-display font-semibold text-background">{section.title}</h3>
                {linkLoading && <span className="text-xs text-background/60">(loading...)</span>}
              </div>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      target={link.openInNewTab ? '_blank' : undefined}
                      rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                      className="text-background/70 hover:text-primary transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-background/60 text-sm">
            © {new Date().getFullYear()} Bharat Mock. All rights reserved.
          </p>
          
          <div className="flex items-center gap-4">
            {(socialLinks.length ? socialLinks : fallbackContactInfo.contact_social_links || []).map((link) => {
              const Icon = socialIconMap[link.icon || link.platform?.toLowerCase()] ?? Mail;
              return (
                <a
                  key={link.id ?? link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-background/10 hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label={link.label || link.platform}
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
