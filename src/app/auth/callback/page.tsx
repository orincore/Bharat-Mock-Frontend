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
      localStorage.setItem('auth_token', token);
      localStorage.setItem('refresh_token', refresh);

      setTimeout(() => {
        router.push('/');
      }, 500);
    } else {
      router.push('/login?error=auth_failed');
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
