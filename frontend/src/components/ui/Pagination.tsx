import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}

export function Pagination({
  currentPage,
  onPageChange,
  totalPages,
}: PaginationProps) {
  const safeTotal = Math.max(1, totalPages);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
    >
      <p className="font-mono text-xs text-muted-foreground">
        Página {currentPage} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          aria-label="Ir a la página anterior"
          disabled={currentPage <= 1 || totalPages === 0}
          onClick={() => onPageChange(currentPage - 1)}
          size="sm"
          variant="secondary"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Anterior
        </Button>
        <Button
          aria-label="Ir a la página siguiente"
          disabled={currentPage >= safeTotal || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
          size="sm"
          variant="secondary"
        >
          Siguiente
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
