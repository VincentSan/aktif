function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isOverdue(dateStr: string | null | undefined, now = new Date()): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  return date < now;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return toDateString(date);
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function today(): string {
  return toDateString(new Date());
}
