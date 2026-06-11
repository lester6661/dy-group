import type { LucideIcon } from 'lucide-react';
import { CalendarDays, ClipboardCheck, Clock3, FileClock, Home, UsersRound } from 'lucide-react';

export type MenuItem = {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  section?: string;
  group?: string;
};

export const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    label: '首页',
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
    key: 'attendance',
    label: '打卡',
    path: '/attendance',
    icon: Clock3,
  },
  {
    key: 'leave',
    label: '请假&休假',
    path: '/leave',
    icon: FileClock,
  },
  {
    key: 'staff',
    label: '工作人员',
    path: '/staff',
    icon: UsersRound,
    section: '工作工具',
    group: '人事部',
  },
  {
    key: 'registration-review',
    label: '注册审核',
    path: '/hr/registration-reviews',
    icon: ClipboardCheck,
    section: '工作工具',
    group: '人事部',
  },
  {
    key: 'leave-review',
    label: '请假审核',
    path: '/hr/leave-reviews',
    icon: FileClock,
    section: '工作工具',
    group: '人事部',
  },
  {
    key: 'attendance-management',
    label: '考勤',
    path: '/hr/attendance',
    icon: ClipboardCheck,
    section: '工作工具',
    group: '人事部',
  },
];

export const futureToolGroups = ['星探部', '经纪部', '运营部', '财务部'];

export function getMenuPath(key: MenuItem['key']) {
  const item = menuItems.find((menuItem) => menuItem.key === key);

  if (!item) {
    throw new Error(`菜单配置不存在：${key}`);
  }

  return item.path.replace(/^\//, '');
}
