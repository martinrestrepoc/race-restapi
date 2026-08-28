import type { ReactNode } from 'react';

interface TableColumn<Row> {
  align?: 'left' | 'right';
  header: string;
  key: string;
  render: (row: Row) => ReactNode;
}

interface ResponsiveTableProps<Row> {
  caption: string;
  columns: TableColumn<Row>[];
  getRowKey: (row: Row) => string;
  rows: Row[];
}

export function ResponsiveTable<Row>({
  caption,
  columns,
  getRowKey,
  rows,
}: ResponsiveTableProps<Row>) {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        <p className="sr-only">{caption}</p>
        {rows.map((row) => (
          <article
            className="rounded-lg border border-border bg-background/55 p-4"
            key={getRowKey(row)}
          >
            <dl className="space-y-3">
              {columns.map((column) => (
                <div
                  className="flex items-start justify-between gap-4"
                  key={column.key}
                >
                  <dt className="text-xs text-muted-foreground">
                    {column.header}
                  </dt>
                  <dd className="min-w-0 break-words text-right text-sm">
                    {column.render(row)}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <div
        className="hidden overflow-x-auto overscroll-x-contain sm:block"
        role="region"
        aria-label={`${caption}. Desplaza horizontalmente si es necesario.`}
        tabIndex={0}
      >
        <table className="w-full min-w-xl text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              {columns.map((column) => (
                <th
                  className={cxAlignment(column.align, 'px-4 py-3 font-medium')}
                  key={column.key}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                className="border-b border-border last:border-0 hover:bg-secondary/35"
                key={getRowKey(row)}
              >
                {columns.map((column) => (
                  <td
                    className={cxAlignment(
                      column.align,
                      'max-w-sm break-words px-4 py-3',
                    )}
                    key={column.key}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function cxAlignment(
  align: TableColumn<unknown>['align'],
  classes: string,
): string {
  return `${classes} ${align === 'right' ? 'text-right' : 'text-left'}`;
}
