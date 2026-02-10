import { AboutPageData } from '@/types';
import { fallbackAboutData } from '@/lib/constants/about';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export async function fetchAboutPageData(revalidateSeconds = 300): Promise<AboutPageData> {
  try {
    const response = await fetch(`${API_BASE_URL}/about`, {
      next: { revalidate: revalidateSeconds }
    });

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
