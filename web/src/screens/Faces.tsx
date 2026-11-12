import { useState } from 'react'
import { AccessoryLayer } from '../components/Accessory'
import { Character } from '../components/Character'
import { Face } from '../components/Face'
import { Sheet } from '../components/Overlay'
import { CHARACTER_IDS, characterOf, faceCrop, rigOf, useCharacter } from '../lib/characters'
import { LOOK_IDS, LOOKS, type LookId } from '../lib/expressions'
import { POSE_IDS, POSES, poseSrc, type PoseId } from '../lib/poses'
import { asset, useHaru } from '../lib/store'

/** Every face the pet can make, to browse and try on. */
export function Faces({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useHaru()
  const def = useCharacter()
  const [picked, setPicked] = useState<LookId>('happy_open')
  const [pose, setPose] = useState<PoseId | null>(null)
  if (!state) return null
  return (
    <Sheet open={open} onClose={onClose} label="표정 도감">
      <div className="faces">
        <h2>
          {state.user.petName}의 표정 <b>{LOOK_IDS.length}</b>가지 · 포즈 <b>{POSE_IDS.length}</b>가지
        </h2>
        <div className="faces-stage">
          <div className="faces-pet">
            <Character mood="calm" equipped={state.pet.equipped} interactive={false} look={picked} heldPose={pose ?? undefined} />
          </div>
          <p className="faces-name">{pose ? POSES[pose] : LOOKS[picked].label}</p>
        </div>
        <div className="faces-grid">
          {LOOK_IDS.map((id) => {
            const look = LOOKS[id]
            const { rig } = rigOf(def, 'rig' in look ? look.rig : undefined)
            return (
              <button
                key={id}
                className={`face-tile ${!pose && picked === id ? 'on' : ''}`}
                onClick={() => {
                  setPose(null)
                  setPicked(id)
                }}
                aria-pressed={!pose && picked === id}
              >
                <span className="face-mini">
                  <span className="face-mini-box" style={faceCrop(rig)}>
                    <img src={asset(rig.img)} alt="" className="char-img" draggable={false} />
                    <Face rig={rig} look={look} still />
                  </span>
                </span>
                <span className="face-label">{look.label}</span>
              </button>
            )
          })}
          {POSE_IDS.map((id) => (
            <button key={id} className={`face-tile ${pose === id ? 'on' : ''}`} onClick={() => setPose(id)} aria-pressed={pose === id}>
              <span className="face-mini pose-mini">
                <img src={asset(poseSrc(id, def))} alt="" loading="lazy" draggable={false} />
              </span>
              <span className="face-label">{POSES[id]}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

const CHECK_LOOKS: LookId[] = ['smile', 'happy_open', 'laugh', 'surprised', 'sad', 'sleepy', 'love', 'pout']
const OUTFITS = [{}, { hat: 'straw_hat', face: 'round_glasses', neck: 'red_scarf' }, { hat: 'crown', face: 'star_glasses', neck: 'bow_tie' }, { hat: 'ribbon', neck: 'bell' }]

/**
 * Development aid: every face of one friend on one page, with a row of large ones wearing outfits, to check a rig
 * at a glance. Open /?faces (bunny) or /?faces=otter while running the dev server.
 */
export function FaceSheet() {
  const which = new URLSearchParams(location.search).get('faces')
  const def = characterOf(which)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: '#fffaf6', overflow: 'auto', padding: 6 }}>
      <div style={{ display: 'flex', gap: 10, padding: '2px 4px 6px', fontSize: 12, fontWeight: 700 }}>
        {CHARACTER_IDS.map((id) => (
          <a key={id} href={`/?faces=${id}`} style={{ color: id === def.id ? '#e2605a' : '#6f5a4e' }}>
            {id}
          </a>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 8 }}>
        {CHECK_LOOKS.map((id, i) => {
          const look = LOOKS[id]
          const { name, rig } = rigOf(def, 'rig' in look ? look.rig : undefined)
          return (
            <div key={id} style={{ position: 'relative', aspectRatio: '330 / 520', background: '#e8d3c1', borderRadius: 10, overflow: 'hidden' }}>
              <img src={asset(rig.img)} alt="" className="char-img" />
              <Face rig={rig} look={look} still />
              <AccessoryLayer equipped={OUTFITS[i % OUTFITS.length]} anchors={def.anchors[name] ?? def.anchors.stand} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(17, 1fr)', gap: 4, alignContent: 'start' }}>
        {LOOK_IDS.map((id) => {
          const look = LOOKS[id]
          const { rig } = rigOf(def, 'rig' in look ? look.rig : undefined)
          return (
            <div key={id} className="face-tile">
              <span className="face-mini">
                <span className="face-mini-box" style={faceCrop(rig)}>
                  <img src={asset(rig.img)} alt="" className="char-img" />
                  <Face rig={rig} look={look} still />
                </span>
              </span>
              <span className="face-label" style={{ fontSize: 9 }}>
                {look.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
