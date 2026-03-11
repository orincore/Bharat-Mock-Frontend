import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getRolePermissions } from '@/lib/constants/adminRoles';

export function useRolePermissions() {
  const { user } = useAuth();
  
  const permissions = useMemo(() => {
    return getRolePermissions(user?.role);
  }, [user?.role]);

  const canDelete = permissions.canDelete;
  const userRole = user?.role || 'user';

  return {
    permissions,
    canDelete,
    userRole,
    isAdmin: userRole === 'admin',
    isEditor: userRole === 'editor',
    isAuthor: userRole === 'author',
  };
}
