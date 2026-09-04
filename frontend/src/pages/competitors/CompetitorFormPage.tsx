/* eslint-disable react-refresh/only-export-components */
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { ApiError } from '@/api/api-errors';
import type { CreateCompetitorInput } from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import { ErrorState, LoadingState } from '@/components/feedback/FeedbackState';
import { SubmissionError } from '@/components/feedback/SubmissionError';
import { FormField, fieldControlClassName } from '@/components/forms/FormField';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import {
  invalidateResources,
  mutationInvalidation,
} from '@/query/invalidation';
import { queryKeys } from '@/query/query-keys';
import { competitorStatusLabels, competitorTypeLabels } from '@/types/labels';
import { competitorStatuses, competitorTypes } from './competitor-view';

const decimalPlaces = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}

export const competitorFormSchema = z.object({
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD.')
    .refine(isValidIsoDate, 'Ingresa una fecha válida.'),
  height: z
    .number({ error: 'Ingresa una altura válida.' })
    .positive('La altura debe ser mayor que cero.')
    .max(999.99, 'La altura máxima es 999.99.')
    .refine(decimalPlaces, 'Usa máximo dos decimales.'),
  name: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .max(150, 'Usa máximo 150 caracteres.'),
  nickname: z
    .string()
    .trim()
    .min(1, 'El apodo es obligatorio.')
    .max(80, 'Usa máximo 80 caracteres.'),
  origin: z
    .string()
    .trim()
    .min(1, 'El origen es obligatorio.')
    .max(120, 'Usa máximo 120 caracteres.'),
  status: z.enum(competitorStatuses),
  type: z.enum(competitorTypes),
  weight: z
    .number({ error: 'Ingresa un peso válido.' })
    .positive('El peso debe ser mayor que cero.')
    .max(9999.99, 'El peso máximo es 9999.99.')
    .refine(decimalPlaces, 'Usa máximo dos decimales.'),
});

type CompetitorFormValues = z.infer<typeof competitorFormSchema>;
const defaults: CompetitorFormValues = {
  dateOfBirth: '',
  height: 0,
  name: '',
  nickname: '',
  origin: '',
  status: 'ACTIVE',
  type: 'DWARF',
  weight: 0,
};

export function CompetitorFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { resources } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const form = useForm<CompetitorFormValues>({
    defaultValues: defaults,
    resolver: zodResolver(competitorFormSchema),
  });

  const detailQuery = useQuery({
    enabled: isEditing,
    queryFn: ({ signal }) => resources.competitors.detail(id!, signal),
    queryKey: queryKeys.competitors.detail(id ?? ''),
  });

  useEffect(() => {
    if (!detailQuery.data) return;
    form.reset({
      dateOfBirth: detailQuery.data.dateOfBirth,
      height: detailQuery.data.height,
      name: detailQuery.data.name,
      nickname: detailQuery.data.nickname,
      origin: detailQuery.data.origin,
      status: detailQuery.data.status,
      type: detailQuery.data.type,
      weight: detailQuery.data.weight,
    });
  }, [detailQuery.data, form]);

  const mutation = useMutation({
    mutationFn: (values: CompetitorFormValues) => {
      const input: CreateCompetitorInput = {
        ...values,
        name: values.name.trim(),
        nickname: values.nickname.trim(),
        origin: values.origin.trim(),
      };
      return isEditing
        ? resources.competitors.update(id!, {
            dateOfBirth: input.dateOfBirth,
            height: input.height,
            name: input.name,
            nickname: input.nickname,
            origin: input.origin,
            type: input.type,
            weight: input.weight,
          })
        : resources.competitors.create(input);
    },
    onError: (error: Error) => {
      setSubmissionError(error.message);
      if (error instanceof ApiError) {
        let shouldFocus = true;
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field in defaults) {
            form.setError(
              field as keyof CompetitorFormValues,
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
          error.message.toLowerCase().includes('nickname')
        ) {
          form.setError(
            'nickname',
            {
              message: 'Este apodo ya está en uso.',
              type: 'server',
            },
            { shouldFocus: true },
          );
        }
      }
    },
    onSuccess: async (competitor) => {
      queryClient.setQueryData(
        queryKeys.competitors.detail(competitor.id),
        competitor,
      );
      await invalidateResources(queryClient, mutationInvalidation.competitor);
      void navigate(`/competitors/${competitor.id}`, { replace: true });
    },
  });

  if (isEditing && detailQuery.isPending) return <LoadingState />;
  if (isEditing && detailQuery.isError)
    return (
      <ErrorState
        description={detailQuery.error.message}
        onRetry={() => void detailQuery.refetch()}
        title="No fue posible cargar el competidor"
      />
    );

  const errors = form.formState.errors;
  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
            to={isEditing ? `/competitors/${id}` : '/competitors'}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Cancelar
          </Link>
        }
        description={
          isEditing
            ? 'Actualiza todos los campos editables. El estado se administra desde la ficha.'
            : 'Completa la información para registrar un nuevo competidor.'
        }
        eyebrow="Administración"
        title={isEditing ? 'Editar competidor' : 'Nuevo competidor'}
      />

      <Panel
        description="Los campos marcados son obligatorios. Peso y altura aceptan máximo dos decimales."
        title="Información del competidor"
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
              htmlFor="competitor-name"
              label="Nombre"
              required
            >
              <input
                aria-describedby={
                  errors.name ? 'competitor-name-error' : undefined
                }
                aria-invalid={Boolean(errors.name)}
                className={fieldControlClassName}
                id="competitor-name"
                maxLength={150}
                {...form.register('name')}
              />
            </FormField>
            <FormField
              error={errors.nickname?.message}
              htmlFor="competitor-nickname"
              label="Apodo"
              required
            >
              <input
                aria-describedby={
                  errors.nickname ? 'competitor-nickname-error' : undefined
                }
                aria-invalid={Boolean(errors.nickname)}
                className={fieldControlClassName}
                id="competitor-nickname"
                maxLength={80}
                {...form.register('nickname')}
              />
            </FormField>
            <FormField
              error={errors.type?.message}
              htmlFor="competitor-type"
              label="Tipo"
              required
            >
              <select
                className={fieldControlClassName}
                id="competitor-type"
                {...form.register('type')}
              >
                {competitorTypes.map((type) => (
                  <option key={type} value={type}>
                    {competitorTypeLabels[type]}
                  </option>
                ))}
              </select>
            </FormField>
            {!isEditing ? (
              <FormField
                error={errors.status?.message}
                htmlFor="competitor-status"
                label="Estado inicial"
                required
              >
                <select
                  className={fieldControlClassName}
                  id="competitor-status"
                  {...form.register('status')}
                >
                  {competitorStatuses.map((status) => (
                    <option key={status} value={status}>
                      {competitorStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : null}
            <FormField
              error={errors.dateOfBirth?.message}
              htmlFor="competitor-date-of-birth"
              label="Fecha de nacimiento"
              required
            >
              <input
                aria-describedby={
                  errors.dateOfBirth
                    ? 'competitor-date-of-birth-error'
                    : undefined
                }
                aria-invalid={Boolean(errors.dateOfBirth)}
                className={fieldControlClassName}
                id="competitor-date-of-birth"
                type="date"
                {...form.register('dateOfBirth')}
              />
            </FormField>
            <FormField
              error={errors.origin?.message}
              htmlFor="competitor-origin"
              label="Origen"
              required
            >
              <input
                aria-describedby={
                  errors.origin ? 'competitor-origin-error' : undefined
                }
                aria-invalid={Boolean(errors.origin)}
                className={fieldControlClassName}
                id="competitor-origin"
                maxLength={120}
                {...form.register('origin')}
              />
            </FormField>
            <FormField
              error={errors.weight?.message}
              hint="Unidad: kilogramos."
              htmlFor="competitor-weight"
              label="Peso"
              required
            >
              <input
                aria-describedby={
                  errors.weight
                    ? 'competitor-weight-error'
                    : 'competitor-weight-hint'
                }
                aria-invalid={Boolean(errors.weight)}
                className={fieldControlClassName}
                id="competitor-weight"
                max="9999.99"
                min="0.01"
                step="0.01"
                type="number"
                {...form.register('weight', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              error={errors.height?.message}
              hint="Unidad: centímetros."
              htmlFor="competitor-height"
              label="Altura"
              required
            >
              <input
                aria-describedby={
                  errors.height
                    ? 'competitor-height-error'
                    : 'competitor-height-hint'
                }
                aria-invalid={Boolean(errors.height)}
                className={fieldControlClassName}
                id="competitor-height"
                max="999.99"
                min="0.01"
                step="0.01"
                type="number"
                {...form.register('height', { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <SubmissionError message={submissionError} />

          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
              to={isEditing ? `/competitors/${id}` : '/competitors'}
            >
              Cancelar
            </Link>
            <Button disabled={mutation.isPending} type="submit">
              <Save aria-hidden="true" className="size-4" />
              {mutation.isPending ? 'Guardando…' : 'Guardar competidor'}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
