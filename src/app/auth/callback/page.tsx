"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingPage } from '@/components/common/LoadingStates';
import { useAuth } from '@/context/AuthContext';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (token && refresh) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('refresh_token', refresh);

      const finalizeLogin = async () => {
        try {
          await refreshProfile();
          router.push('/');
        } catch (error) {
          router.push('/login?error=auth_failed');
        }
      };

      finalizeLogin();
    } else {
      router.push('/login?error=auth_failed');
    }
  }, [searchParams, router, refreshProfile]);

  return <LoadingPage message="Completing authentication..." />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingPage message="Completing authentication..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
