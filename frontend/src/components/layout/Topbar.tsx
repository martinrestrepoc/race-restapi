import { LogOut, Search, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';

interface TopbarProps {
  displayName: string;
  environmentLabel: string;
  onLogout: () => void;
  roleLabel: string;
}

export function Topbar({
  displayName,
  environmentLabel,
  onLogout,
  roleLabel,
}: TopbarProps) {
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.at(0)?.toUpperCase())
    .join('');

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
        <span className="flex items-center gap-2 md:hidden">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Trophy aria-hidden="true" className="size-5" />
          </span>
          <span className="hidden font-display text-sm font-bold uppercase tracking-wider min-[390px]:inline">
            EIA Racing
          </span>
        </span>

        <div className="hidden items-center gap-2 md:flex">
          <span className="font-display text-sm font-bold uppercase tracking-widest">
            EIA Racing League
          </span>
          <span className="rounded bg-primary/15 px-2 py-1 font-mono text-[10px] uppercase text-primary">
            {environmentLabel}
          </span>
        </div>

        <label className="relative ml-auto hidden max-w-sm flex-1 lg:block">
          <span className="sr-only">Buscar en la sección actual</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            className="min-h-10 w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground"
            disabled
            placeholder="Búsqueda disponible en cada módulo"
            type="search"
          />
        </label>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            aria-label="Abrir mi perfil"
            className="flex size-9 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold text-foreground"
            to="/profile"
          >
            {initials || 'US'}
          </Link>
          <Link
            className="hidden max-w-44 leading-tight sm:block"
            to="/profile"
          >
            <p className="truncate text-sm font-medium" title={displayName}>
              {displayName}
            </p>
            <p
              className="truncate text-xs text-muted-foreground"
              title={roleLabel}
            >
              {roleLabel}
            </p>
          </Link>
          <Button
            aria-label="Cerrar sesión"
            onClick={onLogout}
            size="icon"
            variant="ghost"
          >
            <LogOut aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
