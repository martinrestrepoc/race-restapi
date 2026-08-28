import { LogOut, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/auth/use-auth';
import { Button } from '@/components/ui/Button';

import { AuthFrame } from './AuthFrame';

export function AccessDeniedPage() {
  const { logout, status } = useAuth();

  return (
    <AuthFrame eyebrow="Acceso denegado" title="Permisos insuficientes">
      <ShieldX aria-hidden="true" className="size-9 text-destructive" />
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Tu identidad es válida, pero no cuenta con un rol permitido para esta
        aplicación o sección.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        {status === 'authenticated' ? (
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
            to="/"
          >
            Volver al panel
          </Link>
        ) : null}
        <Button onClick={() => void logout()} variant="secondary">
          <LogOut aria-hidden="true" className="size-4" />
          Cerrar sesión
        </Button>
      </div>
    </AuthFrame>
  );
}
