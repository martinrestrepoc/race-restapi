import { KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react';

import { useAuth } from '@/auth/use-auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { appRoleLabels } from '@/types/labels';
import { formatDateTime } from '@/pages/races/race-view';
import { UserStatusBadge } from '@/pages/users/user-view';

export function ProfilePage() {
  const { logout, profile, roles, user } = useAuth();
  if (!profile || !user) return null;
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => void logout()} variant="secondary">
            <LogOut aria-hidden="true" className="size-4" />
            Cerrar sesión
          </Button>
        }
        description="Información efectiva de tu identidad autenticada y del perfil local asociado."
        eyebrow="Cuenta"
        title="Mi perfil"
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          action={
            <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
          }
          description="Keycloak autentica, administra credenciales, sesiones y roles."
          title="Identidad de Keycloak"
        >
          <dl className="space-y-5">
            <Datum label="Usuario" value={user.username ?? 'No disponible'} />
            <Datum label="Correo" value={user.email ?? 'No disponible'} />
            <Datum label="Identificador estable (sub)" value={user.sub} mono />
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Roles efectivos
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {roles.map((role) => (
                  <StatusBadge key={role} tone="primary">
                    {appRoleLabels[role]}
                  </StatusBadge>
                ))}
              </dd>
            </div>
          </dl>
        </Panel>
        <Panel
          action={<UserStatusBadge status={profile.status} />}
          description="Este registro enlaza la identidad externa con las reglas locales de acceso."
          title="Perfil local"
        >
          <dl className="space-y-5">
            <Datum label="Nombre visible" value={profile.displayName} />
            <Datum
              label="Correo almacenado"
              value={profile.emailSnapshot ?? 'No disponible'}
            />
            <Datum label="ID local" value={profile.id} mono />
            <Datum label="Creado" value={formatDateTime(profile.createdAt)} />
            <Datum
              label="Actualizado"
              value={formatDateTime(profile.updatedAt)}
            />
          </dl>
        </Panel>
      </div>
      <Panel
        action={
          <KeyRound
            aria-hidden="true"
            className="size-5 text-muted-foreground"
          />
        }
        title="Seguridad de la cuenta"
      >
        <div className="flex items-start gap-3 rounded-md border border-border bg-background/45 p-4">
          <UserRound
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-primary"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            Esta aplicación no almacena ni modifica tu contraseña y tampoco
            permite editar roles. Esas operaciones pertenecen exclusivamente a
            Keycloak.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function Datum({
  label,
  mono = false,
  value,
}: {
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 break-all text-sm ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
