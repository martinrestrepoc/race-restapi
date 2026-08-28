import { RefreshCw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/Button';

import { AuthFrame } from './AuthFrame';

export function AuthUnavailablePage() {
  return (
    <AuthFrame
      eyebrow="Servicio no disponible"
      title="No pudimos validar el acceso"
    >
      <TriangleAlert aria-hidden="true" className="size-9 text-destructive" />
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Verifica que Keycloak y la API estén disponibles. No se mostrarán
        detalles internos de autenticación.
      </p>
      <Button
        className="mt-6 w-full"
        onClick={() => window.location.reload()}
        variant="secondary"
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        Reintentar
      </Button>
    </AuthFrame>
  );
}
