import { LoaderCircle } from 'lucide-react';

import { AuthFrame } from './AuthFrame';

export function SessionLoadingPage() {
  return (
    <AuthFrame eyebrow="Verificando acceso" title="Preparando la sesión">
      <div aria-busy="true" className="flex items-center gap-3" role="status">
        <LoaderCircle
          aria-hidden="true"
          className="size-5 animate-spin text-primary"
        />
        <p className="text-sm text-muted-foreground">
          Validando la sesión segura…
        </p>
      </div>
    </AuthFrame>
  );
}
