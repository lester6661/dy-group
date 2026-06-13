import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className={`${sidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}${mobileSidebarOpen ? ' mobile-sidebar-open' : ''}`}>
      <button className="mobile-sidebar-backdrop" type="button" aria-label="关闭菜单" onClick={() => setMobileSidebarOpen(false)} />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        onNavigate={() => setMobileSidebarOpen(false)}
      />
      <div className="app-main">
        <Header onOpenMobileMenu={() => setMobileSidebarOpen((current) => !current)} />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
