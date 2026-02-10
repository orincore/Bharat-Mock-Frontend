import { useCallback, useEffect, useState } from 'react';
import { contactService } from '@/lib/api/contactService';
import { ContactInfo } from '@/types';
import { fallbackContactInfo } from '@/lib/constants/contact';

interface UseContactInfoResult {
  contactInfo: ContactInfo;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useContactInfo(): UseContactInfoResult {
  const [contactInfo, setContactInfo] = useState<ContactInfo>(fallbackContactInfo);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadContactInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contactService.getContactInfo();
      if (data) {
        setContactInfo(data);
      } else {
        setContactInfo(fallbackContactInfo);
      }
    } catch (err: any) {
      console.error('Failed to load contact info', err);
      setContactInfo(fallbackContactInfo);
      setError(err?.message || 'Unable to load contact info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContactInfo();
  }, [loadContactInfo]);

  return {
    contactInfo,
    loading,
    error,
    refresh: loadContactInfo
  };
}
