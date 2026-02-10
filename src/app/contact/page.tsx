"use client";

import { useMemo, useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageCircle,
  Clock,
  ShieldCheck,
  Users2,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useContactInfo } from '@/hooks/useContactInfo';
import { socialIconMap, fallbackContactInfo } from '@/lib/constants/contact';
import Link from 'next/link';

export default function ContactPage() {
  const { contactInfo, loading, error } = useContactInfo();
  const info = contactInfo ?? fallbackContactInfo;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitted(true);
    setIsSubmitting(false);
    setFormData({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const primaryChannels = useMemo(
    () =>
      [
        {
          icon: Mail,
          title: 'Email our team',
          value: info.support_email,
          helper: 'Replies within 12 hours',
          link: info.support_email ? `mailto:${info.support_email}` : undefined
        },
        {
          icon: Phone,
          title: 'Call the helpline',
          value: info.support_phone,
          helper: info.support_hours || 'IST Business Hours',
          link: info.support_phone ? `tel:${info.support_phone.replace(/\s+/g, '')}` : undefined
        },
        info.whatsapp_number
          ? {
              icon: MessageCircle,
              title: 'WhatsApp Support',
              value: info.whatsapp_number,
              helper: 'Dedicated counsellor desk',
              link: `https://wa.me/${info.whatsapp_number.replace(/\D/g, '')}`
            }
          : null,
        {
          icon: MapPin,
          title: 'Visit our studio',
          value: [
            info.address_line1,
            info.address_line2,
            [info.city, info.state].filter(Boolean).join(', '),
            [info.postal_code, info.country].filter(Boolean).join(' ')
          ]
            .filter(Boolean)
            .join(', '),
          helper: 'Prior appointment recommended'
        }
      ].filter(Boolean),
    [info]
  ) as Array<{
    icon: React.ElementType;
    title: string;
    value: string;
    helper?: string;
    link?: string;
  }>;

  const socialLinks = useMemo(
    () =>
      (info.contact_social_links || [])
        .filter((link) => link.is_active !== false && link.url)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [info.contact_social_links]
  );

  const highlightStats = [
    { icon: Users2, label: 'Students served', value: '1.2M+' },
    { icon: ShieldCheck, label: 'Support CSAT', value: '98%' },
    { icon: Clock, label: 'Avg. response', value: '< 4 hrs' },
    { icon: Award, label: 'Partner institutes', value: '250+' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.35),_transparent_55%)]" />
        <div className="relative container-main py-16 lg:py-24">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/70 mb-4">Bharat Mock Support Desk</p>
              <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-6">
                {info.headline || 'Connect with Bharat Mock'}
              </h1>
              <p className="text-lg text-white/80 mb-6 max-w-2xl">
                {info.description ||
                  "Whether you're preparing for your next exam or need help using our platform, our support team is standing by."}
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-white/70">
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15">
                  {info.subheading || 'We respond within 24 hours'}
                </span>
                {info.support_hours && (
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15">{info.support_hours}</span>
                )}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6">
              <div className="space-y-4">
                {primaryChannels.map((channel) => (
                  <div key={channel.title} className="flex gap-4 rounded-2xl bg-white/5 p-4 border border-white/5">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300">
                      <channel.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-wide text-white/70">{channel.title}</p>
                      {channel.link ? (
                        <Link href={channel.link} className="text-lg font-semibold text-white hover:text-amber-200">
                          {channel.value}
                        </Link>
                      ) : (
                        <p className="text-lg font-semibold text-white">{channel.value}</p>
                      )}
                      {channel.helper && <p className="text-sm text-white/60">{channel.helper}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlightStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-4">
                <stat.icon className="h-10 w-10 text-amber-300" />
                <div>
                  <p className="text-sm uppercase tracking-wide text-white/60">{stat.label}</p>
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main grid lg:grid-cols-2 gap-10">
          <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Message our team</p>
                <h2 className="font-display text-2xl font-bold">Send us a message</h2>
              </div>
            </div>

            {submitted && (
              <div className="mb-6 p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm">
                Thank you for your message! We'll get back to you soon.
              </div>
            )}

            {error && !loading && (
              <div className="mb-6 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                {error} · Showing fallback contact details.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Name
                  </label>
                  <Input id="name" name="name" required value={formData.name} onChange={handleChange} placeholder="Your name" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                  Subject
                </label>
                <Input
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Tell us how we can help"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  Message
                </label>
                <Textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Write your message..."
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Sending...' : 'Send Message'}
                <Send className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                By submitting, you agree to our privacy policy and allow us to contact you regarding your enquiry.
              </p>
            </form>
          </div>

          <div className="space-y-8">
            <div className="bg-muted/40 rounded-3xl border border-border p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Contact Channels</p>
              <div className="mt-6 space-y-4">
                {primaryChannels.map((channel) => (
                  <div key={channel.title} className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <channel.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-wide text-muted-foreground">{channel.title}</p>
                      {channel.link ? (
                        <Link href={channel.link} className="text-lg font-semibold text-foreground hover:text-primary">
                          {channel.value}
                        </Link>
                      ) : (
                        <p className="text-lg font-semibold text-foreground">{channel.value}</p>
                      )}
                      {channel.helper && <p className="text-sm text-muted-foreground">{channel.helper}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {socialLinks.length > 0 && (
              <div className="bg-card border border-border rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Social Presence</p>
                    <h3 className="font-display text-xl font-bold">Follow our updates</h3>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {socialLinks.map((link) => {
                    const Icon = socialIconMap[link.icon || link.platform?.toLowerCase()] ?? Send;
                    return (
                      <Link
                        key={link.id ?? link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 hover:border-primary transition"
                      >
                        <Icon className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">{link.label || link.platform}</p>
                          <p className="text-xs text-muted-foreground">{link.platform?.toUpperCase()}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {info.map_embed_url && (
              <div className="rounded-3xl overflow-hidden border border-border">
                <iframe
                  src={info.map_embed_url}
                  title="Bharat Mock HQ Map"
                  loading="lazy"
                  className="w-full h-80"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/20">
        <div className="container-main text-center space-y-6">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Need instant answers?</p>
          <h2 className="font-display text-3xl font-bold max-w-3xl mx-auto">
            Visit the help centre for onboarding guides, troubleshooting steps, and exam-day checklists.
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/help">Explore Help Centre</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/faq">Visit FAQ</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
