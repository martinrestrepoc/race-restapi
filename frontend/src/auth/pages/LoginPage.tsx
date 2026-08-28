import { LogIn, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/auth/use-auth';
import { Button } from '@/components/ui/Button';

import { AuthFrame } from './AuthFrame';

export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const returnTo = getReturnTo(location.state);

  async function handleLogin() {
    setSubmitting(true);
    setFailed(false);
    try {
      await login(returnTo);
    } catch {
      setFailed(true);
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame eyebrow="Acceso seguro" title="Iniciar sesión">
      <p className="text-sm leading-6 text-muted-foreground">
        Ingresa mediante el proveedor de identidad institucional. La aplicación
        no recibe ni almacena tu contraseña.
      </p>
      <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-background/55 p-4">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-primary"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Keycloak utilizará Authorization Code Flow con PKCE S256 y devolverá
          la sesión a esta aplicación.
        </p>
      </div>
      {failed ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          No fue posible iniciar el flujo de acceso. Intenta nuevamente.
        </p>
      ) : null}
      <Button
        className="mt-6 w-full"
        disabled={submitting}
        onClick={() => void handleLogin()}
      >
        <LogIn aria-hidden="true" className="size-4" />
        {submitting ? 'Redirigiendo…' : 'Continuar con Keycloak'}
      </Button>
    </AuthFrame>
  );
}

function getReturnTo(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'returnTo' in state &&
    typeof state.returnTo === 'string'
  ) {
    return state.returnTo;
  }

  return '/';
}
