/** Hand-drawn SVG outfits layered on top of the 3D character renders. */
import type { JSX } from 'react'

export type Slot = 'hat' | 'face' | 'neck'

interface Def {
  slot: Slot
  /** width as a fraction of the character box */
  w: number
  /** vertical nudge relative to the anchor, as a fraction of the box height */
  dy?: number
  dx?: number
  rotate?: number
  svg: JSX.Element
}

export const ACCESSORIES: Record<string, Def> = {
  ribbon: {
    slot: 'hat',
    w: 0.26,
    dx: 0.15,
    dy: -0.015,
    rotate: 14,
    svg: (
      <svg viewBox="0 0 100 64">
        <defs>
          <linearGradient id="rb" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ff9fb0" />
            <stop offset="1" stopColor="#ec6f86" />
          </linearGradient>
        </defs>
        <path d="M50 32C36 8 8 4 6 22c-2 16 22 26 44 10z" fill="url(#rb)" />
        <path d="M50 32C64 8 92 4 94 22c2 16-22 26-44 10z" fill="url(#rb)" />
        <path d="M44 36l-14 24 12-2 6 6 4-26zM56 36l14 24-12-2-6 6-4-26z" fill="#e45f78" />
        <ellipse cx="50" cy="32" rx="9" ry="10" fill="#f7879b" />
        <path d="M18 18c6-6 16-6 22 2" stroke="#fff" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  straw_hat: {
    slot: 'hat',
    w: 0.78,
    dy: -0.055,
    svg: (
      <svg viewBox="0 0 200 90">
        <ellipse cx="100" cy="66" rx="96" ry="20" fill="#e7c27c" />
        <ellipse cx="100" cy="62" rx="92" ry="16" fill="#f1d28f" />
        <path d="M52 62c0-32 20-52 48-52s48 20 48 52z" fill="#efcb85" />
        <path d="M54 52h92c1 4 2 8 2 10H52c0-2 1-6 2-10z" fill="#ee7d76" />
        <path d="M70 26c10-8 24-11 36-9" stroke="#fff" strokeOpacity=".5" strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle cx="140" cy="56" r="9" fill="#fff6a8" />
        <circle cx="140" cy="56" r="4" fill="#f3b45b" />
      </svg>
    ),
  },
  beret: {
    slot: 'hat',
    w: 0.6,
    dy: -0.035,
    rotate: -10,
    svg: (
      <svg viewBox="0 0 160 80">
        <path d="M12 54C8 26 50 8 90 10c40 2 64 22 58 40-4 12-30 18-70 18S14 66 12 54z" fill="#c4473f" />
        <path d="M16 52c18 8 98 10 128 0" stroke="#9e322c" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M86 10c2-6 6-8 10-6" stroke="#9e322c" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M40 26c14-8 34-10 50-8" stroke="#fff" strokeOpacity=".35" strokeWidth="6" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  flower_crown: {
    slot: 'hat',
    w: 0.7,
    dy: -0.01,
    svg: (
      <svg viewBox="0 0 200 60">
        <path d="M8 42c40 18 144 18 184 0" stroke="#79b26a" strokeWidth="7" strokeLinecap="round" fill="none" />
        {[
          [22, 40, '#ffb3c1'],
          [52, 48, '#fff2a8'],
          [84, 52, '#ffc7a6'],
          [116, 52, '#ffb3c1'],
          [148, 48, '#d9c5ff'],
          [178, 40, '#fff2a8'],
        ].map(([x, y, c], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-9" rx="7" ry="9" fill={c as string} transform={`rotate(${a})`} />
            ))}
            <circle r="5" fill="#f3b45b" />
          </g>
        ))}
        <path d="M36 50l-8 8M100 56l2 9M164 50l8 8" stroke="#79b26a" strokeWidth="5" strokeLinecap="round" />
      </svg>
    ),
  },
  crown: {
    slot: 'hat',
    w: 0.42,
    dy: -0.06,
    svg: (
      <svg viewBox="0 0 120 80">
        <defs>
          <linearGradient id="cr" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffe08a" />
            <stop offset="1" stopColor="#f1b13c" />
          </linearGradient>
        </defs>
        <path d="M10 70L4 18l30 24L60 6l26 36 30-24-6 52z" fill="url(#cr)" stroke="#d99a26" strokeWidth="3" strokeLinejoin="round" />
        <rect x="10" y="62" width="100" height="12" rx="4" fill="#f1b13c" />
        <circle cx="60" cy="44" r="7" fill="#ee7d76" />
        <circle cx="32" cy="52" r="5" fill="#8db7e6" />
        <circle cx="88" cy="52" r="5" fill="#7cc4a4" />
      </svg>
    ),
  },
  round_glasses: {
    slot: 'face',
    w: 0.62,
    dy: 0,
    svg: (
      <svg viewBox="0 0 160 60">
        <circle cx="42" cy="30" r="24" fill="#fff" fillOpacity=".25" stroke="#5a3b2b" strokeWidth="6" />
        <circle cx="118" cy="30" r="24" fill="#fff" fillOpacity=".25" stroke="#5a3b2b" strokeWidth="6" />
        <path d="M66 28c8-6 20-6 28 0" stroke="#5a3b2b" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M30 20c4-4 10-5 14-4M106 20c4-4 10-5 14-4" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  },
  star_glasses: {
    slot: 'face',
    w: 0.7,
    dy: -0.005,
    svg: (
      <svg viewBox="0 0 180 70">
        {[45, 135].map((cx) => (
          <path
            key={cx}
            transform={`translate(${cx} 36)`}
            d="M0-30l8.8 18.4 20 2.6-14.6 14 3.8 20L0 15.2-18 25l3.8-20L-28.8-9l20-2.6z"
            fill="#ff8fb1"
            stroke="#e45f8e"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        ))}
        <path d="M74 30h32" stroke="#e45f8e" strokeWidth="6" strokeLinecap="round" />
        <path d="M34 22l8-6M124 22l8-6" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  },
  red_scarf: {
    slot: 'neck',
    w: 0.66,
    dy: 0.005,
    svg: (
      <svg viewBox="0 0 180 90">
        <path d="M14 22c40 18 112 18 152 0 6 10 6 20-2 28-44 16-106 16-148 0-8-8-8-18-2-28z" fill="#e05252" />
        <path d="M120 40c6 18 8 34 4 46l-24-4c4-12 4-26 0-38z" fill="#c94141" />
        <path d="M24 32c36 12 96 12 132 0" stroke="#fff" strokeOpacity=".7" strokeWidth="5" strokeDasharray="2 12" strokeLinecap="round" fill="none" />
        <path d="M104 80l4 8M112 82l2 8M120 84l0 6" stroke="#c94141" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  },
  bow_tie: {
    slot: 'neck',
    w: 0.3,
    dy: 0.02,
    svg: (
      <svg viewBox="0 0 100 56">
        <path d="M50 28L8 6c-6 8-6 36 0 44z" fill="#3c5aa6" />
        <path d="M50 28L92 6c6 8 6 36 0 44z" fill="#3c5aa6" />
        <rect x="40" y="18" width="20" height="20" rx="6" fill="#2d4486" />
        <circle cx="22" cy="20" r="3" fill="#fff" fillOpacity=".7" />
        <circle cx="78" cy="36" r="3" fill="#fff" fillOpacity=".7" />
      </svg>
    ),
  },
  bell: {
    slot: 'neck',
    w: 0.5,
    dy: 0.01,
    svg: (
      <svg viewBox="0 0 140 80">
        <path d="M8 14c40 16 84 16 124 0" stroke="#ee7d76" strokeWidth="9" strokeLinecap="round" fill="none" />
        <circle cx="70" cy="44" r="20" fill="#f6c453" stroke="#d99a26" strokeWidth="3" />
        <path d="M54 44h32" stroke="#d99a26" strokeWidth="3" />
        <circle cx="70" cy="52" r="4" fill="#8a5a3e" />
        <path d="M60 36c3-4 7-6 12-6" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  },
}

/** Where each slot sits on a given pose, in fractions of the character box. */
export type Pose = 'stand' | 'hug'
export const ANCHORS: Record<Pose, Record<Slot, { x: number; y: number; rotate?: number }>> = {
  stand: { hat: { x: 0.515, y: 0.405 }, face: { x: 0.515, y: 0.535 }, neck: { x: 0.505, y: 0.69 } },
  hug: { hat: { x: 0.52, y: 0.33, rotate: -6 }, face: { x: 0.53, y: 0.465, rotate: -6 }, neck: { x: 0.52, y: 0.635, rotate: -4 } },
}

export function AccessoryLayer({ equipped, pose }: { equipped: Partial<Record<Slot, string>>; pose: Pose }) {
  const order: Slot[] = ['neck', 'face', 'hat']
  return (
    <>
      {order.map((slot) => {
        const id = equipped[slot]
        const def = id ? ACCESSORIES[id] : undefined
        if (!def) return null
        const a = ANCHORS[pose][slot]
        const rot = (a.rotate ?? 0) + (def.rotate ?? 0)
        return (
          <div
            key={slot}
            className="acc"
            style={{
              left: `${(a.x + (def.dx ?? 0)) * 100}%`,
              top: `${(a.y + (def.dy ?? 0)) * 100}%`,
              width: `${def.w * 100}%`,
              transform: `translate(-50%, ${slot === 'hat' ? -100 : slot === 'face' ? -50 : -35}%) rotate(${rot}deg)`,
              transformOrigin: slot === 'hat' ? '50% 100%' : '50% 50%',
            }}
          >
            {def.svg}
          </div>
        )
      })}
    </>
  )
}

export function AccessoryIcon({ id, size = 56 }: { id: string; size?: number }) {
  const def = ACCESSORIES[id]
  if (!def) return null
  return <div style={{ width: size, display: 'grid', placeItems: 'center' }}>{def.svg}</div>
}
