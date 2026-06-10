import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  ClipboardCheck,
  Home,
  Settings,
  UserCircle,
  UsersRound,
  Waves,
  FileClock,
} from 'lucide-react';

export type MenuItem = {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
};

export const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    label: '仪表盘',
    path: '/dashboard',
    icon: Home,
  },
  {
    key: 'schedule',
    label: '班表',
    path: '/schedule',
    icon: CalendarDays,
  },
  {
    key: 'staff',
    label: '工作人员',
    path: '/staff',
    icon: UsersRound,
  },
  {
    key: 'attendance',
    label: '考勤',
    path: '/attendance',
    icon: ClipboardCheck,
  },
  {
    key: 'leave',
    label: '请假',
    path: '/leave',
    icon: FileClock,
  },
  {
    key: 'rest-planning',
    label: '休息规划',
    path: '/rest-planning',
    icon: Waves,
  },
  {
    key: 'profile',
    label: '个人资料',
    path: '/profile',
    icon: UserCircle,
  },
  {
    key: 'settings',
    label: '设置',
    path: '/settings',
    icon: Settings,
  },
];

export function getMenuPath(key: MenuItem['key']) {
  const item = menuItems.find((menuItem) => menuItem.key === key);

  if (!item) {
    throw new Error(`菜单配置不存在：${key}`);
  }

  return item.path.replace(/^\//, '');
}
