import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Send } from '../components/Icons'
import { api, type ChatMessage } from '../lib/api'
import { asset, useHaru } from '../lib/store'

const STARTERS = ['오늘 학교에서 있었던 일 말해줄게', '요즘 좀 피곤해', '기분 좋은 일이 있었어!', '그냥 심심해']

export function Chat({ onClose }: { onClose: () => void }) {
  const { state, apply, fail, showHelp, rewardToast } = useHaru()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [text, setText] = useState(() => {
    const d = sessionStorage.getItem('haru.draft') ?? ''
    sessionStorage.removeItem('haru.draft')
    return d
  })
  const [typing, setTyping] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const petName = state?.user.petName ?? '하루'

  useEffect(() => {
    api
      .chatHistory()
      .then((r) => setMessages(r.messages))
      .catch(fail)
      .finally(() => setLoaded(true))
    input.current?.focus()
  }, [fail])

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const send = async (raw: string) => {
    const t = raw.trim()
    if (!t || typing) return
    setText('')
    const mine: ChatMessage = { id: `u${Date.now()}`, role: 'user', content: t, at: Date.now() }
    setMessages((m) => [...m, mine])
    setTyping(true)
    try {
      const r = apply(await api.chat(t))
      // A short pause reads as the pet thinking, not as lag.
      await new Promise((ok) => setTimeout(ok, 350))
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: r.reply, at: Date.now(), risk: r.risk }])
      if (r.helplines) showHelp(r.helplines)
      rewardToast(r.reward)
    } catch (e) {
      fail(e)
      setMessages((m) => m.filter((x) => x.id !== mine.id))
      setText(t)
    } finally {
      setTyping(false)
    }
  }

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

      <div className="chat-list" ref={list} aria-live="polite">
        {loaded && messages.length === 0 && (
          <div className="chat-empty">
            <img src={asset('bunny_happy.webp')} alt="" />
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
              <div className="bubble">{m.content}</div>
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

      {messages.length < 2 && (
        <div className="starters">
          {STARTERS.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
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
        <button className="send" disabled={!text.trim() || typing} aria-label="보내기">
          <Send size={18} />
        </button>
      </form>
      {state?.ai === 'offline' && <p className="ai-note">지금은 간단한 대화 모드로 이야기하고 있어요</p>}
    </motion.section>
  )
}
