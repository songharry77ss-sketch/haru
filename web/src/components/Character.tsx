import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { Mood } from '../lib/api'
import { asset } from '../lib/store'
import { AccessoryLayer, type Pose, type Slot } from './Accessory'

const POSE_IMG: Record<Mood, { img: string; pose: Pose }> = {
  happy: { img: 'bunny_happy.webp', pose: 'hug' },
  excited: { img: 'bunny_happy.webp', pose: 'hug' },
  calm: { img: 'bunny_calm.webp', pose: 'stand' },
  sleepy: { img: 'bunny_calm.webp', pose: 'stand' },
  worried: { img: 'bunny_worried.webp', pose: 'stand' },
  hungry: { img: 'bunny_worried.webp', pose: 'stand' },
  hurt: { img: 'bunny_worried.webp', pose: 'stand' },
}

// Warm the image cache so mood swaps never flash.
if (typeof window !== 'undefined') {
  for (const n of ['bunny_happy.webp', 'bunny_calm.webp', 'bunny_worried.webp']) {
    const i = new Image()
    i.src = asset(n)
  }
}

export interface TouchSummary {
  strokes: number
  taps: number
  avgSpeed: number
  peakRate: number
  durationMs: number
}

export interface CharacterHandle {
  bounce: () => void
  shake: () => void
  hearts: (n?: number) => void
}

interface Particle {
  id: number
  x: number
  y: number
  kind: 'heart' | 'spark' | 'sweat'
}

interface Props {
  mood: Mood
  equipped: Partial<Record<Slot, string>>
  onTouch?: (s: TouchSummary) => void
  interactive?: boolean
}

let pid = 0

export const Character = forwardRef<CharacterHandle, Props>(function Character({ mood, equipped, onTouch, interactive = true }, ref) {
  const controls = useAnimationControls()
  const [particles, setParticles] = useState<Particle[]>([])
  const box = useRef<HTMLDivElement>(null)
  const { img, pose } = POSE_IMG[mood]

  // ----- touch gesture aggregation -----
  const g = useRef({
    down: false,
    sx: 0,
    sy: 0,
    lx: 0,
    ly: 0,
    lt: 0,
    moved: 0,
    sessionStart: 0,
    strokes: 0,
    taps: [] as number[],
    speeds: [] as number[],
    sinceHeart: 0,
    timer: 0 as number | undefined,
  })

  const spawn = (kind: Particle['kind'], x: number, y: number) => {
    const id = ++pid
    setParticles((p) => [...p.slice(-14), { id, x, y, kind }])
    window.setTimeout(() => setParticles((p) => p.filter((q) => q.id !== id)), 1200)
  }

  const bounce = () =>
    controls.start({ scaleY: [1, 0.9, 1.06, 0.98, 1], scaleX: [1, 1.08, 0.96, 1.01, 1], transition: { duration: 0.55 } })
  const shake = () => controls.start({ x: [0, -9, 9, -7, 7, -3, 0], rotate: [0, -3, 3, -2, 2, 0, 0], transition: { duration: 0.5 } })

  useImperativeHandle(ref, () => ({
    bounce,
    shake,
    hearts: (n = 4) => {
      for (let i = 0; i < n; i++)
        window.setTimeout(() => spawn('heart', 35 + Math.random() * 30, 30 + Math.random() * 20), i * 110)
    },
  }))

  const rel = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }

  const flush = () => {
    const s = g.current
    const now = performance.now()
    let peak = 0
    for (const t of s.taps) peak = Math.max(peak, s.taps.filter((u) => u >= t && u - t < 1000).length)
    const summary: TouchSummary = {
      strokes: s.strokes,
      taps: s.taps.length,
      avgSpeed: s.speeds.length ? Math.min(50, s.speeds.reduce((a, b) => a + b, 0) / s.speeds.length) : 0,
      peakRate: peak,
      durationMs: Math.min(120_000, Math.round(now - s.sessionStart)),
    }
    s.strokes = 0
    s.taps = []
    s.speeds = []
    s.sessionStart = 0
    if (summary.strokes + summary.taps > 0) onTouch?.(summary)
  }

  const onDown = (e: React.PointerEvent) => {
    if (!interactive) return
    const s = g.current
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    window.clearTimeout(s.timer)
    if (!s.sessionStart) s.sessionStart = performance.now()
    s.down = true
    s.sx = s.lx = e.clientX
    s.sy = s.ly = e.clientY
    s.lt = performance.now()
    s.moved = 0
  }
  const onMove = (e: React.PointerEvent) => {
    const s = g.current
    if (!s.down) return
    const now = performance.now()
    const d = Math.hypot(e.clientX - s.lx, e.clientY - s.ly)
    const dt = Math.max(1, now - s.lt)
    if (d > 1) s.speeds.push(d / dt)
    s.moved += d
    s.sinceHeart += d
    s.lx = e.clientX
    s.ly = e.clientY
    s.lt = now
    if (s.sinceHeart > 46 && d / dt < 1.6) {
      s.sinceHeart = 0
      const p = rel(e)
      spawn('heart', p.x, p.y - 6)
    }
  }
  const onUp = (e: React.PointerEvent) => {
    const s = g.current
    if (!s.down) return
    s.down = false
    const now = performance.now()
    if (s.moved > 28) {
      s.strokes++
      bounce()
    } else {
      s.taps.push(now)
      const recent = s.taps.filter((t) => now - t < 1000).length
      const p = rel(e)
      if (recent >= 5) {
        shake()
        spawn('sweat', p.x, p.y)
      } else {
        spawn('spark', p.x, p.y)
        controls.start({ scaleY: [1, 0.94, 1], transition: { duration: 0.25 } })
      }
    }
    s.timer = window.setTimeout(flush, 900)
  }

  return (
    <div className="char-box" ref={box}>
      <motion.div className="char-motion" animate={controls} style={{ originY: 1 }}>
        <div className={`char-idle ${mood}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={img}
              src={asset(img)}
              alt=""
              className="char-img"
              draggable={false}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            />
          </AnimatePresence>
          <AccessoryLayer equipped={equipped} pose={pose} />
          {mood === 'sleepy' && <div className="zzz" aria-hidden>z z Z</div>}
          {mood === 'hungry' && (
            <div className="thought" aria-hidden>
              <img src={asset('food_carrot.webp')} alt="" />
            </div>
          )}
          {mood === 'hurt' && <div className="pain" aria-hidden />}
          {mood === 'excited' && <div className="sparkles" aria-hidden>✦ ✧ ✦</div>}
        </div>
      </motion.div>
      <div
        className="char-hit"
        role="button"
        aria-label="쓰다듬기: 캐릭터를 부드럽게 문질러 주세요"
        tabIndex={interactive ? 0 : -1}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            bounce()
            onTouch?.({ strokes: 1, taps: 0, avgSpeed: 0.6, peakRate: 0, durationMs: 1200 })
          }
        }}
      />
      <div className="particles" aria-hidden>
        <AnimatePresence>
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className={`particle ${p.kind}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              initial={{ opacity: 0, y: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], y: -70, scale: [0.4, 1.1, 1, 0.9], x: (Math.random() - 0.5) * 40 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            >
              {p.kind === 'heart' ? '♥' : p.kind === 'spark' ? '✦' : '💦'}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
})
