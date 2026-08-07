const SINGAPORE_TZ = 'Asia/Singapore';

export function formatSGTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: SINGAPORE_TZ,
  });
}

export function formatSGDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: SINGAPORE_TZ,
  });
}
