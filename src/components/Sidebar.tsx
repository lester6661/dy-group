import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Menu } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { futureToolGroups, menuItems } from '../routes/menu';
import logoUrl from '../assets/logo.png';

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    工作工具: true,
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    人事部: true,
  });

  const standaloneItems = menuItems.filter((item) => !item.section);
  const groupedSections = useMemo(
    () =>
      menuItems.reduce<Record<string, Record<string, typeof menuItems>>>((sections, item) => {
        if (!item.section) {
          return sections;
        }

        const groupName = item.group ?? '其他';
        sections[item.section] = sections[item.section] ?? {};
        sections[item.section][groupName] = sections[item.section][groupName] ?? [];
        sections[item.section][groupName].push(item);

        return sections;
      }, {}),
    [],
  );

  function toggleSection(sectionName: string) {
    setExpandedSections((current) => ({
      ...current,
      [sectionName]: !current[sectionName],
    }));
  }

  function toggleGroup(groupName: string) {
    setExpandedGroups((current) => ({
      ...current,
      [groupName]: !current[groupName],
    }));
  }

  return (
    <aside className={collapsed ? 'sidebar collapsed' : 'sidebar'}>
      <div className="brand">
        <button className="sidebar-collapse-button" type="button" onClick={onToggleCollapsed} aria-label="收起菜单">
          <Menu size={20} />
        </button>
        <img className="brand-logo" src={logoUrl} alt="DY Group" title="DY Group" />
      </div>

      <nav className="nav" aria-label="主菜单">
        {standaloneItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {Object.entries(groupedSections).map(([sectionName, groups]) => {
          const sectionExpanded = expandedSections[sectionName] ?? false;

          return (
            <div className="nav-section" key={sectionName}>
              <button
                className="nav-toggle"
                type="button"
                title={collapsed ? sectionName : undefined}
                onClick={() => toggleSection(sectionName)}
              >
                {sectionExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span>{sectionName}</span>
              </button>

              {sectionExpanded ? (
                <div className="nav-section-body">
                  {Object.entries(groups).map(([groupName, items]) => {
                    const groupExpanded = expandedGroups[groupName] ?? false;

                    return (
                      <div className="nav-group" key={groupName}>
                        <button
                          className="nav-group-toggle"
                          type="button"
                          title={collapsed ? groupName : undefined}
                          onClick={() => toggleGroup(groupName)}
                        >
                          {groupExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          <span>{groupName}</span>
                        </button>

                        {groupExpanded ? (
                          <div className="nav-group-body">
                            {items.map((item) => {
                              const Icon = item.icon;

                              return (
                                <NavLink
                                  key={item.path}
                                  to={item.path}
                                  title={collapsed ? item.label : undefined}
                                  className={({ isActive }) => (isActive ? 'nav-link active nested' : 'nav-link nested')}
                                >
                                  <Icon size={18} />
                                  <span>{item.label}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {!collapsed ? (
                    <div className="nav-group future-groups">
                      {futureToolGroups.map((groupName) => (
                        <button className="nav-group-toggle muted" type="button" key={groupName} disabled>
                          <ChevronRight size={15} />
                          <span>{groupName}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
