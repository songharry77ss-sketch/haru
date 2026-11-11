import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Mood } from '../lib/api'
import { IDLE, LOOKS, moment, pick, type Look, type LookId } from '../lib/expressions'
import { asset } from '../lib/store'
import { AccessoryLayer, type Slot } from './Accessory'
import { Face, RIGS } from './Face'

// Warm the image cache so pose swaps never flash.
if (typeof window !== 'undefined') {
  for (const r of Object.values(RIGS)) {
    const i = new Image()
    i.src = asset(r.img)
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
  /** Munching: a few quick squashes with crumbs. */
  chomp: () => void
  /** Make a face for a moment, then go back to the resting one. */
  express: (look: LookId, ms?: number) => void
}

interface Particle {
  id: number
  x: number
  y: number
  kind: 'heart' | 'spark' | 'sweat' | 'crumb'
}

interface Props {
  mood: Mood
  equipped: Partial<Record<Slot, string>>
  onTouch?: (s: TouchSummary) => void
  interactive?: boolean
  /** Hold this face instead of the mood's own (chat portrait, previews). */
  look?: LookId
  /** Mouth moves as if speaking. */
  talking?: boolean
  /** No little idle faces of its own. */
  quiet?: boolean
}

let pid = 0
const clamp = (v: number) => Math.max(-1, Math.min(1, v))

export const Character = forwardRef<CharacterHandle, Props>(function Character(
  { mood, equipped, onTouch, interactive = true, look: held, talking, quiet },
  ref,
) {
  const controls = useAnimationControls()
  const [particles, setParticles] = useState<Particle[]>([])
  const box = useRef<HTMLDivElement>(null)
  const tilt = useRef<HTMLDivElement>(null)

  // Which face is showing: a held one, else the one for a stroke in progress, else a passing reaction,
  // else a little idle face, else the mood's resting face.
  const [reaction, setReaction] = useState<LookId | null>(null)
  const [stroking, setStroking] = useState<LookId | null>(null)
  const [idle, setIdle] = useState<LookId | null>(null)
  const [gaze, setGaze] = useState<[number, number] | null>(null)
  const reactionTimer = useRef(0)
  const busy = useRef(false)
  useEffect(() => {
    busy.current = Boolean(reaction || stroking || held)
  }, [reaction, stroking, held])

  const id: LookId = held ?? stroking ?? reaction ?? idle ?? IDLE[mood][0]
  const look: Look = LOOKS[id]
  const rig = look.rig ?? 'stand'

  const express = useCallback((next: LookId, ms = 2200) => {
    window.clearTimeout(reactionTimer.current)
    setReaction(next)
    reactionTimer.current = window.setTimeout(() => setReaction(null), ms)
  }, [])
  useEffect(() => () => window.clearTimeout(reactionTimer.current), [])

  // Left alone, the pet glances around, hums, blinks slowly: small signs of life between interactions.
  useEffect(() => {
    setIdle(null)
    if (quiet || held) return
    const extras = IDLE[mood].slice(1)
    if (!extras.length) return
    let alive = true
    let wait = 0
    let show = 0
    const loop = () => {
      wait = window.setTimeout(
        () => {
          if (!alive) return
          if (!busy.current && document.visibilityState === 'visible') {
            setIdle(pick(`idle-${mood}`, extras))
            show = window.setTimeout(() => alive && setIdle(null), 1500 + Math.random() * 1400)
          }
          loop()
        },
        5200 + Math.random() * 4200,
      )
    }
    loop()
    return () => {
      alive = false
      window.clearTimeout(wait)
      window.clearTimeout(show)
    }
  }, [mood, quiet, held])

  /** Lean a little toward the stroking finger. */
  const lean = (deg: number) => tilt.current?.style.setProperty('--lean', `${deg}deg`)

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
    express,
    hearts: (n = 4) => {
      for (let i = 0; i < n; i++)
        window.setTimeout(() => spawn('heart', 35 + Math.random() * 30, 30 + Math.random() * 20), i * 110)
    },
    chomp: () => {
      express(moment('eating'), 1300)
      controls.start({
        scaleY: [1, 0.95, 1.02, 0.95, 1.02, 0.96, 1],
        scaleX: [1, 1.04, 0.99, 1.04, 0.99, 1.03, 1],
        transition: { duration: 0.9, ease: 'easeInOut' },
      })
      for (let i = 0; i < 5; i++) window.setTimeout(() => spawn('crumb', 42 + Math.random() * 16, 56 + Math.random() * 5), 120 + i * 130)
    },
  }))

  const rel = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }

  /** Eyes follow the finger. */
  const watch = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    const face = RIGS[rig]
    const x = clamp((e.clientX - (r.left + (face.cx / 330) * r.width)) / (r.width * 0.3))
    const y = clamp((e.clientY - (r.top + (face.cy / 520) * r.height)) / (r.height * 0.2))
    setGaze((prev) => (prev && Math.abs(prev[0] - x) < 0.12 && Math.abs(prev[1] - y) < 0.12 ? prev : [x, y]))
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
    watch(e)
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
    if (box.current) {
      const r = box.current.getBoundingClientRect()
      lean(Math.max(-4, Math.min(4, ((e.clientX - (r.left + r.width / 2)) / r.width) * 9)))
    }
    // A slow stroke is enjoyed with closed eyes; a fast one is watched warily.
    if (s.moved > 28) {
      if (d / dt < 1.6) setStroking((cur) => cur ?? moment('petting'))
      else watch(e)
    } else watch(e)
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
    lean(0)
    setGaze(null)
    setStroking(null)
    const now = performance.now()
    if (s.moved > 28) {
      s.strokes++
      bounce()
      express(moment('petted'), 1800)
    } else {
      s.taps.push(now)
      const recent = s.taps.filter((t) => now - t < 1000).length
      const p = rel(e)
      if (recent >= 5) {
        shake()
        spawn('sweat', p.x, p.y)
        express(moment('rough'), 1600)
      } else {
        spawn('spark', p.x, p.y)
        controls.start({ scaleY: [1, 0.94, 1], transition: { duration: 0.25 } })
        express(moment('tap'), 1100)
      }
    }
    s.timer = window.setTimeout(flush, 900)
  }

  const img = RIGS[rig].img
  return (
    <div className="char-box" ref={box}>
      <div className={`char-shadow ${mood}`} aria-hidden />
      <motion.div className="char-motion" animate={controls} style={{ originY: 1 }}>
        <div className="char-tilt" ref={tilt}>
          <div className={`char-idle ${mood} ${look.motion ? `m-${look.motion}` : ''}`}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={rig}
                className="char-pose"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <img src={asset(img)} alt="" className="char-img" draggable={false} />
                <Face rig={rig} look={look} gaze={gaze} talking={talking} />
              </motion.div>
            </AnimatePresence>
            <AccessoryLayer equipped={equipped} pose={rig} />
            {mood === 'hungry' && !reaction && !held && (
              <div className="thought" aria-hidden>
                <img src={asset('food_carrot.webp')} alt="" />
              </div>
            )}
            {mood === 'hurt' && <div className="pain" aria-hidden />}
          </div>
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
            express(moment('petted'), 1800)
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
              {p.kind === 'heart' ? '♥' : p.kind === 'spark' ? '✦' : p.kind === 'crumb' ? '•' : '💦'}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
})
