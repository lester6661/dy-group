import { useLocation } from 'react-router-dom';
import { menuItems } from '../routes/menu';

export function useCurrentPage() {
  const { pathname } = useLocation();

  return (
    menuItems.find((item) => pathname.startsWith(item.path)) ??
    pageFallbacks.find((item) => pathname.startsWith(item.path))
  );
}

const pageFallbacks = [
  { path: '/profile', label: '个人资料' },
  { path: '/settings', label: '系统设置' },
];
