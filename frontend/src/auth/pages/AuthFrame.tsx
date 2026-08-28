import { Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

interface AuthFrameProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
}

export function AuthFrame({ children, eyebrow, title }: AuthFrameProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10 text-foreground">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.055]"
        style={{
          background:
            'repeating-linear-gradient(115deg, var(--primary) 0 2px, transparent 2px 28px)',
        }}
      />
      <section className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/40">
        <div className="h-1 bg-primary" />
        <div className="p-7 sm:p-9">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Trophy aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-widest">
                EIA Racing League
              </p>
              <p className="text-xs text-muted-foreground">
                Liga de Camellos vs. Enanos
              </p>
            </div>
          </div>
          <p className="mt-9 font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold uppercase leading-none">
            {title}
          </h1>
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </main>
  );
}
