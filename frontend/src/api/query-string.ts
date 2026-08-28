export type QueryValue = boolean | number | string | null | undefined;
export type QueryParameters = object;

export function serializeQuery(parameters?: QueryParameters): string {
  if (!parameters) return '';

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters) as [
    string,
    QueryValue,
  ][]) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }

  const serialized = search.toString();
  return serialized ? `?${serialized}` : '';
}
