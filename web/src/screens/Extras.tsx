import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Check } from '../components/Icons'
import { Sheet } from '../components/Overlay'
import { asset, useHaru } from '../lib/store'
import { useCharacter } from '../lib/characters'

export function Quests({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useHaru()
  if (!state) return null
  return (
    <Sheet open={open} onClose={onClose} label="오늘의 약속">
      <div className="quests">
        <h2>오늘의 약속</h2>
        <p className="muted small">조금씩, 매일. 오래 하는 것보다 꾸준한 게 더 좋아요.</p>
        <ul>
          {state.quests.map((q) => (
            <li key={q.kind} className={q.done ? 'done' : ''}>
              <span className="q-check">{q.done ? <Check size={14} /> : null}</span>
              <span className="q-label">{q.label}</span>
              <span className="q-count">
                {q.count}/{q.goal}
              </span>
              <span className="q-reward">{q.reward}</span>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  )
}

function untilMidnight() {
  const now = new Date()
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const mid = new Date(kst)
  mid.setHours(24, 0, 0, 0)
  const mins = Math.max(0, Math.round((mid.getTime() - kst.getTime()) / 60000))
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`
}

/** "건강한 이별": once today's time is used up the pet goes to sleep until tomorrow. */
export function RestMode({ onDiary }: { onDiary: () => void }) {
  const { state } = useHaru()
  const friend = useCharacter()
  const [left, setLeft] = useState(untilMidnight())
  useEffect(() => {
    const id = window.setInterval(() => setLeft(untilMidnight()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  if (!state) return null
  return (
    <motion.section className="screen rest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="dialog" aria-modal="true" aria-label="오늘은 여기까지">
      <div className="rest-sky" aria-hidden>
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} style={{ left: `${(i * 41) % 100}%`, top: `${(i * 23) % 60}%`, animationDelay: `${(i % 6) * 0.5}s` }} />
        ))}
      </div>
      <motion.img className="rest-pet" src={asset(friend.calm)} alt="" animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 4, repeat: Infinity }} />
      <div className="rest-zzz" aria-hidden>
        z z Z
      </div>
      <div className="rest-card">
        <h2>오늘은 여기까지! 내일 또 만나요</h2>
        <p>
          {state.user.petName}는 오늘 {state.user.nickname}와 충분히 놀아서 꿈나라로 갔어요.
          <br />
          친구나 가족과도 즐거운 시간 보내요 🌙
        </p>
        <small className="muted">다시 만나기까지 {left}</small>
        <button className="btn block soft" onClick={onDiary}>
          오늘의 마음 일기 쓰기
        </button>
      </div>
    </motion.section>
  )
}
