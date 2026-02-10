import { FooterLink } from '@/types';

export type FooterSection = {
  title: string;
  order: number;
  links: Array<{ label: string; href: string; openInNewTab?: boolean }>;
};

export const fallbackFooterSections: FooterSection[] = [
  {
    title: 'Popular Exams',
    order: 0,
    links: [
      { label: 'JEE Main', href: '/exams?category=engineering' },
      { label: 'NEET', href: '/exams?category=medical' },
      { label: 'CAT', href: '/exams?category=management' },
      { label: 'GATE', href: '/exams?category=engineering' },
      { label: 'UPSC', href: '/exams?category=civil-services' }
    ]
  },
  {
    title: 'Resources',
    order: 1,
    links: [
      { label: 'Articles', href: '/blogs' },
      { label: 'Courses', href: '/courses' },
      { label: 'Study Material', href: '/blogs' },
      { label: 'Previous Papers', href: '/exams' }
    ]
  },
  {
    title: 'Company',
    order: 2,
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Careers', href: '/careers' },
      { label: 'Privacy Policy', href: 'http://localhost:3000/privacy-policy' },
      { label: 'Disclaimer', href: 'http://localhost:3000/disclaimer' },
      { label: 'Terms of Service', href: '/terms' }
    ]
  }
];

export function mapLinksToFooterSections(links: FooterLink[]): FooterSection[] {
  if (!Array.isArray(links) || !links.length) {
    return [];
  }

  const grouped = links.reduce<Record<string, { order: number; section: string; links: FooterSection['links']; displayOrders: number[] }>>(
    (acc, link) => {
      if (link.is_active === false) {
        return acc;
      }

      const title = link.section || 'General';
      if (!acc[title]) {
        acc[title] = {
          order: link.section_order ?? 0,
          section: title,
          links: [],
          displayOrders: []
        };
      }

      acc[title].links.push({
        label: link.label,
        href: link.href,
        openInNewTab: link.open_in_new_tab
      });
      acc[title].displayOrders.push(link.display_order ?? acc[title].links.length - 1);
      return acc;
    },
    {}
  );

  return Object.entries(grouped)
    .map(([title, info]) => {
      const sortedLinks = info.links.map((link, index) => ({
        ...link,
        order: info.displayOrders[index] ?? index
      }))
        .sort((a, b) => a.order - b.order)
        .map(({ order, ...rest }) => rest);

      return {
        title,
        order: info.order,
        links: sortedLinks
      } satisfies FooterSection;
    })
    .sort((a, b) => {
      if (a.order === b.order) {
        return a.title.localeCompare(b.title);
      }
      return a.order - b.order;
    });
}
