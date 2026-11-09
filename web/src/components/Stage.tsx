import { AnimatePresence, motion } from 'motion/react'
import { forwardRef, type ReactNode } from 'react'
import type { Mood } from '../lib/api'
import { asset, useHaru } from '../lib/store'
import type { Slot } from './Accessory'
import { Character, type CharacterHandle, type TouchSummary } from './Character'

interface Props {
  mood: Mood
  equipped: Partial<Record<Slot, string>>
  theme: string
  onTouch?: (s: TouchSummary) => void
  interactive?: boolean
  children?: ReactNode
}

/** The pet's room: a painted background, theme lighting, the character and its speech bubble. */
export const Stage = forwardRef<CharacterHandle, Props>(function Stage({ mood, equipped, theme, onTouch, interactive, children }, ref) {
  const { speech } = useHaru()
  return (
    <div className={`scene theme-${theme}`}>
      <div className="room">
        <img className="room-img" src={asset('room.webp')} alt="" draggable={false} />
        <div className="room-light" aria-hidden />
        {theme === 'night' && <Stars />}
        {theme === 'blossom' && <Petals />}
        <div className="char-slot">
          <Character ref={ref} mood={mood} equipped={equipped} onTouch={onTouch} interactive={interactive} />
          <AnimatePresence>
            {speech && (
              <motion.div
                key={speech.id}
                className="speech"
                role="status"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              >
                {speech.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {children}
      </div>
    </div>
  )
})

function Stars() {
  return (
    <div className="stars" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 45}%`, animationDelay: `${(i % 5) * 0.6}s` }} />
      ))}
    </div>
  )
}

function Petals() {
  return (
    <div className="petals" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} style={{ left: `${(i * 29) % 100}%`, animationDelay: `${i * 0.9}s`, animationDuration: `${7 + (i % 4)}s` }} />
      ))}
    </div>
  )
}
