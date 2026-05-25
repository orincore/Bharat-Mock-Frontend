import { AboutPageData } from '@/types';
import { fallbackAboutData } from '@/lib/constants/about';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export async function fetchAboutPageData(): Promise<AboutPageData> {
  try {
    const response = await fetch(`${API_BASE_URL}/about`, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Failed to fetch About content: ${response.status}`);
    }

    const payload = await response.json();
    return payload?.data ?? fallbackAboutData;
  } catch (error) {
    console.error('fetchAboutPageData error', error);
    return fallbackAboutData;
  }
}
