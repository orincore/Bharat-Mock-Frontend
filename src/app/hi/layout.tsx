import { setRequestLocale } from 'next-intl/server';

export default function HiLayout({ children }: { children: React.ReactNode }) {
  setRequestLocale('hi');
  return <>{children}</>;
}
