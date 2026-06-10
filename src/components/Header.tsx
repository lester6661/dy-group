import { Bell, Menu, Search } from 'lucide-react';
import { useCurrentPage } from '../hooks/useCurrentPage';

export function Header() {
  const currentPage = useCurrentPage();

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
      </div>
    </header>
  );
}
