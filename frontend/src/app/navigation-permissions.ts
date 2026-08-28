import type { AppRole } from '@/auth/auth.types';
import {
  navigationItems,
  type NavigationItem,
} from '@/components/layout/navigation';

export function filterNavigationByRoles(roles: AppRole[]): NavigationItem[] {
  const isAdministrator = roles.includes('ADMINISTRATOR');

  return navigationItems.filter((item) => {
    if (item.key === 'administration') return isAdministrator;
    return true;
  });
}
