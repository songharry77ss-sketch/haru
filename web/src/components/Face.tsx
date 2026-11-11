/**
 * The pet's face, drawn live on top of a blank-faced render.
 * Eyes, brows, mouth and little effects are separate parts, so one pose yields well over a hundred
 * expressions, and the face can blink, glance around, follow a finger and move its mouth while talking.
 */
import { useEffect, useState, type JSX } from 'react'

export type Rig = 'stand' | 'hug'
export type EyeKind =
  | 'dot'
  | 'big'
  | 'shine'
  | 'small'
  | 'happy'
  | 'calm'
  | 'sad'
  | 'line'
  | 'half'
  | 'gt'
  | 'heart'
  | 'star'
  | 'spiral'
  | 'teary'
export type BrowKind = 'none' | 'soft' | 'worried' | 'sad' | 'angry' | 'raised' | 'flat'
export type MouthKind =
  | 'w'
  | 'smile'
  | 'grin'
  | 'open'
  | 'laugh'
  | 'teeth'
  | 'o'
  | 'gasp'
  | 'tiny'
  | 'flat'
  | 'frown'
  | 'wavy'
  | 'pout'
  | 'tongue'
  | 'lick'
  | 'yawn'
  | 'chew'
  | 'smirk'
  | 'cry'
  | 'kiss'
export type Extra =
  | 'blush'
  | 'puff'
  | 'tearL'
  | 'tearR'
  | 'stream'
  | 'sweat'
  | 'gloom'
  | 'anger'
  | 'steam'
  | 'sparkle'
  | 'hearts'
  | 'zzz'
  | 'bubble'
  | 'question'
  | 'exclaim'
  | 'idea'
  | 'music'
  | 'crumbs'
  | 'drool'
  | 'thermo'
  | 'bandage'
  | 'dizzy'
  | 'sigh'
  | 'shock'

export interface FaceLook {
  eyes: EyeKind | [EyeKind, EyeKind]
  brows?: BrowKind | [BrowKind, BrowKind]
  mouth: MouthKind
  extras?: Extra[]
  /** Where the eyes point, each axis -1..1. */
  gaze?: [number, number]
}

/** Where the face sits on each pose, in the 330×520 box of the render. */
export const RIGS: Record<Rig, { img: string; cx: number; cy: number; rot: number; scale: number; mouth: [number, number] }> = {
  stand: { img: 'bunny_stand_base.webp', cx: 171.5, cy: 272.8, rot: 0, scale: 1, mouth: [0, 27.5] },
  hug: { img: 'bunny_hug_base.webp', cx: 163.5, cy: 282.5, rot: -6.5, scale: 1.05, mouth: [-3, 33] },
}

const EYE_DX = 46.4
const INK = '#4b2a22'
const INSIDE = '#7a2f2c'
const TONGUE = '#f59a9c'
const OPEN_EYES: ReadonlySet<EyeKind> = new Set(['dot', 'big', 'shine', 'small', 'teary', 'half'])
const TALK: MouthKind[] = ['o', 'open', 'tiny', 'open', 'w', 'o', 'smile']

const stroke = (w = 4.2) => ({ fill: 'none', stroke: INK, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const })

function Ball({ r, hi = 1 }: { r: number; hi?: number }) {
  return (
    <>
      <ellipse rx={r} ry={r * 1.04} fill="url(#haru-eye)" />
      <ellipse cx={-r * 0.32} cy={-r * 0.4} rx={r * 0.28 * hi} ry={r * 0.22 * hi} fill="#fff" opacity=".92" transform={`rotate(-24 ${-r * 0.32} ${-r * 0.4})`} />
      <circle cx={r * 0.34} cy={r * 0.42} r={r * 0.12} fill="#fff" opacity=".4" />
    </>
  )
}

function Eye({ kind, side, gx, gy }: { kind: EyeKind; side: -1 | 1; gx: number; gy: number }) {
  const look = `translate(${gx * 3.2} ${gy * 2.6})`
  switch (kind) {
    case 'dot':
      return (
        <g transform={look}>
          <Ball r={11.4} />
        </g>
      )
    case 'big':
      return (
        <g transform={look}>
          <Ball r={13.2} hi={1.15} />
        </g>
      )
    case 'shine':
      return (
        <g transform={look}>
          <Ball r={13.6} hi={1.5} />
          <circle cx={4.6} cy={-5.4} r={2} fill="#fff" opacity=".9" />
          <path d="M-1 6.5l1.1 2.4 2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4-2.4-1.1 2.4-1.1z" fill="#fff" opacity=".85" transform="scale(.55) translate(2 4)" />
        </g>
      )
    case 'small':
      return (
        <g transform={look}>
          <Ball r={6.6} />
        </g>
      )
    case 'teary':
      return (
        <g transform={look}>
          <Ball r={13} hi={1.5} />
          <path d="M-9.5 5.5q9.5 6.5 19 0q-1.5 7.5-9.5 7.5t-9.5-7.5z" fill="#bfe4ff" opacity=".8" />
          <circle cx={side * 7.5} cy={12.5} r={3.1} fill="#9fd6ff" stroke="#7cc0f2" strokeWidth=".8" />
        </g>
      )
    case 'half':
      return (
        <g transform={look}>
          <clipPath id={`haru-lid-${side}`}>
            <rect x={-16} y={-2.5} width={32} height={20} />
          </clipPath>
          <g clipPath={`url(#haru-lid-${side})`}>
            <Ball r={11.4} hi={0.6} />
          </g>
          <path d="M-12.5 -2.5h25" {...stroke(3.6)} />
        </g>
      )
    case 'happy':
      return <path d="M-11.5 4.5Q0 -11.5 11.5 4.5" {...stroke(4.8)} />
    case 'calm':
      return <path d="M-10.5 -1.5Q0 8 10.5 -1.5" {...stroke(4.4)} />
    case 'sad':
      return <path d={side < 0 ? 'M-10.5 2Q-1 8.5 10.5 -3' : 'M-10.5 -3Q1 8.5 10.5 2'} {...stroke(4.4)} />
    case 'line':
      return <path d="M-10.5 1h21" {...stroke(4.4)} />
    case 'gt':
      return <path d={side < 0 ? 'M-9 -7.5L7.5 0.5L-9 8' : 'M9 -7.5L-7.5 0.5L9 8'} {...stroke(4.6)} />
    case 'heart':
      return (
        <g transform="translate(0 1) scale(1.12)">
          <path d="M0 9.5C-14 0.5 -11 -10 -4.5 -10C-1.6 -10 0 -7.6 0 -6C0 -7.6 1.6 -10 4.5 -10C11 -10 14 0.5 0 9.5z" fill="#ff6f91" stroke="#e8507a" strokeWidth="1.2" />
          <ellipse cx={-5} cy={-5.5} rx={2.4} ry={1.6} fill="#fff" opacity=".75" transform="rotate(-30 -5 -5.5)" />
        </g>
      )
    case 'star':
      return (
        <g className="face-twinkle">
          <path d="M0 -13.5l3.9 8.1 8.9 1.2-6.5 6.2 1.6 8.8L0 6.5l-7.9 4.3 1.6-8.8-6.5-6.2 8.9-1.2z" fill="#ffcf4a" stroke="#eda52c" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx={-2.5} cy={-3} r={1.8} fill="#fff" opacity=".8" />
        </g>
      )
    case 'spiral':
      return (
        <g className="face-spin">
          <path d="M0 0c2.2-1.6 4.6 0.6 3.8 3.2c-1 3.4-6 3.6-8 0.4c-2.4-4 0.6-9.4 5.6-9.6c5.8-0.2 9.6 5.6 8 11c-1.4 4.6-6 7.4-10.6 6.6" {...stroke(3.2)} />
        </g>
      )
  }
}

function Brow({ kind, side }: { kind: BrowKind; side: -1 | 1 }) {
  if (kind === 'none') return null
  // Drawn for the eye on the viewer's right; mirrored for the other one. Inner end is at -x here.
  const d: Record<Exclude<BrowKind, 'none'>, string> = {
    soft: 'M-9 -21.5Q0 -25.5 9 -21.5',
    flat: 'M-9.5 -22h19',
    raised: 'M-10 -26Q0 -33 10 -26.5',
    worried: 'M-9.5 -26.5Q-1 -24.5 9.5 -19',
    sad: 'M-10 -28Q-2 -25 10 -18',
    angry: 'M-10 -17.5Q-1 -22 10 -26',
  }
  return <path d={d[kind]} transform={side < 0 ? 'scale(-1 1)' : undefined} {...stroke(3.4)} opacity=".88" />
}

function Mouth({ kind }: { kind: MouthKind }) {
  const open = (d: string, tongue?: JSX.Element) => (
    <>
      <path d={d} fill={INSIDE} stroke={INK} strokeWidth="3.2" strokeLinejoin="round" />
      {tongue}
    </>
  )
  switch (kind) {
    case 'w':
      return <path d="M-23 -4C-19 5.5 -7 8 0 0C7 8 19 5.5 23 -4" {...stroke()} />
    case 'smile':
      return <path d="M-14.5 -2.5Q0 11 14.5 -2.5" {...stroke()} />
    case 'grin':
      return <path d="M-25 -6Q0 19 25 -6" {...stroke(4.6)} />
    case 'smirk':
      return <path d="M-12 2.5Q3 9.5 15 -5.5" {...stroke()} />
    case 'tiny':
      return <path d="M-6.5 0.5Q0 6 6.5 0.5" {...stroke(4)} />
    case 'flat':
      return <path d="M-10.5 2.5h21" {...stroke()} />
    case 'frown':
      return <path d="M-13 7.5Q0 -5 13 7.5" {...stroke()} />
    case 'pout':
      return <path d="M-7 5.5Q0 -3 7 5.5" {...stroke(4.4)} />
    case 'wavy':
      return <path d="M-16 3q4-7 8 0t8 0t8 0t8 0" {...stroke(3.8)} />
    case 'kiss':
      return <ellipse cx={0} cy={3} rx={4} ry={4.8} fill={INSIDE} stroke={INK} strokeWidth="3" />
    case 'o':
      return <ellipse cx={0} cy={4} rx={6.2} ry={7.4} fill={INSIDE} stroke={INK} strokeWidth="3.2" />
    case 'gasp':
      return open('M0 -6C9 -6 11.5 2 11.5 8C11.5 16 6 20 0 20C-6 20 -11.5 16 -11.5 8C-11.5 2 -9 -6 0 -6z', <ellipse cx={0} cy={14.5} rx={5.6} ry={3.4} fill={TONGUE} />)
    case 'yawn':
      return open('M0 -8C11 -8 14 3 14 11C14 22 7 27 0 27C-7 27 -14 22 -14 11C-14 3 -11 -8 0 -8z', <ellipse cx={0} cy={20} rx={7.5} ry={4.6} fill={TONGUE} />)
    case 'open':
      return open('M-15.5 -3.5Q0 -0.5 15.5 -3.5Q14 17 0 17Q-14 17 -15.5 -3.5z', <path d="M-8 12.5Q0 7.5 8 12.5Q5 16.2 0 16.2Q-5 16.2 -8 12.5z" fill={TONGUE} />)
    case 'laugh':
      return open('M-22 -6Q0 -1 22 -6Q19.5 23 0 23Q-19.5 23 -22 -6z', <path d="M-11.5 17Q0 9.5 11.5 17Q7 22 0 22Q-7 22 -11.5 17z" fill={TONGUE} />)
    case 'teeth':
      return (
        <>
          <path d="M-22 -6Q0 -1 22 -6Q19.5 21 0 21Q-19.5 21 -22 -6z" fill={INSIDE} stroke={INK} strokeWidth="3.2" strokeLinejoin="round" />
          <path d="M-7.5 -3.4h15v7.2q0 1.6-1.6 1.6h-11.8q-1.6 0-1.6-1.6z" fill="#fffaf2" />
          <path d="M0 -3.2v8.4" stroke="#e7d9c9" strokeWidth="1.3" />
        </>
      )
    case 'cry':
      return open('M-14 9C-13 -5 -6 -7 0 -7C6 -7 13 -5 14 9Q0 3.5 -14 9z')
    case 'tongue':
      return (
        <>
          <path d="M-14.5 -2.5Q0 11 14.5 -2.5" {...stroke()} />
          <path d="M-1.5 4.2h11q0.5 10.5-5.5 10.5t-5.5-10.5z" fill={TONGUE} stroke="#e17f86" strokeWidth="1.6" strokeLinejoin="round" />
        </>
      )
    case 'lick':
      return (
        <>
          <path d="M-14.5 -2.5Q0 11 14.5 -2.5" {...stroke()} />
          <path d="M8 0.5q9-3.5 12 1.5q-3.5 7-12 4.5z" fill={TONGUE} stroke="#e17f86" strokeWidth="1.6" strokeLinejoin="round" />
        </>
      )
    case 'chew':
      return (
        <g className="face-chew">
          <path d="M-9.5 2Q-4.5 -3.5 0 2Q4.5 7.5 9.5 2" {...stroke()} />
        </g>
      )
  }
}

function Drop({ x, y, s = 1, tone = '#9fd6ff' }: { x: number; y: number; s?: number; tone?: string }) {
  return (
    <path
      d="M0 -8C4 -2 6 1 6 4.5A6 6 0 0 1 -6 4.5C-6 1 -4 -2 0 -8z"
      transform={`translate(${x} ${y}) scale(${s})`}
      fill={tone}
      stroke="#74bdf0"
      strokeWidth="1"
    />
  )
}

const heart = (x: number, y: number, s: number, delay: number) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} key={`h${x}`}>
    <path className="face-float" style={{ animationDelay: `${delay}s` }} d="M0 8C-12 0 -9.5 -8.5 -4 -8.5C-1.4 -8.5 0 -6.4 0 -5C0 -6.4 1.4 -8.5 4 -8.5C9.5 -8.5 12 0 0 8z" fill="#ff7f9c" />
  </g>
)
const sparkle = (x: number, y: number, s: number, delay: number) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} key={`s${x}${y}`}>
    <path className="face-twinkle" style={{ animationDelay: `${delay}s` }} d="M0 -10l2.6 7.4 7.4 2.6-7.4 2.6L0 10l-2.6-7.4L-10 0l7.4-2.6z" fill="#ffd866" />
  </g>
)

function ExtraPart({ kind, mouthY }: { kind: Extra; mouthY: number }) {
  switch (kind) {
    case 'blush':
      return (
        <g opacity=".5">
          <ellipse cx={-66} cy={24} rx={19} ry={12.5} fill="#ff7f93" />
          <ellipse cx={66} cy={24} rx={19} ry={12.5} fill="#ff7f93" />
        </g>
      )
    case 'puff':
      return (
        <g>
          <ellipse cx={-64} cy={25} rx={22} ry={16} fill="#f6a48f" opacity=".42" />
          <ellipse cx={64} cy={25} rx={22} ry={16} fill="#f6a48f" opacity=".42" />
          <path d="M-84 18q-7 8 0 17M84 18q7 8 0 17" {...stroke(2.6)} opacity=".45" />
        </g>
      )
    case 'tearL':
      return <Drop x={-EYE_DX - 3} y={24} />
    case 'tearR':
      return <Drop x={EYE_DX + 3} y={24} />
    case 'stream':
      return (
        <g className="face-stream">
          <path d={`M${-EYE_DX} 8q-5 20 -2 42`} fill="none" stroke="#9fd6ff" strokeWidth="6.5" strokeLinecap="round" opacity=".85" />
          <path d={`M${EYE_DX} 8q5 20 2 42`} fill="none" stroke="#9fd6ff" strokeWidth="6.5" strokeLinecap="round" opacity=".85" />
          <Drop x={-EYE_DX - 3} y={58} s={0.8} />
          <Drop x={EYE_DX + 3} y={58} s={0.8} />
        </g>
      )
    case 'sweat':
      return (
        <g className="face-slide">
          <Drop x={78} y={-34} s={1.15} tone="#bfe4ff" />
        </g>
      )
    case 'gloom':
      return (
        <g stroke="#7c8fb5" strokeWidth="3" strokeLinecap="round" opacity=".55">
          <path d="M40 -62v22M52 -58v26M64 -54v20M76 -48v14" />
        </g>
      )
    case 'anger':
      return (
        <g transform="translate(72 -52)" className="face-pulse">
          <path d="M-9 -3q6 0 6 -6M3 -9q0 6 6 6M9 3q-6 0 -6 6M-3 9q0 -6 -6 -6" fill="none" stroke="#f0575f" strokeWidth="3.6" strokeLinecap="round" />
        </g>
      )
    case 'steam':
      return (
        <g className="face-puff" fill="#fff" opacity=".85">
          <circle cx={-92} cy={2} r={8} />
          <circle cx={-103} cy={-4} r={6} />
          <circle cx={92} cy={2} r={8} />
          <circle cx={103} cy={-4} r={6} />
        </g>
      )
    case 'sparkle':
      return (
        <>
          {sparkle(-88, -44, 1, 0)}
          {sparkle(92, -30, 0.75, 0.5)}
          {sparkle(80, -70, 0.55, 0.9)}
        </>
      )
    case 'hearts':
      return (
        <>
          {heart(-86, -48, 1, 0)}
          {heart(90, -40, 0.8, 0.6)}
          {heart(70, -78, 0.6, 1.1)}
        </>
      )
    case 'zzz':
      return (
        <g className="face-zzz" fill="#8d9ccb" fontWeight="800" fontFamily="inherit">
          <text x={66} y={-52} fontSize="17">z</text>
          <text x={80} y={-68} fontSize="22">z</text>
          <text x={98} y={-88} fontSize="28">Z</text>
        </g>
      )
    case 'bubble':
      return (
        <g transform="translate(13 16)">
          <circle className="face-bubble" r={10} fill="#cfeaff" fillOpacity=".7" stroke="#9fd0f5" strokeWidth="1.4" />
        </g>
      )
    case 'question':
      return (
        <text className="face-pop" x={78} y={-58} fontSize="34" fontWeight="800" fill="#7b8fd6" fontFamily="inherit">
          ?
        </text>
      )
    case 'exclaim':
      return (
        <text className="face-pop" x={82} y={-58} fontSize="34" fontWeight="800" fill="#f0795f" fontFamily="inherit">
          !
        </text>
      )
    case 'idea':
      return (
        <g transform="translate(84 -74)" className="face-pop">
          <circle r={13} fill="#ffe27a" stroke="#f0b93a" strokeWidth="2" />
          <rect x={-5} y={12} width={10} height={6} rx={2} fill="#c9a35a" />
          <path d="M0 -24v-7M-17 -17l-5-5M17 -17l5-5" stroke="#f0b93a" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'music':
      return (
        <g className="face-float" fill="#c08be0">
          <text x={76} y={-50} fontSize="26" fontWeight="700">♪</text>
          <text x={-98} y={-36} fontSize="20" fontWeight="700">♫</text>
        </g>
      )
    case 'crumbs':
      return (
        <g fill="#e8964a">
          <circle cx={-17} cy={mouthY + 6} r={2.2} />
          <circle cx={19} cy={mouthY + 9} r={1.8} />
          <circle cx={12} cy={mouthY + 15} r={1.5} />
        </g>
      )
    case 'drool':
      return (
        <g className="face-slide">
          <Drop x={13} y={mouthY + 17} s={0.75} tone="#d7efff" />
        </g>
      )
    case 'thermo':
      return (
        <g transform={`translate(6 ${mouthY + 2}) rotate(-16)`}>
          <rect x={0} y={-3} width={40} height={6} rx={3} fill="#fff" stroke="#b9c3cf" strokeWidth="1.4" />
          <rect x={3} y={-1.2} width={20} height={2.4} rx={1.2} fill="#f0575f" />
          <circle cx={42} cy={0} r={4.6} fill="#f0575f" stroke="#c9434a" strokeWidth="1" />
        </g>
      )
    case 'bandage':
      return (
        <g transform="translate(-34 -42) rotate(-18)">
          <rect x={-15} y={-5.5} width={30} height={11} rx={5.5} fill="#f6d9b4" stroke="#dcb88a" strokeWidth="1.2" />
          <rect x={-5} y={-5.5} width={10} height={11} fill="#fbeedb" />
        </g>
      )
    case 'dizzy':
      return (
        <g className="face-orbit">
          <path d="M-24 -84l2.4 5.4 5.6 0.6-4.2 3.8 1.2 5.6-5-2.9-5 2.9 1.2-5.6-4.2-3.8 5.6-0.6z" fill="#ffd866" />
          <path d="M26 -90l2 4.4 4.6 0.5-3.4 3.1 1 4.6-4.2-2.4-4.2 2.4 1-4.6-3.4-3.1 4.6-0.5z" fill="#ffe7a0" />
        </g>
      )
    case 'sigh':
      return (
        <g className="face-puff" fill="#fff" opacity=".8">
          <ellipse cx={30} cy={mouthY + 8} rx={9} ry={6} />
          <ellipse cx={44} cy={mouthY + 4} rx={6} ry={4} />
        </g>
      )
    case 'shock':
      return (
        <g stroke="#f0b93a" strokeWidth="3.4" strokeLinecap="round" className="face-pop">
          <path d="M-98 -44l-12 -8M-104 -20h-14M98 -44l12 -8M104 -20h14" />
        </g>
      )
  }
}

interface Props {
  rig: Rig
  look: FaceLook
  /** Eyes pointed at something specific (a finger); overrides the look's own gaze. */
  gaze?: [number, number] | null
  talking?: boolean
  /** Stops blinking, for previews in a grid. */
  still?: boolean
}

export function Face({ rig, look, gaze, talking, still }: Props) {
  const r = RIGS[rig]
  const [shut, setShut] = useState(false)
  const [talkStep, setTalkStep] = useState(0)
  const pair = <T,>(v: T | [T, T]): [T, T] => (Array.isArray(v) ? v : [v, v])
  const [eyeL, eyeR] = pair(look.eyes)
  const [browL, browR] = pair(look.brows ?? 'none')
  const canBlink = !still && (OPEN_EYES.has(eyeL) || OPEN_EYES.has(eyeR))

  // Blink every few seconds, now and then twice in a row, like a living thing does.
  useEffect(() => {
    setShut(false)
    if (!canBlink) return
    let alive = true
    let timer = 0
    const blink = (again: boolean) => {
      if (!alive) return
      setShut(true)
      timer = window.setTimeout(() => {
        setShut(false)
        timer = window.setTimeout(() => (again ? blink(false) : wait()), again ? 150 : 0)
      }, 120)
    }
    const wait = () => {
      timer = window.setTimeout(() => blink(Math.random() < 0.22), 2200 + Math.random() * 3600)
    }
    wait()
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [canBlink])

  useEffect(() => {
    if (!talking) return
    const t = window.setInterval(() => setTalkStep((s) => s + 1), 135)
    return () => window.clearInterval(t)
  }, [talking])

  const [gx, gy] = gaze ?? look.gaze ?? [0, 0]
  const eye = (kind: EyeKind, side: -1 | 1) => (
    <g transform={`translate(${side * EYE_DX} 0)`}>
      <Eye kind={shut && OPEN_EYES.has(kind) ? 'line' : kind} side={side} gx={gx} gy={gy} />
    </g>
  )
  const mouth: MouthKind = talking ? TALK[talkStep % TALK.length] : look.mouth

  return (
    <svg className="char-face" viewBox="0 0 330 520" aria-hidden>
      <defs>
        <radialGradient id="haru-eye" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#6a3d31" />
          <stop offset=".55" stopColor="#4b2a22" />
          <stop offset="1" stopColor="#3a1f19" />
        </radialGradient>
      </defs>
      <g transform={`translate(${r.cx} ${r.cy}) rotate(${r.rot}) scale(${r.scale})`}>
        {look.extras?.filter((e) => e === 'blush' || e === 'puff').map((e) => <ExtraPart key={e} kind={e} mouthY={r.mouth[1]} />)}
        {eye(eyeL, -1)}
        {eye(eyeR, 1)}
        <g transform={`translate(${-EYE_DX} 0)`}>
          <Brow kind={browL} side={-1} />
        </g>
        <g transform={`translate(${EYE_DX} 0)`}>
          <Brow kind={browR} side={1} />
        </g>
        <g transform={`translate(${r.mouth[0]} ${r.mouth[1]})`}>
          <Mouth kind={mouth} />
        </g>
        {look.extras?.filter((e) => e !== 'blush' && e !== 'puff').map((e) => <ExtraPart key={e} kind={e} mouthY={r.mouth[1]} />)}
      </g>
    </svg>
  )
}
