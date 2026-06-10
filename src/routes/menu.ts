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
  label: string;
  path: string;
  icon: LucideIcon;
};

export const menuItems: MenuItem[] = [
  {
    label: '仪表盘',
    path: '/dashboard',
    icon: Home,
  },
  {
    label: '班表',
    path: '/schedule',
    icon: CalendarDays,
  },
  {
    label: '工作人员',
    path: '/staff',
    icon: UsersRound,
  },
  {
    label: '考勤',
    path: '/attendance',
    icon: ClipboardCheck,
  },
  {
    label: '请假',
    path: '/leave',
    icon: FileClock,
  },
  {
    label: '休息规划',
    path: '/rest-planning',
    icon: Waves,
  },
  {
    label: '个人资料',
    path: '/profile',
    icon: UserCircle,
  },
  {
    label: '设置',
    path: '/settings',
    icon: Settings,
  },
];
