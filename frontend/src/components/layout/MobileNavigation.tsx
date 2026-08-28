import { cx } from '@/lib/cx';

import type { NavigationItem, NavigationKey } from './navigation';

interface MobileNavigationProps {
  activeItem: NavigationKey;
  items: NavigationItem[];
  onNavigate: (item: NavigationKey) => void;
}

export function MobileNavigation({
  activeItem,
  items,
  onNavigate,
}: MobileNavigationProps) {
  const mobileItems = items.filter((item) => item.mobile);

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4 gap-1">
        {mobileItems.map((item) => (
          <li key={item.key}>
            <button
              aria-current={activeItem === item.key ? 'page' : undefined}
              className={cx(
                'flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-md px-1 text-[9px] font-medium',
                activeItem === item.key
                  ? 'bg-secondary text-primary'
                  : 'text-muted-foreground',
              )}
              onClick={() => onNavigate(item.key)}
              type="button"
            >
              <item.icon aria-hidden="true" className="size-5" />
              <span className="max-w-full truncate">
                {item.mobileLabel ?? item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
