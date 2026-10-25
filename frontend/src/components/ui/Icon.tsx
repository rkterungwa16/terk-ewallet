import type { ReactNode } from 'react';

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

// Line icons on a 24px grid, drawn inline so the app needs no icon library.
const PATHS = {
  wallet: (
    <>
      <path {...S} d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v15H6.5A2.5 2.5 0 0 1 4 16.5z" />
      <path {...S} d="M4 7h13.5A2.5 2.5 0 0 1 20 9.5V13h-5a2 2 0 0 1 0-4h5" />
      <path {...S} strokeWidth={2.5} d="M15 11h.01" />
    </>
  ),
  search: (
    <>
      <circle {...S} cx="10.8" cy="10.8" r="6.8" />
      <path {...S} d="m16 16 4.3 4.3" />
    </>
  ),
  chevron: <path {...S} d="m7 10 5 5 5-5" />,
  dashboard: (
    <>
      <rect {...S} x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect {...S} x="13.5" y="3.5" width="7" height="4" rx="1.5" />
      <rect {...S} x="13.5" y="10.5" width="7" height="10" rx="1.5" />
      <rect {...S} x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  menu: <path {...S} d="M4 7h16M4 12h16M4 17h16" />,
  close: <path {...S} d="M6 6l12 12M18 6 6 18" />,
  transfer: <path {...S} d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4" />,
  bank: (
    <>
      <path {...S} d="M3 9.5 12 4l9 5.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18" />
    </>
  ),
  receipt: (
    <>
      <path {...S} d="M6 3.5 8 5l4-1.5L16 5l2-1.5V21l-2-1.5-4 1.5-4-1.5L6 21z" />
      <path {...S} d="M9 9h6M9 13h6M9 17h3" />
    </>
  ),
  arrowUp: <path {...S} d="M7 17 17 7M7 7h10v10" />,
  downLeft: <path {...S} d="M17 7 7 17M16 17H7V8" />,
  withdraw: <path {...S} d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14" />,
  reverse: <path {...S} d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  plus: <path {...S} d="M12 5v14M5 12h14" />,
  trend: <path {...S} d="m3 16 6-6 4 4 8-9M15 5h6v6" />,
  logout: <path {...S} d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />,
  download: <path {...S} d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14" />,
  check: <path {...S} d="m5 12.5 4.5 4.5L19 7.5" />,
  clock: (
    <>
      <circle {...S} cx="12" cy="12" r="8.5" />
      <path {...S} d="M12 7.5V12l3 2" />
    </>
  ),
  alert: (
    <>
      <circle {...S} cx="12" cy="12" r="8.5" />
      <path {...S} d="M12 7.5v5M12 16h.01" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={['icon', className].filter(Boolean).join(' ')}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
