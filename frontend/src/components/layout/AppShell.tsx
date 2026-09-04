import type { ReactNode } from 'react';

import { MobileNavigation } from './MobileNavigation';
import type { NavigationItem, NavigationKey } from './navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  activeItem: NavigationKey;
  children: ReactNode;
  displayName: string;
  navigation: NavigationItem[];
  onNavigate: (item: NavigationKey) => void;
  onLogout: () => void;
  roleLabel: string;
}

export function AppShell({
  activeItem,
  children,
  displayName,
  navigation,
  onNavigate,
  onLogout,
  roleLabel,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar
          activeItem={activeItem}
          items={navigation}
          onNavigate={onNavigate}
        />
        <div className="min-w-0 flex-1">
          <Topbar
            displayName={displayName}
            onLogout={onLogout}
            roleLabel={roleLabel}
          />
          <main className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-24 pt-6 sm:px-6 sm:pt-8 md:pb-10">
            {children}
          </main>
        </div>
      </div>
      <MobileNavigation
        activeItem={activeItem}
        items={navigation}
        onNavigate={onNavigate}
      />
    </div>
  );
}
