import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/Button';

interface BoundaryProps {
  children: ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

class RouteBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics local to the browser console; never render stack traces.
    console.error('Unexpected route render error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section
        aria-labelledby="route-error-title"
        className="flex min-h-[55vh] flex-col items-center justify-center rounded-xl border border-destructive/35 bg-card px-5 py-12 text-center"
        role="alert"
      >
        <TriangleAlert
          aria-hidden="true"
          className="size-10 text-destructive"
        />
        <h1
          className="mt-4 font-display text-2xl font-bold uppercase"
          id="route-error-title"
        >
          Esta pantalla tuvo un problema
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Tus datos no se modificaron. Intenta cargar de nuevo la pantalla; si
          el problema continúa, vuelve al panel principal.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => this.setState({ error: null })}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Reintentar
          </Button>
          <Button
            onClick={() => window.location.assign('/')}
            variant="secondary"
          >
            Ir al panel
          </Button>
        </div>
      </section>
    );
  }
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <RouteBoundary key={location.pathname}>{children}</RouteBoundary>;
}
