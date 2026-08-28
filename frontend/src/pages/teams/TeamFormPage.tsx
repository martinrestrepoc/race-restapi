/* eslint-disable react-refresh/only-export-components */
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { ApiError } from '@/api/api-errors';
import type { CreateTeamInput } from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import { ErrorState, LoadingState } from '@/components/feedback/FeedbackState';
import { SubmissionError } from '@/components/feedback/SubmissionError';
import { fieldControlClassName, FormField } from '@/components/forms/FormField';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import {
  invalidateResources,
  mutationInvalidation,
} from '@/query/invalidation';
import { queryKeys } from '@/query/query-keys';
import { teamStatusLabels } from '@/types/labels';
import { teamStatuses } from './team-view';

export const teamFormSchema = z.object({
  description: z.string().trim().max(500, 'Usa máximo 500 caracteres.'),
  name: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .max(120, 'Usa máximo 120 caracteres.'),
  responsiblePerson: z
    .string()
    .trim()
    .min(1, 'La persona responsable es obligatoria.')
    .max(150, 'Usa máximo 150 caracteres.'),
  status: z.enum(teamStatuses),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;
const defaults: TeamFormValues = {
  description: '',
  name: '',
  responsiblePerson: '',
  status: 'ACTIVE',
};

export function TeamFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { resources } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const form = useForm<TeamFormValues>({
    defaultValues: defaults,
    resolver: zodResolver(teamFormSchema),
  });

  const detailQuery = useQuery({
    enabled: isEditing,
    queryFn: ({ signal }) => resources.teams.detail(id!, signal),
    queryKey: queryKeys.teams.detail(id ?? ''),
  });

  useEffect(() => {
    if (!detailQuery.data) return;
    form.reset({
      description: detailQuery.data.description ?? '',
      name: detailQuery.data.name,
      responsiblePerson: detailQuery.data.responsiblePerson,
      status: detailQuery.data.status,
    });
  }, [detailQuery.data, form]);

  const mutation = useMutation({
    mutationFn: (values: TeamFormValues) => {
      const description = values.description.trim();
      const common = {
        ...(description ? { description } : {}),
        name: values.name.trim(),
        responsiblePerson: values.responsiblePerson.trim(),
      };
      return isEditing
        ? resources.teams.update(id!, common)
        : resources.teams.create({
            ...common,
            status: values.status,
          } satisfies CreateTeamInput);
    },
    onError: (error: Error) => {
      setSubmissionError(error.message);
      if (error instanceof ApiError) {
        let shouldFocus = true;
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field in defaults) {
            form.setError(
              field as keyof TeamFormValues,
              {
                message: messages[0] ?? error.message,
                type: 'server',
              },
              { shouldFocus },
            );
            shouldFocus = false;
          }
        }
        if (
          error.status === 409 &&
          error.message.toLowerCase().includes('name')
        ) {
          form.setError(
            'name',
            {
              message: 'Este nombre de equipo ya está en uso.',
              type: 'server',
            },
            { shouldFocus: true },
          );
        }
      }
    },
    onSuccess: async (team) => {
      if (isEditing)
        queryClient.setQueryData(queryKeys.teams.detail(team.id), team);
      await invalidateResources(queryClient, mutationInvalidation.team);
      void navigate(`/teams/${team.id}`, { replace: true });
    },
  });

  if (isEditing && detailQuery.isPending) return <LoadingState />;
  if (isEditing && detailQuery.isError)
    return (
      <ErrorState
        description={detailQuery.error.message}
        onRetry={() => void detailQuery.refetch()}
        title="No fue posible cargar el equipo"
      />
    );

  const errors = form.formState.errors;
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
            to={isEditing ? `/teams/${id}` : '/teams'}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Cancelar
          </Link>
        }
        description={
          isEditing
            ? 'Actualiza todos los campos editables. El estado se administra desde la ficha.'
            : 'Registra un equipo usando exactamente los campos aceptados por la API.'
        }
        eyebrow="Administración"
        title={isEditing ? 'Editar equipo' : 'Nuevo equipo'}
      />

      <Panel
        description="La descripción es opcional; nombre y responsable son obligatorios."
        title="Información del equipo"
      >
        <form
          className="space-y-6"
          noValidate
          onSubmit={(event) =>
            void form.handleSubmit((values) => {
              setSubmissionError(null);
              mutation.mutate(values);
            })(event)
          }
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              error={errors.name?.message}
              htmlFor="team-name"
              label="Nombre"
              required
            >
              <input
                aria-describedby={errors.name ? 'team-name-error' : undefined}
                aria-invalid={Boolean(errors.name)}
                className={fieldControlClassName}
                id="team-name"
                maxLength={120}
                {...form.register('name')}
              />
            </FormField>
            <FormField
              error={errors.responsiblePerson?.message}
              htmlFor="team-responsible-person"
              label="Persona responsable"
              required
            >
              <input
                aria-describedby={
                  errors.responsiblePerson
                    ? 'team-responsible-person-error'
                    : undefined
                }
                aria-invalid={Boolean(errors.responsiblePerson)}
                className={fieldControlClassName}
                id="team-responsible-person"
                maxLength={150}
                {...form.register('responsiblePerson')}
              />
            </FormField>
            {!isEditing ? (
              <FormField
                error={errors.status?.message}
                htmlFor="team-status"
                label="Estado inicial"
                required
              >
                <select
                  className={fieldControlClassName}
                  id="team-status"
                  {...form.register('status')}
                >
                  {teamStatuses.map((status) => (
                    <option key={status} value={status}>
                      {teamStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : null}
            <div className="md:col-span-2">
              <FormField
                error={errors.description?.message}
                hint="Opcional. Máximo 500 caracteres."
                htmlFor="team-description"
                label="Descripción"
              >
                <textarea
                  aria-describedby={
                    errors.description
                      ? 'team-description-error'
                      : 'team-description-hint'
                  }
                  aria-invalid={Boolean(errors.description)}
                  className={`${fieldControlClassName} min-h-28 resize-y`}
                  id="team-description"
                  maxLength={500}
                  {...form.register('description')}
                />
              </FormField>
            </div>
          </div>

          <SubmissionError message={submissionError} />

          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
              to={isEditing ? `/teams/${id}` : '/teams'}
            >
              Cancelar
            </Link>
            <Button disabled={mutation.isPending} type="submit">
              <Save aria-hidden="true" className="size-4" />
              {mutation.isPending ? 'Guardando…' : 'Guardar equipo'}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
