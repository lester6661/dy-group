import { useLocation } from 'react-router-dom';
import { menuItems } from '../routes/menu';

export function useCurrentPage() {
  const { pathname } = useLocation();

  return menuItems.find((item) => pathname.startsWith(item.path));
}
