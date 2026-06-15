import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

type RequirePermissionProps = {
  permissionKey: string;
  action?: 'view' | 'use';
  children: ReactNode;
};

export function RequirePermission({ permissionKey, action = 'view', children }: RequirePermissionProps) {
  const permissions = usePermissions();

  if (permissions.loading) {
    return <div className="route-loading">正在检查权限...</div>;
  }

  if (!permissions.hasPermission(permissionKey, action)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
