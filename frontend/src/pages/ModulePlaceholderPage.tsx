import { Construction } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';

export function ModulePlaceholderPage({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <>
      <PageHeader
        description={description}
        eyebrow="Ruta preparada"
        title={title}
      />
      <section className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <Construction aria-hidden="true" className="size-10 text-primary" />
        <h2 className="mt-4 text-base font-semibold">
          Módulo pendiente de su fase vertical
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          La ruta, la autorización y el espacio de navegación ya están
          definidos. Los formularios y datos se conectarán en la fase
          correspondiente sin utilizar registros simulados.
        </p>
      </section>
    </>
  );
}
