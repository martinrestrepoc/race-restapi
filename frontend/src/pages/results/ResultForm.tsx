/* eslint-disable react-refresh/only-export-components */
import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type {
  CreateResultInput,
  RaceResult,
  Registration,
  ResultInput,
} from '@/api/domain.types';
import { fieldControlClassName, FormField } from '@/components/forms/FormField';
import { SubmissionError } from '@/components/feedback/SubmissionError';
import { Button } from '@/components/ui/Button';
import { resultStatusLabels } from '@/types/labels';
import { formatDuration, parseDuration, resultStatuses } from './result-view';

const durationMessage = 'Usa el formato MM:SS.mmm, por ejemplo 08:42.350.';

export const resultFormSchema = z
  .object({
    finalPosition: z.string(),
    notes: z.string().trim().max(1000, 'Usa máximo 1000 caracteres.'),
    penaltyTime: z.string(),
    rawTime: z.string(),
    registrationId: z.string().min(1, 'Selecciona una inscripción aprobada.'),
    status: z.enum(resultStatuses),
  })
  .superRefine((values, context) => {
    if (values.status !== 'FINISHED') return;
    const position = Number(values.finalPosition);
    if (!Number.isSafeInteger(position) || position < 1)
      context.addIssue({
        code: 'custom',
        message: 'Ingresa una posición final entera y positiva.',
        path: ['finalPosition'],
      });
    const rawTime = parseDuration(values.rawTime);
    if (rawTime === null || rawTime < 1)
      context.addIssue({
        code: 'custom',
        message: durationMessage,
        path: ['rawTime'],
      });
    if (parseDuration(values.penaltyTime) === null)
      context.addIssue({
        code: 'custom',
        message: durationMessage,
        path: ['penaltyTime'],
      });
  });

type ResultFormValues = z.infer<typeof resultFormSchema>;

export function ResultForm({
  disabled,
  initialResult,
  onSubmit,
  registrations = [],
  submissionError,
}: {
  disabled: boolean;
  initialResult?: RaceResult;
  onSubmit: (input: CreateResultInput | ResultInput) => void;
  registrations?: Registration[];
  submissionError?: string | null;
}) {
  const editing = Boolean(initialResult);
  const form = useForm<ResultFormValues>({
    defaultValues: initialValues(initialResult),
    resolver: zodResolver(resultFormSchema),
  });
  const status = form.watch('status');
  const errors = form.formState.errors;

  function submit(values: ResultFormValues) {
    const notes = values.notes.trim();
    const common = {
      ...(notes ? { notes } : {}),
      status: values.status,
    };
    const resultInput: ResultInput =
      values.status === 'FINISHED'
        ? {
            ...common,
            finalPosition: Number(values.finalPosition),
            penaltyTimeMs: parseDuration(values.penaltyTime)!,
            rawTimeMs: parseDuration(values.rawTime)!,
          }
        : { ...common, penaltyTimeMs: 0 };
    onSubmit(
      editing
        ? resultInput
        : { ...resultInput, registrationId: values.registrationId },
    );
  }

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
    >
      <div className="grid gap-5 md:grid-cols-2">
        {!editing ? (
          <FormField
            error={errors.registrationId?.message}
            hint="Solo se muestran inscripciones aprobadas con posición de salida."
            htmlFor="result-registration"
            label="Inscripción"
            required
          >
            <select
              aria-describedby={
                errors.registrationId
                  ? 'result-registration-error'
                  : 'result-registration-hint'
              }
              aria-invalid={Boolean(errors.registrationId)}
              className={fieldControlClassName}
              disabled={disabled}
              id="result-registration"
              {...form.register('registrationId', {
                required: 'Selecciona una inscripción aprobada.',
              })}
            >
              <option value="">Seleccionar inscripción</option>
              {registrations.map((registration) => (
                <option key={registration.id} value={registration.id}>
                  {registration.participantName} · Salida{' '}
                  {registration.startingPosition}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
        <FormField htmlFor="result-status" label="Resultado" required>
          <select
            className={fieldControlClassName}
            disabled={disabled}
            id="result-status"
            {...form.register('status')}
          >
            {resultStatuses.map((value) => (
              <option key={value} value={value}>
                {resultStatusLabels[value]}
              </option>
            ))}
          </select>
        </FormField>
        {status === 'FINISHED' ? (
          <>
            <FormField
              error={errors.finalPosition?.message}
              htmlFor="result-final-position"
              label="Posición final"
              required
            >
              <input
                aria-describedby={
                  errors.finalPosition
                    ? 'result-final-position-error'
                    : undefined
                }
                aria-invalid={Boolean(errors.finalPosition)}
                className={fieldControlClassName}
                disabled={disabled}
                id="result-final-position"
                inputMode="numeric"
                min={1}
                step={1}
                type="number"
                {...form.register('finalPosition')}
              />
            </FormField>
            <FormField
              error={errors.rawTime?.message}
              hint={durationMessage}
              htmlFor="result-raw-time"
              label="Tiempo bruto"
              required
            >
              <input
                aria-describedby={
                  errors.rawTime
                    ? 'result-raw-time-error'
                    : 'result-raw-time-hint'
                }
                aria-invalid={Boolean(errors.rawTime)}
                className={fieldControlClassName}
                disabled={disabled}
                id="result-raw-time"
                inputMode="numeric"
                placeholder="08:42.350"
                {...form.register('rawTime')}
              />
            </FormField>
            <FormField
              error={errors.penaltyTime?.message}
              hint="Usa 00:00.000 cuando no exista penalización."
              htmlFor="result-penalty-time"
              label="Penalización"
              required
            >
              <input
                aria-describedby={
                  errors.penaltyTime
                    ? 'result-penalty-time-error'
                    : 'result-penalty-time-hint'
                }
                aria-invalid={Boolean(errors.penaltyTime)}
                className={fieldControlClassName}
                disabled={disabled}
                id="result-penalty-time"
                inputMode="numeric"
                placeholder="00:00.000"
                {...form.register('penaltyTime')}
              />
            </FormField>
          </>
        ) : (
          <p className="rounded-md border border-border bg-background/45 p-3 text-xs leading-5 text-muted-foreground md:col-span-2">
            Los resultados que no finalizan se registran sin tiempo bruto ni
            posición final y sin penalización.
          </p>
        )}
        <div className="md:col-span-2">
          <FormField
            error={errors.notes?.message}
            hint={`${form.watch('notes').length}/1000 caracteres`}
            htmlFor="result-notes"
            label="Notas"
          >
            <textarea
              aria-describedby={
                errors.notes ? 'result-notes-error' : 'result-notes-hint'
              }
              aria-invalid={Boolean(errors.notes)}
              className={`${fieldControlClassName} min-h-24 resize-y`}
              disabled={disabled}
              id="result-notes"
              maxLength={1000}
              {...form.register('notes')}
            />
          </FormField>
        </div>
      </div>
      <SubmissionError message={submissionError} />
      <div className="flex justify-end border-t border-border pt-5">
        <Button disabled={disabled} type="submit">
          <Save aria-hidden="true" className="size-4" />
          {editing ? 'Revisar corrección' : 'Guardar resultado'}
        </Button>
      </div>
    </form>
  );
}

function initialValues(result?: RaceResult): ResultFormValues {
  return {
    finalPosition: result?.finalPosition ? String(result.finalPosition) : '',
    notes: result?.notes ?? '',
    penaltyTime: formatDuration(result?.penaltyTimeMs ?? 0),
    rawTime: result?.rawTimeMs ? formatDuration(result.rawTimeMs) : '',
    registrationId: result?.registrationId ?? '',
    status: result?.status ?? 'FINISHED',
  };
}
