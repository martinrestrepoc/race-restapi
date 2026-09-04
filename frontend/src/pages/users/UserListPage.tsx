import { Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import type { UserProfileQuery, UserProfileStatus } from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/feedback/FeedbackState';
import { FilterBar } from '@/components/forms/FilterBar';
import { fieldControlClassName, FormField } from '@/components/forms/FormField';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { Panel } from '@/components/ui/Panel';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import { queryKeys } from '@/query/query-keys';
import { formatDateTime } from '@/pages/races/race-view';
import {
  userProfileStatusLabels,
  userProfileStatuses,
  UserStatusBadge,
} from './user-view';

const pageSizes = [10, 20, 50] as const;
const sortFields = [
  ['createdAt', 'Fecha de creación'],
  ['displayName', 'Nombre'],
  ['status', 'Estado'],
] as const;
type QueryPatch = {
  [Key in keyof UserProfileQuery]?: UserProfileQuery[Key] | undefined;
};

export function UserListPage() {
  const { resources } = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readQuery(searchParams);
  const [search, setSearch] = useState(query.search ?? '');
  useEffect(() => setSearch(query.search ?? ''), [query.search]);
  const users = useQuery({
    queryFn: ({ signal }) => resources.users.list(query, signal),
    queryKey: queryKeys.users.list(query),
  });

  function updateQuery(patch: QueryPatch) {
    const next = { ...query, ...patch };
    const params = new URLSearchParams();
    if (next.search) params.set('search', next.search);
    if (next.status) params.set('status', next.status);
    if (next.sortBy && next.sortBy !== 'createdAt')
      params.set('sortBy', next.sortBy);
    if (next.sortOrder && next.sortOrder !== 'desc')
      params.set('sortOrder', next.sortOrder);
    if (next.page !== 1) params.set('page', String(next.page));
    if (next.limit !== 20) params.set('limit', String(next.limit));
    setSearchParams(params);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateQuery({ page: 1, search: search.trim() || undefined });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
            to="/audit"
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            Ver auditoría
          </Link>
        }
        description="Consulta y administra el acceso de los usuarios a la aplicación."
        eyebrow="Administración"
        title="Usuarios"
      />
      <form onSubmit={submitSearch}>
        <FilterBar
          actions={
            <Button size="sm" type="submit">
              <Search aria-hidden="true" className="size-4" />
              Buscar
            </Button>
          }
        >
          <FormField htmlFor="user-search" label="Buscar">
            <input
              className={fieldControlClassName}
              id="user-search"
              maxLength={200}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre o correo"
              value={search}
            />
          </FormField>
          <FormField htmlFor="user-status" label="Estado">
            <select
              className={fieldControlClassName}
              id="user-status"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  status: (event.target.value || undefined) as
                    UserProfileStatus | undefined,
                })
              }
              value={query.status ?? ''}
            >
              <option value="">Todos</option>
              {userProfileStatuses.map((status) => (
                <option key={status} value={status}>
                  {userProfileStatusLabels[status]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="user-sort" label="Ordenar por">
            <select
              className={fieldControlClassName}
              id="user-sort"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  sortBy: event.target.value as NonNullable<
                    UserProfileQuery['sortBy']
                  >,
                })
              }
              value={query.sortBy}
            >
              {sortFields.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField htmlFor="user-order" label="Dirección">
            <select
              className={fieldControlClassName}
              id="user-order"
              onChange={(event) =>
                updateQuery({
                  page: 1,
                  sortOrder: event.target.value as 'asc' | 'desc',
                })
              }
              value={query.sortOrder}
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </FormField>
          <FormField htmlFor="user-limit" label="Por página">
            <select
              className={fieldControlClassName}
              id="user-limit"
              onChange={(event) =>
                updateQuery({ limit: Number(event.target.value), page: 1 })
              }
              value={query.limit}
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </FormField>
        </FilterBar>
      </form>
      <Panel
        action={
          <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            {users.data?.totalItems ?? 0} perfiles
          </span>
        }
        title="Perfiles locales"
      >
        {users.isPending ? (
          <LoadingState />
        ) : users.isError ? (
          <ErrorState
            description="No fue posible consultar los perfiles."
            onRetry={() => void users.refetch()}
            title="Error al cargar"
          />
        ) : users.data.items.length === 0 ? (
          <EmptyState
            description="No hay perfiles que coincidan con los filtros."
            title="Sin usuarios"
          />
        ) : (
          <div className="space-y-4">
            <ResponsiveTable
              caption="Perfiles de usuario"
              columns={[
                {
                  header: 'Usuario',
                  key: 'user',
                  render: (profile) => (
                    <div>
                      <Link
                        className="font-semibold hover:text-primary"
                        to={`/users/${profile.id}`}
                      >
                        {profile.displayName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {profile.emailSnapshot ?? 'Sin correo disponible'}
                      </p>
                    </div>
                  ),
                },
                {
                  header: 'Estado',
                  key: 'status',
                  render: (profile) => (
                    <UserStatusBadge status={profile.status} />
                  ),
                },
                {
                  header: 'Creación',
                  key: 'createdAt',
                  render: (profile) => formatDateTime(profile.createdAt),
                },
              ]}
              getRowKey={(profile) => profile.id}
              rows={users.data.items}
            />
            <Pagination
              currentPage={users.data.page}
              onPageChange={(page) => updateQuery({ page })}
              totalPages={users.data.totalPages}
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

function readQuery(params: URLSearchParams) {
  const limitCandidate = safeInteger(params.get('limit'), 20);
  const statusCandidate = params.get('status');
  const sortCandidate = params.get('sortBy');
  const search = params.get('search')?.trim().slice(0, 200);
  return {
    limit: pageSizes.includes(limitCandidate as (typeof pageSizes)[number])
      ? limitCandidate
      : 20,
    page: safeInteger(params.get('page'), 1),
    ...(search ? { search } : {}),
    sortBy: sortFields.some(([value]) => value === sortCandidate)
      ? (sortCandidate as NonNullable<UserProfileQuery['sortBy']>)
      : ('createdAt' as const),
    sortOrder:
      params.get('sortOrder') === 'asc' ? ('asc' as const) : ('desc' as const),
    ...(userProfileStatuses.includes(statusCandidate as UserProfileStatus)
      ? { status: statusCandidate as UserProfileStatus }
      : {}),
  };
}

function safeInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
