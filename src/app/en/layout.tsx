import { setRequestLocale } from 'next-intl/server';

export default function EnLayout({ children }: { children: React.ReactNode }) {
  setRequestLocale('en');
  return <>{children}</>;
}
