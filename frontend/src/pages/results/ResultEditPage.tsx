import { ArrowLeft } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { ResultInput } from '@/api/domain.types';
import { useApi } from '@/api/use-api';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import {
  DisabledState,
  ErrorState,
  LoadingState,
} from '@/components/feedback/FeedbackState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import {
  invalidateResources,
  mutationInvalidation,
} from '@/query/invalidation';
import { queryKeys } from '@/query/query-keys';
import { ResultForm } from './ResultForm';
import { resultErrorMessage } from './result-view';

export function ResultEditPage() {
  const { id = '' } = useParams();
  const { resources } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pendingInput, setPendingInput] = useState<ResultInput | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const resultQuery = useQuery({
    enabled: Boolean(id),
    queryFn: ({ signal }) => resources.results.detail(id, signal),
    queryKey: queryKeys.results.detail(id),
  });
  const raceId = resultQuery.data?.raceId ?? '';
  const raceQuery = useQuery({
    enabled: Boolean(raceId),
    queryFn: ({ signal }) => resources.races.detail(raceId, signal),
    queryKey: queryKeys.races.detail(raceId),
  });
  const mutation = useMutation({
    mutationFn: (input: ResultInput) => resources.results.update(id, input),
    onError: (error: Error) => {
      setPendingInput(null);
      setSubmissionError(resultErrorMessage(error));
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.results.detail(id), result);
      await invalidateResources(queryClient, mutationInvalidation.result);
      void navigate(`/races/${result.raceId}/results`, {
        replace: true,
        state: {
          message:
            'La corrección fue guardada y quedó registrada en la auditoría del backend.',
          title: 'Resultado corregido',
        },
      });
    },
  });

  if (resultQuery.isPending || (raceId && raceQuery.isPending))
    return <LoadingState />;
  if (resultQuery.isError || raceQuery.isError)
    return (
      <ErrorState
        description="No fue posible cargar el resultado y su carrera."
        onRetry={() => {
          void resultQuery.refetch();
          void raceQuery.refetch();
        }}
        title="Error al cargar"
      />
    );
  const result = resultQuery.data;
  const race = raceQuery.data;
  if (!result || !race) return <LoadingState />;
  const correctionAllowed =
    race.status === 'IN_PROGRESS' || race.status === 'COMPLETED';

  if (!correctionAllowed)
    return (
      <DisabledState
        description="El backend solo permite corregir resultados durante una carrera o después de completarla."
        title="Corrección no disponible"
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/75"
            to={`/races/${race.id}/results`}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Cancelar
          </Link>
        }
        description={`Inscripción ${result.registrationId} · salida ${result.startingPosition}`}
        eyebrow={
          race.status === 'COMPLETED'
            ? 'Corrección de resultado oficial'
            : 'Corrección durante la carrera'
        }
        title={race.name}
      />
      <Panel
        description="No se crea una segunda fila: el backend actualiza el resultado y registra el cambio en auditoría."
        title="Datos corregidos"
      >
        <ResultForm
          disabled={mutation.isPending}
          initialResult={result}
          onSubmit={(input) => {
            setSubmissionError(null);
            setPendingInput(input);
          }}
          submissionError={submissionError}
        />
      </Panel>
      <ConfirmDialog
        busy={mutation.isPending}
        confirmLabel="Guardar corrección"
        description={
          race.status === 'COMPLETED'
            ? 'Estás modificando un resultado oficial de una carrera completada. El cambio alterará las clasificaciones derivadas y quedará auditado.'
            : 'Estás corrigiendo un resultado ya registrado. El valor anterior y el nuevo quedarán auditados.'
        }
        isOpen={pendingInput !== null}
        onCancel={() => setPendingInput(null)}
        onConfirm={() => {
          if (!pendingInput) return;
          const input = pendingInput;
          setPendingInput(null);
          mutation.mutate(input);
        }}
        title="¿Confirmar la corrección?"
      />
    </div>
  );
}
