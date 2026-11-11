/** Whole-body poses rendered as pictures (web/public/img/pose). They play for a moment, then the live face returns. */
import type { Mood } from './api'
import { pick } from './expressions'

export const POSES = {
  // 인사
  wave_hello: '안녕!',
  wave_bye: '또 만나',
  wave_sleepy: '잘 자…',
  open_arms: '이리 와',
  bow: '꾸벅',
  salute: '충성',
  // 기쁨
  cheer: '만세',
  jump: '폴짝',
  clap: '짝짝짝',
  dance_a: '둠칫',
  dance_b: '두둠칫',
  twirl: '빙그르르',
  thumbs_up: '최고',
  heart_hands: '하트',
  excited_fists: '두근두근',
  cheek_paws: '꺄',
  hands_on_hips: '에헴',
  fighting: '파이팅',
  idea: '아하',
  // 애정
  hug_happy: '포근',
  hug_love: '꼬옥',
  hug_heart: '내 마음',
  giggle: '히힛',
  melt: '사르르',
  ticklish: '간지러',
  grateful: '고마워',
  please: '부탁해',
  comfort_pat: '토닥토닥',
  ear_listen: '듣고 있어',
  // 장난
  peekaboo: '까꿍',
  shh: '쉿',
  tiptoe: '살금살금',
  shrug: '글쎄',
  paw_on_chin: '음…',
  scratch_head: '머쓱',
  arms_crossed: '흥',
  hide_face: '부끄',
  // 먹기
  carrot_hold: '당근이다',
  eat_carrot: '아삭',
  munch: '냠냠',
  yummy: '맛있어',
  drink_milk: '꿀꺽',
  full_tummy: '배불러',
  no_thanks: '이제 그만',
  hungry_tummy: '꼬르륵',
  // 놀이·취미
  ball: '공놀이',
  catch: '잡았다',
  balloon: '풍선',
  read_book: '책 읽기',
  write_diary: '일기 쓰기',
  sing: '랄라',
  headphones: '음악 감상',
  magnifier: '탐정',
  mirror: '어때?',
  flower: '꽃 선물',
  letter: '편지',
  umbrella: '우산',
  toothbrush: '치카치카',
  // 보상
  coin: '코인',
  gem: '보석',
  gift: '선물',
  trophy: '트로피',
  hold_star: '별',
  // 쉼·잠
  sit: '앉기',
  sit_wait: '기다려',
  sit_breathe: '숨 고르기',
  deep_breath: '후—',
  stretch: '기지개',
  pillow_hug: '폭신',
  blanket: '이불 속',
  nightcap: '하암',
  sit_sleep: '꾸벅',
  sleep_lying: '쿨쿨',
  lie_tummy: '뒹굴뒹굴',
  // 속상함
  sit_sad: '시무룩',
  crouch_scared: '무서워',
  tumble: '어질',
  sneeze: '에취',
  run: '다다다',
} as const

export type PoseId = keyof typeof POSES
export const POSE_IDS = Object.keys(POSES) as PoseId[]
export const isPose = (v: unknown): v is PoseId => typeof v === 'string' && v in POSES
export const poseSrc = (id: PoseId) => `pose/${id}.webp`

/** What the pet gets up to by itself, by mood. */
const IDLE_POSES: Record<Mood, readonly PoseId[]> = {
  happy: ['dance_a', 'dance_b', 'clap', 'twirl', 'heart_hands', 'sing', 'balloon', 'jump'],
  excited: ['cheer', 'jump', 'dance_a', 'dance_b', 'twirl', 'excited_fists', 'ball'],
  calm: ['read_book', 'sit', 'headphones', 'sing', 'magnifier', 'write_diary', 'balloon', 'ball', 'drink_milk', 'flower', 'mirror', 'stretch', 'tiptoe', 'umbrella'],
  sleepy: ['pillow_hug', 'nightcap', 'sit_sleep', 'blanket', 'wave_sleepy', 'stretch'],
  worried: ['sit_sad', 'paw_on_chin', 'sit_wait', 'deep_breath'],
  hungry: ['hungry_tummy', 'please', 'sit_wait'],
  hurt: ['sit_sad', 'crouch_scared'],
}

const MOMENT_POSES = {
  petted: ['hug_love', 'melt', 'giggle', 'heart_hands', 'cheek_paws', 'ticklish', 'hug_heart', 'hug_happy', 'grateful'],
  rough: ['tumble', 'crouch_scared', 'hide_face'],
  tap: ['peekaboo', 'shh', 'thumbs_up', 'idea', 'shrug', 'salute', 'ear_listen'],
  eating: ['munch', 'eat_carrot'],
  fed: ['yummy', 'full_tummy', 'thumbs_up', 'grateful'],
  refused: ['no_thanks', 'arms_crossed', 'full_tummy'],
  reward: ['coin', 'gem', 'gift', 'trophy', 'hold_star'],
  win: ['trophy', 'cheer', 'jump', 'clap', 'hands_on_hips'],
  lose: ['scratch_head', 'fighting', 'shrug'],
  dressed: ['mirror', 'hands_on_hips', 'twirl', 'cheek_paws'],
} as const satisfies Record<string, readonly PoseId[]>

export type PoseMoment = keyof typeof MOMENT_POSES
export const poseFor = (m: PoseMoment): PoseId => pick(`pose-${m}`, MOMENT_POSES[m])
export const idlePose = (mood: Mood): PoseId => pick(`pose-idle-${mood}`, IDLE_POSES[mood])

export function greetingPose(hour: number, awayHours: number): PoseId {
  if (awayHours >= 20) return pick('pose-back', ['open_arms', 'cheer', 'hug_heart'] as const)
  if (hour < 6 || hour >= 22) return 'wave_sleepy'
  if (hour < 11) return pick('pose-am', ['stretch', 'wave_hello'] as const)
  return pick('pose-hello', ['wave_hello', 'bow', 'clap'] as const)
}

const warmed = new Set<PoseId>()
/** Loads the picture before it is shown, so the pet never flashes empty. */
export function loadPose(id: PoseId): Promise<void> {
  if (warmed.has(id)) return Promise.resolve()
  return new Promise((ok) => {
    const im = new Image()
    im.onload = () => {
      warmed.add(id)
      ok()
    }
    im.onerror = () => ok()
    im.src = `/img/${poseSrc(id)}`
  })
}
