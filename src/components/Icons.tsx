import type { ReactNode } from 'react'

export type IconName =
  | 'hint'
  | 'shuffle'
  | 'undo'
  | 'pause'
  | 'play'
  | 'sun'
  | 'moon'
  | 'close'
  | 'restart'
  | 'alert'

const PATHS: Record<IconName, ReactNode> = {
  hint: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3 7h3c2 0 3.300 1 4.300 2.700l3.400 4.600C14.700 16 16 17 18 17h3" />
      <path d="M3 17h3c1.400 0 2.400-.500 3.200-1.300M14.800 8.300C15.600 7.500 16.600 7 18 7h3" />
      <path d="m18 4 3 3-3 3M18 14l3 3-3 3" />
    </>
  ),
  undo: (
    <>
      <path d="M8 5 4 9l4 4" />
      <path d="M4 9h9.500a5.500 5.500 0 0 1 0 11H9" />
    </>
  ),
  pause: <path d="M8.500 5v14M15.500 5v14" />,
  play: <path d="M7 4.500v15l12-7.500-12-7.500Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.500M12 19.500V22M2 12h2.500M19.500 12H22M5 5l1.700 1.700M17.300 17.300 19 19M5 19l1.700-1.700M17.300 6.700 19 5" />
    </>
  ),
  moon: <path d="M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500Z" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  restart: (
    <>
      <path d="M4 12a8 8 0 1 0 2.600-5.900" />
      <path d="M4 4v4.500h4.500" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 2.800 19.500h18.400L12 4Z" />
      <path d="M12 10v4.500M12 17.200v.100" />
    </>
  ),
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
