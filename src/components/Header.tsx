import { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Menu, Search, Settings, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentPage } from '../hooks/useCurrentPage';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export function Header() {
  const currentPage = useCurrentPage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = profile?.full_name?.slice(0, 1).toUpperCase() ?? 'D';
  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar-title">
        <button className="icon-button mobile-menu-button" type="button" aria-label="打开菜单">
          <Menu size={20} />
        </button>
        <div>
          <span className="topbar-eyebrow">DY Group</span>
          <h1>{currentPage?.label ?? '正式版系统'}</h1>
        </div>
      </div>

      <div className="topbar-actions">
        <label className="search-box" aria-label="搜索">
          <Search size={17} />
          <input placeholder="搜索页面或成员" />
        </label>
        <button className="icon-button" type="button" aria-label="通知">
          <Bell size={19} />
        </button>

        <div className="avatar-menu" ref={menuRef}>
          <button className="avatar-settings-link" type="button" onClick={() => setMenuOpen((open) => !open)}>
            <span className="avatar-circle">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="个人头像" /> : initials}
            </span>
            <span className="avatar-meta">
              <strong>{profile?.full_name ?? 'DY 用户'}</strong>
              <small>账号菜单</small>
            </span>
          </button>

          {menuOpen ? (
            <div className="avatar-menu-panel">
              <Link to="/profile" onClick={() => setMenuOpen(false)}>
                <UserRound size={16} />
                <span>个人资料</span>
              </Link>
              {isSuperAdmin ? (
                <Link to="/settings" onClick={() => setMenuOpen(false)}>
                  <Settings size={16} />
                  <span>系统设置</span>
                </Link>
              ) : null}
              <div className="avatar-menu-divider" />
              <button type="button" onClick={handleSignOut}>
                <LogOut size={16} />
                <span>登出</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
