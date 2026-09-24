import { useUser } from '@/context/UserContext';

export const usePermissions = () => {
  const { permissions, loading } = useUser();

  const hasPermission = (permission) => {
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList) => {
    if (permissions.includes('*')) return true;
    return permissionList.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (permissionList) => {
    if (permissions.includes('*')) return true;
    return permissionList.every(permission => permissions.includes(permission));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
};
