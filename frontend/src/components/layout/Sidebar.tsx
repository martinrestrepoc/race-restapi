import { Trophy } from 'lucide-react';

import { cx } from '@/lib/cx';

import type { NavigationItem, NavigationKey } from './navigation';

interface SidebarProps {
  activeItem: NavigationKey;
  items: NavigationItem[];
  onNavigate: (item: NavigationKey) => void;
}

export function Sidebar({ activeItem, items, onNavigate }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col overflow-y-auto border-r border-border bg-card py-4 md:flex xl:w-60">
      <div className="mb-5 flex items-center justify-center gap-3 px-3 xl:justify-start">
        <span
          aria-label="EIA Racing League"
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
          role="img"
        >
          <Trophy aria-hidden="true" className="size-5" />
        </span>
        <span className="hidden min-w-0 xl:block">
          <strong className="block truncate font-display text-sm uppercase tracking-wider">
            EIA Racing League
          </strong>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
            Gestión deportiva
          </span>
        </span>
      </div>
      <nav aria-label="Navegación principal" className="w-full px-3">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.key}>
              <button
                aria-label={item.label}
                aria-current={activeItem === item.key ? 'page' : undefined}
                className={cx(
                  'flex min-h-12 w-full items-center justify-center gap-3 rounded-md px-3 text-sm font-medium transition-colors xl:justify-start',
                  activeItem === item.key
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
                onClick={() => onNavigate(item.key)}
                title={item.label}
                type="button"
              >
                <item.icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="hidden truncate xl:block">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
