import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { futureToolGroups, menuItems } from '../routes/menu';

export function Sidebar() {
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

        {Object.entries(groupedSections).map(([sectionName, groups]) => {
          const sectionExpanded = expandedSections[sectionName] ?? false;

          return (
            <div className="nav-section" key={sectionName}>
              <button className="nav-toggle" type="button" onClick={() => toggleSection(sectionName)}>
                {sectionExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span>{sectionName}</span>
              </button>

              {sectionExpanded ? (
                <div className="nav-section-body">
                  {Object.entries(groups).map(([groupName, items]) => {
                    const groupExpanded = expandedGroups[groupName] ?? false;

                    return (
                      <div className="nav-group" key={groupName}>
                        <button className="nav-group-toggle" type="button" onClick={() => toggleGroup(groupName)}>
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

                  <div className="nav-group future-groups">
                    {futureToolGroups.map((groupName) => (
                      <button className="nav-group-toggle muted" type="button" key={groupName} disabled>
                        <ChevronRight size={15} />
                        <span>{groupName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span>正式版系统</span>
        <strong>V1</strong>
      </div>
    </aside>
  );
}
