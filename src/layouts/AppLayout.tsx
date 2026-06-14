import { Outlet } from 'react-router-dom';
import { type TouchEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { PullToRefreshContext, type PullToRefreshHandler } from '../hooks/usePullToRefresh';

const pullRefreshThreshold = 68;
const pullRefreshMaxDistance = 86;

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const appMainRef = useRef<HTMLDivElement | null>(null);
  const refreshHandlerRef = useRef<PullToRefreshHandler | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const registerPullToRefresh = useCallback((handler: PullToRefreshHandler) => {
    refreshHandlerRef.current = handler;

    return () => {
      if (refreshHandlerRef.current === handler) {
        refreshHandlerRef.current = null;
      }
    };
  }, []);

  function isMobilePullRefreshAvailable(target: EventTarget | null) {
    if (refreshing || mobileSidebarOpen) return false;
    if (!window.matchMedia('(max-width: 768px)').matches) return false;
    if (!appMainRef.current || appMainRef.current.scrollTop > 0) return false;
    if (!(target instanceof Element)) return true;

    return !target.closest('button, input, textarea, select, a, .modal-panel, .avatar-menu-panel, .filter-dropdown-panel');
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!isMobilePullRefreshAvailable(event.target)) {
      touchStartYRef.current = null;
      return;
    }

    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (touchStartYRef.current === null || !appMainRef.current || appMainRef.current.scrollTop > 0) return;

    const currentY = event.touches[0]?.clientY ?? touchStartYRef.current;
    const deltaY = currentY - touchStartYRef.current;

    if (deltaY <= 0) {
      setPullDistance(0);
      return;
    }

    if (deltaY > 8) {
      event.preventDefault();
    }

    setPullDistance(Math.min(pullRefreshMaxDistance, deltaY * 0.48));
  }

  async function handleTouchEnd() {
    const shouldRefresh = pullDistance >= pullRefreshThreshold && refreshHandlerRef.current;
    touchStartYRef.current = null;

    if (!shouldRefresh) {
      setPullDistance(0);
      return;
    }

    setRefreshing(true);
    setPullDistance(54);

    try {
      await refreshHandlerRef.current?.();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }

  return (
    <PullToRefreshContext.Provider value={registerPullToRefresh}>
      <div className={`${sidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}${mobileSidebarOpen ? ' mobile-sidebar-open' : ''}`}>
        <button className="mobile-sidebar-backdrop" type="button" aria-label="关闭菜单" onClick={() => setMobileSidebarOpen(false)} />
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => {
            if (mobileSidebarOpen) {
              setMobileSidebarOpen(false);
              return;
            }

            setSidebarCollapsed((current) => !current);
          }}
          onNavigate={() => setMobileSidebarOpen(false)}
        />
        <div
          className="app-main"
          ref={appMainRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div
            className={pullDistance > 0 || refreshing ? 'pull-refresh-indicator visible' : 'pull-refresh-indicator'}
            style={{ transform: `translate(-50%, ${Math.max(0, pullDistance - 38)}px)` }}
            aria-hidden="true"
          >
            <span />
          </div>
          <Header onOpenMobileMenu={() => setMobileSidebarOpen((current) => !current)} />
          <main className="content-area">
            <Outlet />
          </main>
        </div>
      </div>
    </PullToRefreshContext.Provider>
  );
}
