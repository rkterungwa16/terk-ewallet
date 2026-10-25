export const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
});

export const signedNairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  signDisplay: 'always',
});

export const dateFormatter = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const wholeNairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export const longDateFormatter = new Intl.DateTimeFormat('en-NG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function initials(name: string): string {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
