import { useState } from 'react'
import { Character } from '../components/Character'
import { Face, RIGS } from '../components/Face'
import { Sheet } from '../components/Overlay'
import { LOOK_IDS, LOOKS, type LookId } from '../lib/expressions'
import { POSE_IDS, POSES, poseSrc, type PoseId } from '../lib/poses'
import { asset, useHaru } from '../lib/store'

/** Every face the pet can make, to browse and try on. */
export function Faces({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useHaru()
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
            const rig = 'rig' in look && look.rig ? look.rig : 'stand'
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
                  <span className="face-mini-box">
                    <img src={asset(RIGS[rig].img)} alt="" className="char-img" draggable={false} />
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
                <img src={asset(poseSrc(id))} alt="" loading="lazy" draggable={false} />
              </span>
              <span className="face-label">{POSES[id]}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

/** Development aid: every face on one page, to check them all at a glance (open /?faces while running the dev server). */
export function FaceSheet() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: '#fffaf6', overflow: 'auto', padding: 6, display: 'grid', gridTemplateColumns: 'repeat(17, 1fr)', gap: 4, alignContent: 'start' }}>
      {LOOK_IDS.map((id) => {
        const look = LOOKS[id]
        const rig = 'rig' in look && look.rig ? look.rig : 'stand'
        return (
          <div key={id} className="face-tile">
            <span className="face-mini">
              <span className="face-mini-box">
                <img src={asset(RIGS[rig].img)} alt="" className="char-img" />
                <Face rig={rig} look={look} still />
              </span>
            </span>
            <span className="face-label" style={{ fontSize: 9 }}>{look.label}</span>
          </div>
        )
      })}
    </div>
  )
}
