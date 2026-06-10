import { NavLink } from 'react-router-dom';
import { menuItems } from '../routes/menu';

export function Sidebar() {
  const standaloneItems = menuItems.filter((item) => !item.section);
  const groupedSections = menuItems.reduce<Record<string, Record<string, typeof menuItems>>>((sections, item) => {
    if (!item.section) {
      return sections;
    }

    const groupName = item.group ?? '其他';
    sections[item.section] = sections[item.section] ?? {};
    sections[item.section][groupName] = sections[item.section][groupName] ?? [];
    sections[item.section][groupName].push(item);

    return sections;
  }, {});

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
        {standaloneItems.map((item) => {
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

        {Object.entries(groupedSections).map(([sectionName, groups]) => (
          <div className="nav-section" key={sectionName}>
            <span className="nav-section-title">{sectionName}</span>
            {Object.entries(groups).map(([groupName, items]) => (
              <div className="nav-group" key={groupName}>
                <span className="nav-group-title">{groupName}</span>
                {items.map((item) => {
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
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span>正式版架构</span>
        <strong>Phase 1</strong>
      </div>
    </aside>
  );
}
