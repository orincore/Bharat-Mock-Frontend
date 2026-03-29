"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingPage } from '@/components/common/LoadingStates';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (token && refresh) {
      // Store tokens — AuthProvider will pick them up on the next page via checkAuth
      localStorage.setItem('auth_token', token);
      localStorage.setItem('refresh_token', refresh);
      // Clear any stale cached user so AuthProvider fetches fresh profile
      localStorage.removeItem('auth_user');
      // Hard navigate so AuthProvider re-initializes cleanly with the new token
      window.location.href = '/';
    } else {
      router.replace('/login?error=auth_failed');
    }
  }, [searchParams, router]);

  return <LoadingPage message="Completing authentication..." />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingPage message="Completing authentication..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
