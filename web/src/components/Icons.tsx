import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }
const base = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true })

export const Coin = ({ size = 20, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="10" fill="#1f2b4d" />
    <path d="M12 6.2l1.45 3.9 3.95 1.9-3.95 1.9L12 17.8l-1.45-3.9L6.6 12l3.95-1.9z" fill="#fff" />
  </svg>
)

export const Gem = ({ size = 20, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6.5 4h11l4 5.2L12 20.5 2.5 9.2z" fill="#1f2b4d" />
    <path d="M2.5 9.2h19M9 4l3 16.5L15 4M6.5 4l2.5 5.2M17.5 4L15 9.2" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
)

export const Gear = ({ size = 24, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path
      d="M10.3 2.8h3.4l.5 2.4c.6.2 1.1.5 1.6.9l2.3-.8 1.7 2.9-1.8 1.6c.1.6.1 1.2 0 1.8l1.8 1.6-1.7 2.9-2.3-.8c-.5.4-1 .7-1.6.9l-.5 2.4h-3.4l-.5-2.4c-.6-.2-1.1-.5-1.6-.9l-2.3.8-1.7-2.9 1.8-1.6a5.6 5.6 0 010-1.8L4.2 8.2l1.7-2.9 2.3.8c.5-.4 1-.7 1.6-.9z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.7" />
  </svg>
)

export const Store = ({ size = 24, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 9.5V19a1 1 0 001 1h14a1 1 0 001-1V9.5" fill="currentColor" opacity=".9" />
    <path d="M3 6.5L4.6 3.8h14.8L21 6.5v1.2a2.6 2.6 0 01-4.5 1.8 2.6 2.6 0 01-4.5 0 2.6 2.6 0 01-4.5 0A2.6 2.6 0 013 7.7z" fill="currentColor" />
    <rect x="9.5" y="13.5" width="5" height="6.5" rx="1" fill="#fff" opacity=".9" />
  </svg>
)

export const Shirt = ({ size = 24, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M8.5 3.5L3 6.6l2 4.4 2-1V20.5h10V10l2 1 2-4.4-5.5-3.1c-.5 1.6-1.9 2.6-3.5 2.6s-3-1-3.5-2.6z" fill="currentColor" />
  </svg>
)

export const Carrot = ({ size = 24, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M15.8 8.2c1.6 1.6 1.4 4.2-.4 5.8L5.2 21.3c-.7.5-1.6-.4-1.1-1.1L11.4 10c1.6-1.8 4.2-2 5.8-.4" fill="currentColor" transform="translate(-1 0)" />
    <path d="M15 8.6c.4-2 1.6-4.2 3.7-5.1-.3 1.6-.2 2.8.6 3.6.8.8 2 .9 3.6.6-.9 2.1-3.1 3.3-5.1 3.7" fill="currentColor" opacity=".75" />
  </svg>
)

export const Paw = ({ size = 24, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 12.2c2.9 0 6 2.9 6 5.6 0 1.8-1.5 2.4-3 2.4-1.1 0-2-.6-3-.6s-1.9.6-3 .6c-1.5 0-3-.6-3-2.4 0-2.7 3.1-5.6 6-5.6z" fill="currentColor" />
    <ellipse cx="6" cy="10" rx="1.9" ry="2.4" fill="currentColor" />
    <ellipse cx="18" cy="10" rx="1.9" ry="2.4" fill="currentColor" />
    <ellipse cx="9.3" cy="5.8" rx="1.9" ry="2.5" fill="currentColor" />
    <ellipse cx="14.7" cy="5.8" rx="1.9" ry="2.5" fill="currentColor" />
  </svg>
)

export const Chart = ({ size = 24, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3.5" y="11" width="4.2" height="9" rx="1.2" fill="currentColor" />
    <rect x="9.9" y="4" width="4.2" height="16" rx="1.2" fill="currentColor" />
    <rect x="16.3" y="8" width="4.2" height="12" rx="1.2" fill="currentColor" />
  </svg>
)

export const Back = ({ size = 24, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M15 4.5L7.5 12l7.5 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Chevron = ({ size = 20, dir = 'right', ...p }: P & { dir?: 'left' | 'right' }) => (
  <svg {...base(size)} {...p} style={{ transform: dir === 'left' ? 'scaleX(-1)' : undefined }}>
    <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Send = ({ size = 20, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20.5 3.5L3.5 10.3l6.6 2.6 2.6 6.6z" fill="currentColor" />
    <path d="M20.5 3.5l-10.4 9.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

export const Search = ({ size = 20, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const Bolt = ({ size = 18, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M13.5 2.5L4.5 13.5h6l-1 8 9-11h-6z" fill="currentColor" />
  </svg>
)

export const Close = ({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)

export const Check = ({ size = 18, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Lock = ({ size = 18, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
    <path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="currentColor" strokeWidth="2" />
  </svg>
)

export const Heart = ({ size = 18, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 20.5s-8.5-5.1-8.5-11A4.6 4.6 0 0112 6.8a4.6 4.6 0 018.5 2.7c0 5.9-8.5 11-8.5 11z" fill="currentColor" />
  </svg>
)

export const Phone = ({ size = 18, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path
      d="M6.6 3.5h2.6l1.5 4-2 1.4a11 11 0 006.4 6.4l1.4-2 4 1.5v2.6a2 2 0 01-2.2 2A16.5 16.5 0 014.6 5.7a2 2 0 012-2.2z"
      fill="currentColor"
    />
  </svg>
)

export const Pencil = ({ size = 18, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 013 3L8 18.5z" fill="currentColor" />
  </svg>
)

export const Trash = ({ size = 16, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Sofa =({ size = 22, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M5 11V8.5A3.5 3.5 0 018.5 5h7A3.5 3.5 0 0119 8.5V11" stroke="currentColor" strokeWidth="2" />
    <path d="M3 12.5a2 2 0 014 0V14h10v-1.5a2 2 0 014 0V18a1 1 0 01-1 1H4a1 1 0 01-1-1z" fill="currentColor" />
  </svg>
)

export const Sparkle = ({ size = 18, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 2.5l2.2 7.3 7.3 2.2-7.3 2.2L12 21.5l-2.2-7.3L2.5 12l7.3-2.2z" fill="currentColor" />
  </svg>
)

export const Book = ({ size = 18, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z" fill="currentColor" />
    <path d="M4 20.5A2.5 2.5 0 006.5 23H20v-5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
)
