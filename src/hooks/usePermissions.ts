import { useEffect, useMemo, useState } from 'react';
import { permissionRuntimeService, type PermissionAction, type RuntimePermissions } from '../services/permission-runtime.service';
import { useAuth } from './useAuth';

export function usePermissions() {
  const { profile, loading: authLoading } = useAuth();
  const [runtime, setRuntime] = useState<RuntimePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadPermissions() {
      if (authLoading) return;

      setLoading(true);
      setError('');

      try {
        const nextRuntime = await permissionRuntimeService.getRuntimePermissions(profile);
        if (mounted) {
          setRuntime(nextRuntime);
        }
      } catch (loadError) {
        if (mounted) {
          setRuntime({ role: profile?.role ?? null, permissions: {} });
          setError(loadError instanceof Error ? loadError.message : '读取权限失败。');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPermissions();

    return () => {
      mounted = false;
    };
  }, [authLoading, profile]);

  return useMemo(
    () => ({
      loading,
      error,
      isSuperAdmin: profile?.role === 'super_admin',
      canView: (permissionKey: string) => permissionRuntimeService.hasPermission(runtime, permissionKey, 'view'),
      canUse: (permissionKey: string) => permissionRuntimeService.hasPermission(runtime, permissionKey, 'use'),
      hasPermission: (permissionKey: string, action: PermissionAction) =>
        permissionRuntimeService.hasPermission(runtime, permissionKey, action),
    }),
    [error, loading, profile?.role, runtime],
  );
}
