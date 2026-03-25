export function col(value: string | null | undefined, width: number): string {
  const str = value ?? '—';
  if (str.length > width) return str.slice(0, width - 1) + '…';
  return str.padEnd(width);
}
