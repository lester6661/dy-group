import { Bell, Menu, Search, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentPage } from '../hooks/useCurrentPage';
import { useAuth } from '../hooks/useAuth';

export function Header() {
  const currentPage = useCurrentPage();
  const { profile } = useAuth();
  const initials = profile?.full_name?.slice(0, 1).toUpperCase() ?? 'D';

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
        <Link className="avatar-settings-link" to="/profile" aria-label="个人资料">
          <span className="avatar-circle">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="个人头像" /> : initials}
          </span>
          <span className="avatar-meta">
            <strong>{profile?.full_name ?? 'DY 用户'}</strong>
            <small>个人资料</small>
          </span>
        </Link>
        <Link className="icon-button" to="/settings" aria-label="系统设置">
          <Settings size={17} />
        </Link>
      </div>
    </header>
  );
}
