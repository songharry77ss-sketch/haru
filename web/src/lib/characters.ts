/**
 * The friends a child can choose from. Each one has a blank-faced standing render the live face is drawn on,
 * its own set of whole-body pose pictures, and the spots where outfits sit on it.
 */
import { useHaru } from './store'

export type CharacterId = 'bunny' | 'otter' | 'puppy' | 'pinkbunny'
export type RigName = 'stand' | 'hug'
export type Slot = 'hat' | 'face' | 'neck'

/** Where the face sits on a render, in its 330×520 box. `scale` sizes the whole face, `eye` the eyes on top of that. */
export interface RigDef {
  img: string
  cx: number
  cy: number
  rot: number
  scale: number
  mouth: [number, number]
  /** Half the distance between the eyes, before `scale`. */
  eyeDx: number
  eye: number
}

/** Where an outfit slot sits, in fractions of the character box. `size` widens or narrows the item for this friend. */
export interface Anchor {
  x: number
  y: number
  rotate?: number
  size?: number
}

export interface CharacterDef {
  id: CharacterId
  name: string
  emoji: string
  defaultName: string
  blurb: string
  /** Standing pictures with the face painted in, for avatars and small illustrations. */
  calm: string
  happy: string
  worried: string
  /** Where a round avatar should look on `calm` (CSS object-position). */
  avatarFocus: string
  /** Folder of the whole-body pose pictures, under /img. */
  poseDir: string
  rigs: { stand: RigDef; hug?: RigDef }
  anchors: { stand: Record<Slot, Anchor>; hug?: Record<Slot, Anchor> }
  /** The food it is seen holding while it eats, and dreams of when hungry. */
  treat: 'carrot' | 'meat' | 'kibble' | 'broccoli'
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  bunny: {
    id: 'bunny',
    name: '토끼',
    emoji: '🐰',
    defaultName: '하루',
    blurb: '조용하지만 누구보다 잘 들어주는 친구',
    calm: 'bunny_calm.webp',
    happy: 'bunny_happy.webp',
    worried: 'bunny_worried.webp',
    avatarFocus: '50% 42%',
    poseDir: 'pose',
    rigs: {
      stand: { img: 'bunny_stand_base.webp', cx: 171.5, cy: 272.8, rot: 0, scale: 1, mouth: [0, 27.5], eyeDx: 46.4, eye: 1 },
      hug: { img: 'bunny_hug_base.webp', cx: 163.5, cy: 282.5, rot: -6.5, scale: 1.05, mouth: [-3, 33], eyeDx: 46.4, eye: 1 },
    },
    anchors: {
      stand: { hat: { x: 0.515, y: 0.405 }, face: { x: 0.515, y: 0.535 }, neck: { x: 0.505, y: 0.69 } },
      hug: { hat: { x: 0.52, y: 0.33, rotate: -6 }, face: { x: 0.53, y: 0.465, rotate: -6 }, neck: { x: 0.52, y: 0.635, rotate: -4 } },
    },
    treat: 'carrot',
  },
  otter: {
    id: 'otter',
    name: '수달',
    emoji: '🦦',
    defaultName: '모모',
    blurb: '장난기 많고 웃음이 많은 친구',
    calm: 'pose/otter/stand.webp',
    happy: 'pose/otter/hug_happy.webp',
    worried: 'pose/otter/comfort_pat.webp',
    avatarFocus: '50% 16%',
    poseDir: 'pose/otter',
    rigs: {
      stand: { img: 'otter_stand_base.webp', cx: 165, cy: 204.4, rot: 0, scale: 0.84, mouth: [0.5, 27.5], eyeDx: 39.3, eye: 0.98 },
    },
    anchors: {
      stand: { hat: { x: 0.5, y: 0.272, size: 0.86 }, face: { x: 0.5, y: 0.398, size: 0.74 }, neck: { x: 0.5, y: 0.53, size: 1.3 } },
    },
    treat: 'meat',
  },
  puppy: {
    id: 'puppy',
    name: '강아지',
    emoji: '🐶',
    defaultName: '콩이',
    blurb: '언제나 반갑게 꼬리치는 친구',
    calm: 'pose/puppy/stand.webp',
    happy: 'pose/puppy/hug_happy.webp',
    worried: 'pose/puppy/comfort_pat.webp',
    avatarFocus: '50% 12%',
    poseDir: 'pose/puppy',
    rigs: {
      stand: { img: 'puppy_stand_base.webp', cx: 167, cy: 197, rot: 0, scale: 1.18, mouth: [0, 38.6], eyeDx: 42.4, eye: 1.34 },
    },
    anchors: {
      stand: { hat: { x: 0.506, y: 0.202, size: 1 }, face: { x: 0.506, y: 0.386, size: 1.16 }, neck: { x: 0.503, y: 0.558, size: 1.12 } },
    },
    treat: 'kibble',
  },
  pinkbunny: {
    id: 'pinkbunny',
    name: '분홍토끼',
    emoji: '🐇',
    defaultName: '봄이',
    blurb: '다정하고 섬세한 친구',
    calm: 'pose/pinkbunny/stand.webp',
    happy: 'pose/pinkbunny/hug_happy.webp',
    worried: 'pose/pinkbunny/comfort_pat.webp',
    avatarFocus: '50% 34%',
    poseDir: 'pose/pinkbunny',
    rigs: {
      stand: { img: 'pinkbunny_stand_base.webp', cx: 165.9, cy: 244.4, rot: 0, scale: 0.9, mouth: [0, 30.5], eyeDx: 41.7, eye: 1.22 },
    },
    anchors: {
      stand: { hat: { x: 0.503, y: 0.35, size: 0.8 }, face: { x: 0.503, y: 0.476, size: 0.86 }, neck: { x: 0.5, y: 0.585, size: 1.15 } },
    },
    treat: 'carrot',
  },
}

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[]
export const isCharacter = (v: unknown): v is CharacterId => typeof v === 'string' && v in CHARACTERS
export const characterOf = (v: unknown): CharacterDef => CHARACTERS[isCharacter(v) ? v : 'bunny']

/** The rig a look asks for, or the standing one when this friend has no such render. */
export const rigOf = (c: CharacterDef, name: RigName = 'stand'): { name: RigName; rig: RigDef } =>
  name === 'hug' && c.rigs.hug ? { name: 'hug', rig: c.rigs.hug } : { name: 'stand', rig: c.rigs.stand }

/**
 * Where to put a box holding the 330×520 render inside a square frame so that the face fills the frame
 * (round portraits, the tiles of the face gallery). Percentages of the frame; `eyeLine` is how far down
 * the frame the eyes sit, and `zoom` below 1 shows more of the head.
 */
export function faceCrop(r: RigDef, eyeLine = 50.8, zoom = 1): { left: string; top: string; width: string } {
  const k = Math.max(0.72, Math.min(1.12, (r.eyeDx * r.scale) / 46.4))
  const w = (122 / k) * zoom
  return { left: `${50 - (w * r.cx) / 330}%`, top: `${eyeLine - (w * r.cy) / 330}%`, width: `${w}%` }
}

/** The signed-in child's friend (the bunny before anyone has signed in). */
export function useCharacter(override?: CharacterId): CharacterDef {
  const { state } = useHaru()
  return characterOf(override ?? state?.user.character)
}
