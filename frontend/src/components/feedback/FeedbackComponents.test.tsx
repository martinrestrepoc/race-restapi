import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DisabledState,
  EmptyState,
  ErrorState,
  LoadingState,
} from './FeedbackState';
import { ConfirmDialog } from './ConfirmDialog';
import { Toast } from './Toast';

afterEach(() => vi.useRealTimers());

describe('shared feedback components', () => {
  it('exposes loading, empty and disabled states semantically', () => {
    const view = render(<LoadingState />);
    expect(screen.getByLabelText('Cargando contenido')).toHaveAttribute(
      'aria-busy',
      'true',
    );

    view.rerender(
      <EmptyState description="No existen filas." title="Sin datos" />,
    );
    expect(screen.getByText('Sin datos')).toBeInTheDocument();

    view.rerender(
      <DisabledState description="Acción bloqueada." title="No disponible" />,
    );
    expect(screen.getByText('Acción bloqueada.')).toBeInTheDocument();
  });

  it('offers a contextual retry action for recoverable failures', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorState
        description="La red no respondió."
        onRetry={onRetry}
        title="Error al cargar"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('uses assertive announcements for errors and polite ones for success', () => {
    const view = render(
      <Toast
        message="No fue posible guardar."
        onDismiss={vi.fn()}
        title="Error"
        tone="danger"
      />,
    );
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');

    view.rerender(
      <Toast message="Cambios guardados." onDismiss={vi.fn()} title="Listo" />,
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('dismisses success notifications automatically after a short delay', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <Toast
        message="Cambios guardados."
        onDismiss={onDismiss}
        title="Listo"
      />,
    );

    void act(() => vi.advanceTimersByTime(1_999));
    expect(onDismiss).not.toHaveBeenCalled();

    void act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('keeps error notifications visible until they are dismissed', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <Toast
        message="No fue posible guardar."
        onDismiss={onDismiss}
        title="Error"
        tone="danger"
      />,
    );

    void act(() => vi.advanceTimersByTime(10_000));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('locks every dialog action while a destructive request is pending', () => {
    render(
      <ConfirmDialog
        busy
        confirmLabel="Eliminar"
        description="Operación irreversible."
        isOpen
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        title="¿Eliminar?"
      />,
    );

    expect(screen.getByRole('button', { name: 'Procesando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled();
  });
});
