import { NavLink } from 'react-router-dom';
import { menuItems } from '../routes/menu';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">DY</div>
        <div>
          <strong>DY Group</strong>
          <span>Production</span>
        </div>
      </div>

      <nav className="nav" aria-label="主菜单">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span>正式版架构</span>
        <strong>Phase 1</strong>
      </div>
    </aside>
  );
}
