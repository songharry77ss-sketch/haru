import { CHARACTERS, faceCrop, type CharacterId } from '../lib/characters'
import { asset } from '../lib/store'

/** A close-up of a friend's face that fills a square tile (the picker, settings). */
export function FriendFace({ id }: { id: CharacterId }) {
  const c = CHARACTERS[id]
  return (
    <span className="friend-face" aria-hidden>
      <span className="friend-face-box" style={faceCrop(c.rigs.stand, 60, 0.9)}>
        <img src={asset(c.calm)} alt="" draggable={false} />
      </span>
    </span>
  )
}
