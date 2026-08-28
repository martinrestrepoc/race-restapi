import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/FeedbackState';

export function NotFoundPage() {
  return (
    <div className="space-y-4">
      <EmptyState
        description="La dirección no corresponde a una pantalla disponible."
        title="Página no encontrada"
      />
      <div className="text-center">
        <Link
          className="text-sm font-semibold text-primary hover:underline"
          to="/"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
