import { ContactInfo } from '@/types';
import { fallbackContactInfo } from '@/lib/constants/contact';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export async function fetchContactInfoServer(): Promise<ContactInfo> {
  try {
    const response = await fetch(`${API_BASE_URL}/contact`, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Failed to fetch contact info: ${response.status}`);
    }

    const payload = await response.json();
    return payload?.data ?? fallbackContactInfo;
  } catch (error) {
    console.error('fetchContactInfoServer error', error);
    return fallbackContactInfo;
  }
}
