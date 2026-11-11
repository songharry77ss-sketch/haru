import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Character } from '../components/Character'
import { Send } from '../components/Icons'
import { api, type ChatMessage } from '../lib/api'
import { isLook, lookForEmotion, moment, type LookId } from '../lib/expressions'
import { asset, useHaru } from '../lib/store'

const STARTERS = ['오늘 학교에서 있었던 일 말해줄게', '요즘 좀 피곤해', '기분 좋은 일이 있었어!', '그냥 심심해']
const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
/** A stored answer keeps one speech bubble per line. */
const asBubbles = (m: ChatMessage): ChatMessage[] =>
  m.role === 'assistant'
    ? m.content
        .split('\n')
        .filter((s) => s.trim())
        .map((content, i) => ({ ...m, id: `${m.id}-${i}`, content }))
    : [m]

export function Chat({ onClose }: { onClose: () => void }) {
  const { state, apply, fail, showHelp, rewardToast } = useHaru()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [text, setText] = useState(() => {
    const d = sessionStorage.getItem('haru.draft') ?? ''
    sessionStorage.removeItem('haru.draft')
    return d
  })
  /** Waiting for the pet: thinking about an answer, or drawing breath before the next bubble. */
  const [typing, setTyping] = useState(false)
  const [busy, setBusy] = useState(false)
  const [talking, setTalking] = useState(false)
  const [face, setFace] = useState<LookId | null>(null)
  const [chips, setChips] = useState<string[]>([])
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const alive = useRef(true)
  const skip = useRef(false)
  const stick = useRef(true)
  const faceTimer = useRef(0)
  const petName = state?.user.petName ?? '하루'

  useEffect(() => {
    alive.current = true
    api
      .chatHistory()
      .then((r) => setMessages(r.messages.flatMap(asBubbles)))
      .catch(fail)
      .finally(() => setLoaded(true))
    input.current?.focus()
    return () => {
      alive.current = false
      window.clearTimeout(faceTimer.current)
    }
  }, [fail])

  // Follow the conversation down, unless the child has scrolled up to reread something.
  useEffect(() => {
    if (stick.current) list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing, chips])

  /** The pet "types" each bubble out, pausing at punctuation the way a voice would. */
  const speak = async (bubbles: string[]) => {
    skip.current = false
    for (let i = 0; i < bubbles.length; i++) {
      const full = bubbles[i]
      if (i > 0 && !skip.current) {
        setTyping(true)
        await sleep(Math.min(1100, 380 + full.length * 14))
        if (!alive.current) return
      }
      setTyping(false)
      const id = `a${Date.now()}-${i}`
      setMessages((m) => [...m, { id, role: 'assistant', content: '', at: Date.now() }])
      setTalking(true)
      const chars = Array.from(full)
      for (let n = 1; n <= chars.length; n++) {
        if (skip.current) break
        const shown = chars.slice(0, n).join('')
        setMessages((m) => m.map((x) => (x.id === id ? { ...x, content: shown } : x)))
        await sleep(/[.!?…~,]/.test(chars[n - 1]) ? 170 : 30)
        if (!alive.current) return
      }
      setMessages((m) => m.map((x) => (x.id === id ? { ...x, content: full } : x)))
      setTalking(false)
      if (!skip.current) await sleep(160)
    }
  }

  const send = async (raw: string) => {
    const t = raw.trim()
    if (!t || busy) return
    setText('')
    setChips([])
    stick.current = true
    const mine: ChatMessage = { id: `u${Date.now()}`, role: 'user', content: t, at: Date.now() }
    setMessages((m) => [...m, mine])
    setBusy(true)
    setTyping(true)
    window.clearTimeout(faceTimer.current)
    setFace(moment('thinking'))
    try {
      const r = apply(await api.chat(t))
      if (!alive.current) return
      setFace(isLook(r.expression) ? r.expression : lookForEmotion(r.emotion.key))
      // A short pause reads as the pet thinking, not as lag.
      await sleep(260)
      await speak(r.bubbles?.length ? r.bubbles : r.reply.split('\n').filter((s) => s.trim()))
      if (!alive.current) return
      setChips(r.suggestions ?? [])
      if (r.helplines) showHelp(r.helplines)
      rewardToast(r.reward)
      // Hold the face for a moment, then let the pet settle back into its own mood.
      faceTimer.current = window.setTimeout(() => setFace(null), 6000)
    } catch (e) {
      fail(e)
      setMessages((m) => m.filter((x) => x.id !== mine.id))
      setText(t)
      setFace(null)
    } finally {
      setTyping(false)
      setTalking(false)
      setBusy(false)
    }
  }

  const listening = !busy && text.trim().length > 0
  return (
    <motion.section
      className="screen chat"
      role="dialog"
      aria-modal="true"
      aria-label={`${petName}와 대화`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.22 }}
    >
      <header className="chat-head">
        <button className="end-pill" onClick={onClose}>
          대화 종료
        </button>
        <h1>{petName}</h1>
        <span style={{ width: 78 }} />
      </header>

      {state && (
        <div className="chat-pet" aria-hidden>
          <div className="chat-pet-clip">
            <div className="chat-pet-box">
              <Character
                mood={state.pet.mood === 'hurt' ? 'worried' : state.pet.mood}
                equipped={state.pet.equipped}
                interactive={false}
                look={face ?? (listening ? 'attentive' : undefined)}
                talking={talking}
              />
            </div>
          </div>
        </div>
      )}

      <div
        className="chat-list"
        ref={list}
        aria-live="polite"
        onClick={() => (skip.current = true)}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96
        }}
      >
        {loaded && messages.length === 0 && (
          <div className="chat-empty">
            <p>
              <b>{petName}</b>에게 무엇이든 이야기해 봐요.
              <br />
              <span className="muted">여기서 나눈 이야기는 보호자에게 보여지지 않아요.</span>
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              className={`msg ${m.role}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.18 }}
            >
              {m.role === 'assistant' && <img className="avatar" src={asset('bunny_calm.webp')} alt="" />}
              <div className="bubble">{m.content || '​'}</div>
            </motion.div>
          ))}
        </AnimatePresence>
        {typing && (
          <div className="msg assistant">
            <img className="avatar" src={asset('bunny_calm.webp')} alt="" />
            <div className="bubble typing" aria-label={`${petName}가 입력 중`}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      {messages.length < 2 ? (
        <div className="starters">
          {STARTERS.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      ) : (
        chips.length > 0 &&
        !busy && (
          <motion.div className="starters replies" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {chips.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </motion.div>
        )
      )}

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        <textarea
          ref={input}
          rows={1}
          value={text}
          maxLength={500}
          placeholder={`${petName}에게 말하기`}
          aria-label="메시지"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send(text)
            }
          }}
        />
        <button className="send" disabled={!text.trim() || busy} aria-label="보내기">
          <Send size={18} />
        </button>
      </form>
      {state?.ai === 'offline' && <p className="ai-note">지금은 간단한 대화 모드로 이야기하고 있어요</p>}
    </motion.section>
  )
}
