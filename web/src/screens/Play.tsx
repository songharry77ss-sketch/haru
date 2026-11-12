import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Close } from '../components/Icons'
import { api } from '../lib/api'
import { asset, useHaru } from '../lib/store'
import { useCharacter } from '../lib/characters'

const DURATION = 30_000
type Drop = { id: number; x: number; y: number; vy: number; kind: 'carrot' | 'broccoli' | 'star' }

/** 당근 받기: move the pet left/right to catch falling treats. Short on purpose — play, then back to the room. */
export function Play({ onClose }: { onClose: () => void }) {
  const { state, apply, say, rewardToast, fail } = useHaru()
  const friend = useCharacter()
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready')
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(DURATION)
  const [drops, setDrops] = useState<Drop[]>([])
  const [px, setPx] = useState(50)
  const field = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  const st = useRef({ px: 50, score: 0, drops: [] as Drop[], last: 0, spawn: 0, start: 0, id: 0 })

  const tooTired = (state?.pet.energy ?? 100) < 12

  useEffect(() => {
    if (phase !== 'play') return
    const s = st.current
    s.start = s.last = performance.now()
    s.spawn = 0
    s.score = 0
    s.drops = []
    const loop = (t: number) => {
      const dt = Math.min(48, t - s.last)
      s.last = t
      const elapsed = t - s.start
      s.spawn -= dt
      if (s.spawn <= 0) {
        const r = Math.random()
        s.drops.push({ id: ++s.id, x: 8 + Math.random() * 84, y: -8, vy: 0.022 + Math.random() * 0.012 + elapsed / 2_000_000, kind: r < 0.12 ? 'star' : r < 0.3 ? 'broccoli' : 'carrot' })
        s.spawn = Math.max(380, 820 - elapsed / 60)
      }
      const kept: Drop[] = []
      for (const d of s.drops) {
        d.y += d.vy * dt
        if (d.y > 78 && d.y < 92 && Math.abs(d.x - s.px) < 12) {
          s.score += d.kind === 'star' ? 5 : d.kind === 'carrot' ? 2 : 1
          continue
        }
        if (d.y < 105) kept.push(d)
      }
      s.drops = kept
      setDrops([...kept])
      setScore(s.score)
      setLeft(Math.max(0, DURATION - elapsed))
      if (elapsed >= DURATION) {
        setPhase('done')
        return
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [phase])

  useEffect(() => {
    if (phase !== 'done') return
    api
      .play({ game: 'carrot_catch', score: st.current.score, durationMs: DURATION })
      .then((r) => {
        apply(r)
        rewardToast(r.reward)
        say(r.line)
      })
      .catch(fail)
  }, [phase, apply, rewardToast, say, fail])

  useEffect(() => {
    if (phase !== 'play') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') move(st.current.px - 8)
      if (e.key === 'ArrowRight') move(st.current.px + 8)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  const move = (x: number) => {
    const v = Math.max(8, Math.min(92, x))
    st.current.px = v
    setPx(v)
  }
  const onPointer = (e: React.PointerEvent) => {
    if (phase !== 'play' || !field.current) return
    const r = field.current.getBoundingClientRect()
    move(((e.clientX - r.left) / r.width) * 100)
  }

  return (
    <motion.section className="screen play" role="dialog" aria-modal="true" aria-label="당근 받기 놀이" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="play-top">
        <span className="pill">🥕 {score}</span>
        <div className="play-time">
          <i style={{ width: `${(left / DURATION) * 100}%` }} />
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="그만하기">
          <Close />
        </button>
      </div>
      <div className="play-field" ref={field} onPointerMove={onPointer} onPointerDown={onPointer}>
        {drops.map((d) => (
          <span key={d.id} className={`drop ${d.kind}`} style={{ left: `${d.x}%`, top: `${d.y}%` }}>
            {d.kind === 'carrot' ? <img src={asset('food_carrot.webp')} alt="" /> : d.kind === 'broccoli' ? <img src={asset('food_broccoli.webp')} alt="" /> : '⭐'}
          </span>
        ))}
        <img className="catcher" src={asset(phase === 'done' ? friend.happy : friend.calm)} alt="" style={{ left: `${px}%` }} />
        <AnimatePresence>
          {phase !== 'play' && (
            <motion.div className="play-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              {phase === 'ready' ? (
                <>
                  <h2>당근 받기</h2>
                  <p className="muted">화면을 좌우로 움직여 떨어지는 당근을 받아요. 별은 5점!</p>
                  {tooTired ? (
                    <p className="tip">{state?.user.petName}가 너무 졸려해요. 밥을 먹고 조금 쉬었다 놀아요.</p>
                  ) : (
                    <button className="btn block" onClick={() => setPhase('play')}>
                      시작하기
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h2>{score}점!</h2>
                  <p className="muted">같이 노니까 친밀감이 올라갔어요</p>
                  <button className="btn block" onClick={onClose}>
                    방으로 돌아가기
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
