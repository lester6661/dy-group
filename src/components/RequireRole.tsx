import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { AppRole } from '../types/database';
import type { ReactNode } from 'react';

type RequireRoleProps = {
  allowedRoles: AppRole[];
  children: ReactNode;
};

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="route-loading">正在检查权限...</div>;
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
