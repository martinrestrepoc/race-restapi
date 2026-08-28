import { Ban, LogOut } from 'lucide-react';

import { useAuth } from '@/auth/use-auth';
import { Button } from '@/components/ui/Button';

import { AuthFrame } from './AuthFrame';

export function AccountDisabledPage() {
  const { logout, profile } = useAuth();

  return (
    <AuthFrame eyebrow="Perfil local" title="Acceso deshabilitado">
      <Ban aria-hidden="true" className="size-9 text-warning" />
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {profile?.displayName ? `${profile.displayName}, tu` : 'Tu'} identidad
        de Keycloak es válida, pero el perfil local no puede realizar
        operaciones del dominio. Contacta a un administrador.
      </p>
      <Button
        className="mt-6 w-full"
        onClick={() => void logout()}
        variant="secondary"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Cerrar sesión
      </Button>
    </AuthFrame>
  );
}
