import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { Stage } from '../components/Stage'
import type { CharacterHandle, TouchSummary } from '../components/Character'
import { Bolt, Carrot, Chart, Coin, Gear, Gem, Paw, Search, Send, Shirt, Store } from '../components/Icons'
import { api } from '../lib/api'
import { tap } from '../lib/native'
import { asset, useHaru } from '../lib/store'

export type Overlay = 'chat' | 'wardrobe' | 'shop' | 'analysis' | 'settings' | 'play' | 'quests' | null

const FOODS = [
  { id: 'kibble', name: '사료', img: 'food_kibble.webp', price: 0 },
  { id: 'carrot', name: '당근', img: 'food_carrot.webp', price: 0 },
  { id: 'meat', name: '고기', img: 'food_meat.webp', price: 15 },
  { id: 'broccoli', name: '브로콜리', img: 'food_broccoli.webp', price: 0 },
]

export function Home({ open, firstVisit }: { open: (o: Overlay) => void; firstVisit: boolean }) {
  const { state, apply, say, rewardToast, fail } = useHaru()
  const [tray, setTray] = useState<'chat' | 'feed'>('chat')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState(firstVisit)
  const charRef = useRef<CharacterHandle>(null)
  if (!state) return null
  const { pet, user, quests } = state
  const questDone = quests.filter((q) => q.done).length

  const onTouch = async (s: TouchSummary) => {
    setHint(false)
    try {
      const r = apply(await api.touch(s))
      say(r.line)
      if (!r.rough) {
        charRef.current?.hearts(3)
        tap()
      }
      rewardToast(r.reward)
    } catch (e) {
      fail(e)
    }
  }

  const feed = async (food: string) => {
    if (busy) return
    setBusy(true)
    try {
      const r = apply(await api.feed(food))
      say(r.line)
      if (!r.refused) {
        tap('medium')
        charRef.current?.bounce()
        charRef.current?.hearts(2)
      }
      rewardToast(r.reward)
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const startChat = () => {
    open('chat')
    if (draft.trim()) sessionStorage.setItem('haru.draft', draft.trim())
    setDraft('')
  }

  return (
    <div className="screen home">
      <Stage ref={charRef} mood={pet.mood} equipped={pet.equipped} theme={pet.theme} onTouch={onTouch}>
        <AnimatePresence>
          {hint && (
            <motion.div className="pat-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <img src={asset('hand.webp')} alt="" />
              <span>{user.petName}를 살살 쓰다듬어 주세요</span>
            </motion.div>
          )}
        </AnimatePresence>
      </Stage>

      <header className="hud">
        <div className="hud-row">
          <button className="pill quest-pill" onClick={() => open('quests')} aria-label="오늘의 약속 보기">
            <span className="quest-ring" style={{ ['--p' as string]: questDone / quests.length }} />
            {questDone}/{quests.length}
          </button>
          <div className="wallet">
            <span className="pill" aria-label={`코인 ${user.coins}개`}>
              <Coin /> {user.coins.toLocaleString()}
            </span>
            <span className="pill" aria-label={`보석 ${user.gems}개`}>
              <Gem /> {user.gems}
            </span>
          </div>
          <button className="icon-btn" onClick={() => open('settings')} aria-label="설정">
            <Gear />
          </button>
        </div>

        <div className="bond">
          <div className="bond-head">
            <span className="bond-label">친밀감</span>
            <span className="level-chip">{pet.relationship.label}</span>
            <span className="bond-pct">{Math.round(pet.intimacy)}%</span>
          </div>
          <Bar value={pet.intimacy} tone="coral" big />
        </div>

        <motion.div className="mood-chip" key={pet.moodLabel} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <span className="muted">기분</span> <b>{pet.moodLabel}</b> <span aria-hidden>{pet.moodEmoji}</span>
        </motion.div>
      </header>

      <footer className="dock">
        <div className="stats">
          <Stat label="포만도" value={pet.fullness} icon={<Carrot size={16} />} tone="coral" />
          <Stat label="에너지" value={pet.energy} icon={<Bolt size={16} />} tone="brown" />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {tray === 'feed' ? (
            <motion.div
              key="feed"
              className="food-tray"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {FOODS.map((f) => (
                <button key={f.id} className="food" onClick={() => feed(f.id)} disabled={busy} aria-label={`${f.name} 주기${f.price ? ` (${f.price}코인)` : ''}`}>
                  <img src={asset(f.img)} alt="" />
                  {f.price > 0 && (
                    <span className="food-price">
                      <Coin size={12} />
                      {f.price}
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.form
              key="chat"
              className="chat-bar"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onSubmit={(e) => {
                e.preventDefault()
                startChat()
              }}
            >
              <Search size={18} className="muted" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => !draft && startChat()}
                placeholder={`${user.petName}와 대화해보세요.`}
                aria-label={`${user.petName}와 대화하기`}
              />
              <button className="send" aria-label="보내기">
                <Send size={18} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <nav className="nav" aria-label="메뉴">
          <NavBtn label="상점" onClick={() => open('shop')} icon={<Store />} />
          <NavBtn label="꾸미기" onClick={() => open('wardrobe')} icon={<Shirt />} />
          <NavBtn label="먹이주기" active={tray === 'feed'} onClick={() => setTray((t) => (t === 'feed' ? 'chat' : 'feed'))} icon={<Carrot />} />
          <NavBtn label="놀아주기" onClick={() => open('play')} icon={<Paw />} />
          <NavBtn label="분석" onClick={() => open('analysis')} icon={<Chart />} />
        </nav>
      </footer>
    </div>
  )
}

export function Bar({ value, tone, big }: { value: number; tone: 'coral' | 'brown'; big?: boolean }) {
  return (
    <div className={`bar ${big ? 'big' : ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className={`bar-fill ${tone}`}
        initial={false}
        animate={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
    </div>
  )
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: 'coral' | 'brown' }) {
  return (
    <div className="stat">
      <div className="stat-head">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="stat-bar">
        <span className={`stat-icon ${tone}`}>{icon}</span>
        <Bar value={value} tone={tone} />
      </div>
    </div>
  )
}

function NavBtn({ label, icon, onClick, active }: { label: string; icon: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button className={`nav-btn ${active ? 'active' : ''}`} onClick={onClick} aria-pressed={active}>
      {icon}
      <span>{label}</span>
    </button>
  )
}
