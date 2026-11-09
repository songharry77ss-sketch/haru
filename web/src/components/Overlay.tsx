import { AnimatePresence, motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { useHaru } from '../lib/store'
import { Back, Close, Phone } from './Icons'

/** Full-screen panel that slides over the room. */
export function Panel({ title, onClose, children, right, className = '' }: { title: ReactNode; onClose: () => void; children: ReactNode; right?: ReactNode; className?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <motion.section
      className={`screen panel ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
    >
      <div className="topbar">
        <button className="icon-btn" onClick={onClose} aria-label="닫기">
          <Back />
        </button>
        <h1>{title}</h1>
        <div style={{ minWidth: 40, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
      </div>
      {children}
    </motion.section>
  )
}

/** Bottom sheet for short tasks. */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-grip" />
            <button className="icon-btn sheet-close" onClick={onClose} aria-label="닫기">
              <Close />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toasts() {
  const { toasts } = useHaru()
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast ${t.tone ?? ''}`}
            initial={{ opacity: 0, y: -14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/** Shown whenever the safety layer flags a message: real people to call, always one tap away. */
export function HelpSheet() {
  const { help, showHelp, catalog } = useHaru()
  const lines = help ?? catalog?.helplines ?? []
  return (
    <Sheet open={help !== null} onClose={() => showHelp(null)} label="도움 받을 수 있는 곳">
      <div className="help">
        <div className="help-emoji" aria-hidden>
          🤍
        </div>
        <h2>혼자 견디지 않아도 괜찮아요</h2>
        <p className="muted">지금 마음을 들어줄 어른들이 24시간 기다리고 있어요. 전화가 어렵다면 문자도 괜찮아요.</p>
        <div className="help-list">
          {lines.map((h) => (
            <a key={h.tel} className="help-item" href={`tel:${h.tel}`}>
              <span className="help-icon">
                <Phone />
              </span>
              <span>
                <b>{h.name}</b>
                <small>{h.note}</small>
              </span>
              <span className="help-tel">{h.tel}</span>
            </a>
          ))}
        </div>
        <button className="btn block soft" onClick={() => showHelp(null)}>
          알겠어요
        </button>
      </div>
    </Sheet>
  )
}
