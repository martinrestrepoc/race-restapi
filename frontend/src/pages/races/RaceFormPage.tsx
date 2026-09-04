/* eslint-disable react-refresh/only-export-components */
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { ApiError } from '@/api/api-errors';
import type { RaceInput } from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import {
  DisabledState,
  ErrorState,
  LoadingState,
} from '@/components/feedback/FeedbackState';
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
import { raceTypeLabels } from '@/types/labels';
import {
  browserTimeZoneLabel,
  localDateTimeToIso,
  raceTypes,
  toLocalDateTimeInput,
} from './race-view';

const atMostTwoDecimals = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
const isLocalDateTime = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year!, month! - 1, day, hour, minute);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month! - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
  );
};

export const raceFormSchema = z
  .object({
    description: z.string().trim().max(1000, 'Usa máximo 1000 caracteres.'),
    distanceMeters: z
      .number({ error: 'Ingresa una distancia válida.' })
      .positive('La distancia debe ser mayor que cero.')
      .max(9_999_999_999.99, 'La distancia supera el máximo permitido.')
      .refine(atMostTwoDecimals, 'Usa máximo dos decimales.'),
    finishLocation: z
      .string()
      .trim()
      .min(1, 'La ubicación final es obligatoria.')
      .max(200, 'Usa máximo 200 caracteres.'),
    maxParticipants: z
      .number({ error: 'Ingresa una capacidad válida.' })
      .int('La capacidad debe ser un número entero.')
      .min(1, 'La capacidad mínima es 1.')
      .max(100_000, 'La capacidad máxima es 100000.'),
    name: z
      .string()
      .trim()
      .min(1, 'El nombre es obligatorio.')
      .max(150, 'Usa máximo 150 caracteres.'),
    registrationDeadline: z
      .string()
      .refine(isLocalDateTime, 'Ingresa una fecha y hora válidas.'),
    scheduledAt: z
      .string()
      .refine(isLocalDateTime, 'Ingresa una fecha y hora válidas.'),
    startLocation: z
      .string()
      .trim()
      .min(1, 'La ubicación inicial es obligatoria.')
      .max(200, 'Usa máximo 200 caracteres.'),
    type: z.enum(raceTypes),
  })
  .superRefine((values, context) => {
    if (
      isLocalDateTime(values.registrationDeadline) &&
      isLocalDateTime(values.scheduledAt) &&
      new Date(values.registrationDeadline).getTime() >=
        new Date(values.scheduledAt).getTime()
    ) {
      context.addIssue({
        code: 'custom',
        message: 'El cierre debe ser anterior al inicio de la carrera.',
        path: ['registrationDeadline'],
      });
    }
  });

type RaceFormValues = z.infer<typeof raceFormSchema>;
const defaults: RaceFormValues = {
  description: '',
  distanceMeters: 0,
  finishLocation: '',
  maxParticipants: 1,
  name: '',
  registrationDeadline: '',
  scheduledAt: '',
  startLocation: '',
  type: 'INDIVIDUAL',
};

export function RaceFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { resources } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const form = useForm<RaceFormValues>({
    defaultValues: defaults,
    resolver: zodResolver(raceFormSchema),
  });
  const timeZone = browserTimeZoneLabel();

  const detailQuery = useQuery({
    enabled: isEditing,
    queryFn: ({ signal }) => resources.races.detail(id!, signal),
    queryKey: queryKeys.races.detail(id ?? ''),
  });

  useEffect(() => {
    if (!detailQuery.data) return;
    form.reset({
      description: detailQuery.data.description ?? '',
      distanceMeters: detailQuery.data.distanceMeters,
      finishLocation: detailQuery.data.finishLocation,
      maxParticipants: detailQuery.data.maxParticipants,
      name: detailQuery.data.name,
      registrationDeadline: toLocalDateTimeInput(
        detailQuery.data.registrationDeadline,
      ),
      scheduledAt: toLocalDateTimeInput(detailQuery.data.scheduledAt),
      startLocation: detailQuery.data.startLocation,
      type: detailQuery.data.type,
    });
  }, [detailQuery.data, form]);

  const mutation = useMutation({
    mutationFn: (input: RaceInput) =>
      isEditing
        ? resources.races.update(id!, input)
        : resources.races.create(input),
    onError: (error: Error) => {
      setSubmissionError(raceFormErrorMessage(error));
      if (error instanceof ApiError) {
        let shouldFocus = true;
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (field in defaults) {
            form.setError(
              field as keyof RaceFormValues,
              {
                message: messages[0] ?? error.message,
                type: 'server',
              },
              { shouldFocus },
            );
            shouldFocus = false;
          }
        }
        if (error.message.includes('scheduledAt must be in the future'))
          form.setError(
            'scheduledAt',
            {
              message: 'La fecha programada debe estar en el futuro.',
              type: 'server',
            },
            { shouldFocus: true },
          );
        if (error.message.includes('registrationDeadline must be earlier'))
          form.setError(
            'registrationDeadline',
            {
              message: 'El cierre debe ser anterior al inicio de la carrera.',
              type: 'server',
            },
            { shouldFocus: true },
          );
      }
    },
    onSuccess: async (race) => {
      queryClient.setQueryData(queryKeys.races.detail(race.id), race);
      await invalidateResources(queryClient, mutationInvalidation.race);
      void navigate(`/races/${race.id}`, { replace: true });
    },
  });

  if (isEditing && detailQuery.isPending) return <LoadingState />;
  if (isEditing && detailQuery.isError)
    return (
      <ErrorState
        description={detailQuery.error.message}
        onRetry={() => void detailQuery.refetch()}
        title="No fue posible cargar la carrera"
      />
    );
  if (isEditing && detailQuery.data?.status !== 'DRAFT')
    return (
      <DisabledState
        description="Solo las carreras en estado Borrador admiten una actualización completa."
        title="Edición no disponible"
      />
    );

  const errors = form.formState.errors;
  function submit(values: RaceFormValues) {
    setSubmissionError(null);
    if (!isEditing && new Date(values.scheduledAt).getTime() <= Date.now()) {
      form.setError(
        'scheduledAt',
        {
          message: 'La fecha programada debe estar en el futuro.',
          type: 'client',
        },
        { shouldFocus: true },
      );
      return;
    }
    const description = values.description.trim();
    mutation.mutate({
      ...(description ? { description } : {}),
      distanceMeters: values.distanceMeters,
      finishLocation: values.finishLocation.trim(),
      maxParticipants: values.maxParticipants,
      name: values.name.trim(),
      registrationDeadline: localDateTimeToIso(values.registrationDeadline),
      scheduledAt: localDateTimeToIso(values.scheduledAt),
      startLocation: values.startLocation.trim(),
      type: values.type,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
            to={isEditing ? `/races/${id}` : '/races'}
          >
            <ArrowLeft className="size-4" />
            Cancelar
          </Link>
        }
        description={
          isEditing
            ? 'Solo las carreras en borrador admiten una actualización completa.'
            : 'La carrera se creará inicialmente como borrador.'
        }
        eyebrow="Gestión de carreras"
        title={isEditing ? 'Editar carrera' : 'Nueva carrera'}
      />
      <Panel
        description={`Las fechas se ingresan en la zona horaria ${timeZone}.`}
        title="Información de la carrera"
      >
        <form
          className="space-y-6"
          noValidate
          onSubmit={(event) => void form.handleSubmit(submit)(event)}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              error={errors.name?.message}
              htmlFor="race-name"
              label="Nombre"
              required
            >
              <input
                aria-invalid={Boolean(errors.name)}
                className={fieldControlClassName}
                id="race-name"
                maxLength={150}
                {...form.register('name')}
              />
            </FormField>
            <FormField
              error={errors.type?.message}
              htmlFor="race-type"
              label="Tipo"
              required
            >
              <select
                className={fieldControlClassName}
                id="race-type"
                {...form.register('type')}
              >
                {raceTypes.map((type) => (
                  <option key={type} value={type}>
                    {raceTypeLabels[type]}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              error={errors.scheduledAt?.message}
              hint={`Zona horaria: ${timeZone}.`}
              htmlFor="race-scheduled-at"
              label="Inicio programado"
              required
            >
              <input
                aria-invalid={Boolean(errors.scheduledAt)}
                className={fieldControlClassName}
                id="race-scheduled-at"
                type="datetime-local"
                {...form.register('scheduledAt')}
              />
            </FormField>
            <FormField
              error={errors.registrationDeadline?.message}
              hint="Debe ser anterior al inicio."
              htmlFor="race-registration-deadline"
              label="Cierre de inscripciones"
              required
            >
              <input
                aria-invalid={Boolean(errors.registrationDeadline)}
                className={fieldControlClassName}
                id="race-registration-deadline"
                type="datetime-local"
                {...form.register('registrationDeadline')}
              />
            </FormField>
            <FormField
              error={errors.startLocation?.message}
              htmlFor="race-start-location"
              label="Lugar de salida"
              required
            >
              <input
                aria-invalid={Boolean(errors.startLocation)}
                className={fieldControlClassName}
                id="race-start-location"
                maxLength={200}
                {...form.register('startLocation')}
              />
            </FormField>
            <FormField
              error={errors.finishLocation?.message}
              htmlFor="race-finish-location"
              label="Lugar de llegada"
              required
            >
              <input
                aria-invalid={Boolean(errors.finishLocation)}
                className={fieldControlClassName}
                id="race-finish-location"
                maxLength={200}
                {...form.register('finishLocation')}
              />
            </FormField>
            <FormField
              error={errors.distanceMeters?.message}
              hint="Unidad: metros. Máximo dos decimales."
              htmlFor="race-distance"
              label="Distancia"
              required
            >
              <input
                aria-invalid={Boolean(errors.distanceMeters)}
                className={fieldControlClassName}
                id="race-distance"
                min="0.01"
                step="0.01"
                type="number"
                {...form.register('distanceMeters', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              error={errors.maxParticipants?.message}
              hint="Número entero entre 1 y 100000."
              htmlFor="race-capacity"
              label="Capacidad máxima"
              required
            >
              <input
                aria-invalid={Boolean(errors.maxParticipants)}
                className={fieldControlClassName}
                id="race-capacity"
                max="100000"
                min="1"
                step="1"
                type="number"
                {...form.register('maxParticipants', { valueAsNumber: true })}
              />
            </FormField>
            <div className="md:col-span-2">
              <FormField
                error={errors.description?.message}
                hint="Opcional. Máximo 1000 caracteres."
                htmlFor="race-description"
                label="Descripción"
              >
                <textarea
                  aria-invalid={Boolean(errors.description)}
                  className={`${fieldControlClassName} min-h-28 resize-y`}
                  id="race-description"
                  maxLength={1000}
                  {...form.register('description')}
                />
              </FormField>
            </div>
          </div>
          <SubmissionError message={submissionError} />
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
              to={isEditing ? `/races/${id}` : '/races'}
            >
              Cancelar
            </Link>
            <Button disabled={mutation.isPending} type="submit">
              <Save className="size-4" />
              {mutation.isPending ? 'Guardando…' : 'Guardar carrera'}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

function raceFormErrorMessage(error: Error) {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    error.message.includes('cannot be edited')
  )
    return 'La carrera dejó de estar en borrador y ya no puede editarse.';
  if (
    error instanceof ApiError &&
    error.message.includes('scheduledAt must be in the future')
  )
    return 'La fecha programada debe estar en el futuro.';
  if (
    error instanceof ApiError &&
    error.message.includes('registrationDeadline must be earlier')
  )
    return 'El cierre de inscripciones debe ser anterior al inicio.';
  return error.message;
}
