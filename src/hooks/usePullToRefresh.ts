import { createContext, useContext, useEffect } from 'react';

export type PullToRefreshHandler = () => Promise<void> | void;
export type RegisterPullToRefresh = (handler: PullToRefreshHandler) => () => void;

export const PullToRefreshContext = createContext<RegisterPullToRefresh | null>(null);

export function usePullToRefresh(handler: PullToRefreshHandler, dependencies: unknown[] = []) {
  const registerPullToRefresh = useContext(PullToRefreshContext);

  useEffect(() => {
    if (!registerPullToRefresh) return undefined;
    return registerPullToRefresh(handler);
  }, [registerPullToRefresh, ...dependencies]);
}
