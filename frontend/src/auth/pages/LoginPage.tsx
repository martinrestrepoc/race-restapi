import { LogIn } from 'lucide-react';
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
        Ingresa con tu cuenta institucional para acceder a la liga.
      </p>
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
        {submitting ? 'Redirigiendo…' : 'Iniciar sesión'}
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
