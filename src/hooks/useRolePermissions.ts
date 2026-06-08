import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getRolePermissions } from '@/lib/constants/adminRoles';

export function useRolePermissions() {
  const { user } = useAuth();
  
  const userRole = useMemo(() => {
    return user?.role?.toLowerCase() || (user?.is_admin ? 'admin' : 'user');
  }, [user?.role, user?.is_admin]);

  const permissions = useMemo(() => {
    return getRolePermissions(userRole);
  }, [userRole]);

  const canDelete = permissions.canDelete;

  return {
    permissions,
    canDelete,
    userRole,
    isAdmin: userRole === 'admin',
    isEditor: userRole === 'editor',
    isAuthor: userRole === 'author',
  };
}
