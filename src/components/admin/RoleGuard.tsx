"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getRolePermissions } from '@/lib/constants/adminRoles';
import { LoadingSpinner } from '@/components/common/LoadingStates';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredPermission?: keyof ReturnType<typeof getRolePermissions>;
  allowedRoles?: string[];
  fallbackPath?: string;
}

export function RoleGuard({ 
  children, 
  requiredPermission, 
  allowedRoles,
  fallbackPath = '/admin' 
}: RoleGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const userRole = user?.role || 'user';

    // Check if user has one of the allowed roles
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      router.push(fallbackPath);
      return;
    }

    // Check if user has the required permission
    if (requiredPermission) {
      const permissions = getRolePermissions(userRole);
      if (!permissions[requiredPermission]) {
        router.push(fallbackPath);
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, requiredPermission, allowedRoles, fallbackPath, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const userRole = user?.role || 'user';

  // Check allowed roles
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return null;
  }

  // Check required permission
  if (requiredPermission) {
    const permissions = getRolePermissions(userRole);
    if (!permissions[requiredPermission]) {
      return null;
    }
  }

  return <>{children}</>;
}
