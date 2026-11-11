/** Every face the pet can make, and which ones fit which moment. */
import type { FaceLook, Rig } from '../components/Face'
import type { Emotion, Mood } from './api'

export type Motion =
  | 'breathe'
  | 'hop'
  | 'sway'
  | 'nod'
  | 'shake'
  | 'tiltL'
  | 'tiltR'
  | 'shiver'
  | 'droop'
  | 'wiggle'
  | 'doze'
  | 'jump'
  | 'stretch'
  | 'lean'
  | 'bounce'
  | 'still'

export interface Look extends FaceLook {
  label: string
  rig?: Rig
  motion?: Motion
}

const L = (label: string, look: Omit<Look, 'label'>): Look => ({ label, ...look })

export const LOOKS = {
  // ----- 기쁨 -----
  smile: L('기본 미소', { eyes: 'dot', mouth: 'w' }),
  smile_soft: L('잔잔한 미소', { eyes: 'dot', mouth: 'smile' }),
  happy: L('행복', { rig: 'hug', eyes: 'happy', mouth: 'grin', motion: 'hop' }),
  happy_open: L('활짝 웃음', { rig: 'hug', eyes: 'happy', mouth: 'open', motion: 'hop' }),
  laugh: L('깔깔', { eyes: 'happy', mouth: 'laugh', motion: 'bounce' }),
  laugh_tears: L('눈물 나게 웃음', { eyes: 'gt', mouth: 'laugh', extras: ['tearL', 'tearR'], motion: 'bounce' }),
  grin: L('이히히', { eyes: 'dot', mouth: 'teeth' }),
  beam: L('반짝 기쁨', { eyes: 'big', brows: 'raised', mouth: 'open', extras: ['sparkle'], motion: 'hop' }),
  giggle: L('키득키득', { rig: 'hug', eyes: 'happy', mouth: 'tiny', extras: ['blush'], motion: 'wiggle' }),
  wink: L('윙크', { eyes: ['dot', 'happy'], mouth: 'smile' }),
  wink_tongue: L('메롱 윙크', { eyes: ['happy', 'dot'], mouth: 'tongue', motion: 'tiltR' }),
  tongue: L('메롱', { eyes: 'dot', mouth: 'tongue' }),
  proud: L('뿌듯', { eyes: 'happy', mouth: 'smirk', extras: ['sparkle'], motion: 'still' }),
  smug: L('으쓱', { eyes: 'half', mouth: 'smirk' }),
  excited: L('신남', { rig: 'hug', eyes: 'shine', brows: 'raised', mouth: 'open', extras: ['sparkle'], motion: 'hop' }),
  sparkle_eyes: L('우와', { eyes: 'shine', brows: 'raised', mouth: 'o', extras: ['sparkle'] }),
  star_eyes: L('별눈', { eyes: 'star', brows: 'raised', mouth: 'open', motion: 'hop' }),
  heart_eyes: L('하트눈', { eyes: 'heart', mouth: 'open', extras: ['hearts', 'blush'] }),
  love: L('사랑해', { rig: 'hug', eyes: 'happy', mouth: 'smile', extras: ['hearts', 'blush'], motion: 'sway' }),
  blush_smile: L('수줍은 미소', { eyes: 'dot', mouth: 'tiny', extras: ['blush'], motion: 'sway' }),
  shy: L('부끄', { eyes: 'dot', gaze: [0.7, 1], mouth: 'tiny', extras: ['blush'], motion: 'tiltL' }),
  content: L('흐뭇', { eyes: 'happy', mouth: 'smile' }),
  relieved: L('휴, 다행', { eyes: 'calm', mouth: 'smile', extras: ['sigh'] }),
  grateful: L('고마워', { rig: 'hug', eyes: 'calm', mouth: 'smile', extras: ['blush'], motion: 'nod' }),
  cheer: L('만세', { rig: 'hug', eyes: 'happy', mouth: 'laugh', extras: ['sparkle'], motion: 'jump' }),
  celebrate: L('축하', { eyes: 'star', mouth: 'laugh', extras: ['sparkle'], motion: 'jump' }),
  music: L('흥얼', { eyes: 'happy', mouth: 'open', extras: ['music'], motion: 'sway' }),
  sing: L('노래', { eyes: 'calm', mouth: 'gasp', extras: ['music'], motion: 'sway' }),
  whistle: L('휘파람', { eyes: 'dot', gaze: [-0.8, -0.7], mouth: 'kiss', extras: ['music'] }),
  yay: L('야호', { eyes: 'dot', brows: 'raised', mouth: 'open', motion: 'bounce' }),

  // ----- 평온·호기심 -----
  calm: L('평온', { eyes: 'dot', mouth: 'tiny' }),
  rest: L('눈 감고 쉬기', { eyes: 'calm', mouth: 'w' }),
  look_left: L('왼쪽 보기', { eyes: 'dot', gaze: [-1, 0], mouth: 'w' }),
  look_right: L('오른쪽 보기', { eyes: 'dot', gaze: [1, 0], mouth: 'w' }),
  look_up: L('위 보기', { eyes: 'dot', gaze: [0, -1], mouth: 'tiny' }),
  look_down: L('아래 보기', { eyes: 'dot', gaze: [0, 1], mouth: 'tiny' }),
  curious: L('궁금', { eyes: 'big', brows: ['soft', 'raised'], mouth: 'tiny', extras: ['question'], motion: 'tiltR' }),
  wonder: L('오?', { eyes: 'big', gaze: [0, -0.8], brows: 'raised', mouth: 'o' }),
  thinking: L('생각 중', { eyes: 'dot', gaze: [0.8, -0.8], brows: ['flat', 'raised'], mouth: 'smirk', motion: 'tiltL' }),
  hmm: L('흠', { eyes: 'half', brows: 'flat', mouth: 'flat', motion: 'tiltL' }),
  idea: L('좋은 생각!', { eyes: 'shine', brows: 'raised', mouth: 'open', extras: ['idea'], motion: 'bounce' }),
  listening: L('듣는 중', { eyes: 'dot', brows: 'soft', mouth: 'smile', motion: 'nod' }),
  nod: L('끄덕끄덕', { eyes: 'happy', mouth: 'smile', motion: 'nod' }),
  attentive: L('귀 기울임', { eyes: 'big', brows: 'soft', mouth: 'tiny', motion: 'lean' }),
  waiting: L('기다리는 중', { eyes: 'dot', gaze: [0, -0.9], mouth: 'tiny', motion: 'sway' }),
  daydream: L('멍', { eyes: 'half', gaze: [0.7, -0.6], mouth: 'smile', motion: 'sway' }),
  peaceful: L('평화', { eyes: 'calm', mouth: 'tiny' }),
  deep_breath: L('숨 고르기', { eyes: 'calm', mouth: 'o', extras: ['sigh'], motion: 'stretch' }),
  hum: L('콧노래', { eyes: 'calm', mouth: 'smile', extras: ['music'], motion: 'sway' }),

  // ----- 졸림 -----
  sleepy: L('졸려', { eyes: 'half', mouth: 'tiny', motion: 'doze' }),
  yawn: L('하품', { eyes: 'calm', mouth: 'yawn', extras: ['tearR'], motion: 'stretch' }),
  dozing: L('꾸벅꾸벅', { eyes: 'calm', mouth: 'tiny', extras: ['bubble'], motion: 'doze' }),
  asleep: L('쿨쿨', { eyes: 'calm', mouth: 'kiss', extras: ['zzz'], motion: 'doze' }),
  drowsy_smile: L('나른', { eyes: 'half', mouth: 'smile', motion: 'doze' }),
  wake_up: L('부스스', { eyes: ['half', 'dot'], brows: 'raised', mouth: 'o', motion: 'stretch' }),
  goodnight: L('잘 자', { rig: 'hug', eyes: 'calm', mouth: 'smile', extras: ['zzz'], motion: 'doze' }),

  // ----- 걱정·슬픔 -----
  worried: L('걱정', { eyes: 'dot', brows: 'worried', mouth: 'frown', motion: 'droop' }),
  concerned: L('괜찮아?', { eyes: 'big', brows: 'worried', mouth: 'tiny', motion: 'lean' }),
  caring: L('토닥토닥', { rig: 'hug', eyes: 'dot', brows: 'worried', mouth: 'smile', motion: 'lean' }),
  sad: L('슬픔', { eyes: 'dot', gaze: [0, 0.9], brows: 'sad', mouth: 'frown', motion: 'droop' }),
  gloomy: L('시무룩', { eyes: 'half', brows: 'sad', mouth: 'frown', extras: ['gloom'], motion: 'droop' }),
  teary: L('글썽', { eyes: 'teary', brows: 'sad', mouth: 'wavy', motion: 'droop' }),
  crying: L('엉엉', { eyes: 'sad', brows: 'sad', mouth: 'cry', extras: ['stream'], motion: 'shiver' }),
  sob: L('훌쩍', { eyes: 'sad', brows: 'sad', mouth: 'wavy', extras: ['tearL', 'tearR'], motion: 'droop' }),
  one_tear: L('눈물 한 방울', { eyes: 'dot', brows: 'sad', mouth: 'frown', extras: ['tearR'] }),
  lonely: L('쓸쓸', { eyes: 'dot', gaze: [-0.8, 0.6], brows: 'sad', mouth: 'flat', motion: 'droop' }),
  sorry: L('미안해', { eyes: 'calm', brows: 'worried', mouth: 'frown', extras: ['sweat'], motion: 'nod' }),
  anxious: L('불안', { eyes: 'small', brows: 'worried', mouth: 'wavy', extras: ['sweat'], motion: 'shiver' }),
  nervous: L('긴장', { eyes: 'dot', gaze: [0.9, 0], brows: 'worried', mouth: 'wavy', extras: ['sweat'], motion: 'wiggle' }),
  scared: L('무서워', { eyes: 'small', brows: 'sad', mouth: 'gasp', extras: ['shock'], motion: 'shiver' }),
  startled: L('깜짝', { eyes: 'small', brows: 'raised', mouth: 'o', extras: ['exclaim'], motion: 'jump' }),
  surprised: L('놀람', { eyes: 'big', brows: 'raised', mouth: 'o', motion: 'bounce' }),
  shocked: L('충격', { eyes: 'small', brows: 'raised', mouth: 'gasp', extras: ['shock'], motion: 'shake' }),
  confused: L('어리둥절', { eyes: ['dot', 'big'], brows: ['flat', 'raised'], mouth: 'wavy', extras: ['question'], motion: 'tiltL' }),
  dizzy: L('어질어질', { eyes: 'spiral', mouth: 'wavy', extras: ['dizzy'], motion: 'sway' }),
  embarrassed: L('머쓱', { eyes: 'line', brows: 'worried', mouth: 'wavy', extras: ['blush', 'sweat'], motion: 'wiggle' }),
  awkward: L('어색', { eyes: 'dot', gaze: [0.9, 0.2], brows: 'flat', mouth: 'flat', extras: ['sweat'] }),

  // ----- 토라짐·의지 -----
  pout: L('삐짐', { eyes: 'dot', gaze: [0.9, 0], brows: 'angry', mouth: 'pout', extras: ['puff'], motion: 'still' }),
  sulk: L('토라짐', { eyes: 'half', gaze: [-0.9, 0.3], brows: 'angry', mouth: 'pout', extras: ['puff'], motion: 'tiltL' }),
  angry: L('화남', { eyes: 'dot', brows: 'angry', mouth: 'frown', extras: ['anger', 'puff'], motion: 'shake' }),
  fuming: L('씩씩', { eyes: 'gt', brows: 'angry', mouth: 'frown', extras: ['steam', 'anger'], motion: 'shake' }),
  annoyed: L('시큰둥', { eyes: 'half', brows: 'flat', mouth: 'flat' }),
  hmph: L('흥', { eyes: 'line', brows: 'angry', mouth: 'pout', extras: ['steam'], motion: 'tiltR' }),
  determined: L('결심', { eyes: 'dot', brows: 'angry', mouth: 'smile', motion: 'still' }),
  fighting: L('파이팅', { eyes: 'big', brows: 'angry', mouth: 'open', extras: ['sparkle'], motion: 'bounce' }),

  // ----- 몸 상태 -----
  hungry: L('배고파', { eyes: 'big', gaze: [0, -0.8], brows: 'worried', mouth: 'o', extras: ['drool'], motion: 'droop' }),
  drool: L('맛있겠다', { eyes: 'shine', brows: 'raised', mouth: 'open', extras: ['drool'] }),
  munch: L('냠냠', { eyes: 'happy', mouth: 'chew', extras: ['crumbs', 'puff'], motion: 'bounce' }),
  chewing: L('오물오물', { eyes: 'dot', mouth: 'chew', extras: ['crumbs'] }),
  yummy: L('맛있어', { eyes: 'happy', mouth: 'lick', extras: ['blush'], motion: 'sway' }),
  full: L('배불러', { eyes: 'calm', mouth: 'smile', extras: ['puff', 'sigh'] }),
  no_thanks: L('이제 그만', { eyes: 'line', brows: 'worried', mouth: 'pout', extras: ['puff', 'sweat'], motion: 'shake' }),
  hot: L('더워', { eyes: 'half', brows: 'worried', mouth: 'tongue', extras: ['sweat'], motion: 'droop' }),
  cold: L('추워', { eyes: 'gt', brows: 'worried', mouth: 'wavy', extras: ['gloom'], motion: 'shiver' }),
  sick: L('아파', { eyes: 'half', brows: 'sad', mouth: 'wavy', extras: ['thermo', 'gloom'], motion: 'droop' }),
  ouch: L('아야', { eyes: ['gt', 'teary'], brows: 'worried', mouth: 'wavy', motion: 'shake' }),
  hurt: L('다쳤어', { eyes: 'sad', brows: 'sad', mouth: 'frown', extras: ['bandage', 'tearL'], motion: 'droop' }),
  tired: L('지침', { eyes: 'half', brows: 'sad', mouth: 'flat', extras: ['sigh'], motion: 'droop' }),
  sneeze: L('에취', { eyes: 'gt', mouth: 'gasp', extras: ['shock'], motion: 'jump' }),

  // ----- 쓰다듬기 -----
  petted: L('쓰담쓰담 좋아', { rig: 'hug', eyes: 'calm', mouth: 'smile', extras: ['blush'], motion: 'sway' }),
  melt: L('사르르', { eyes: 'calm', mouth: 'smile', extras: ['blush', 'hearts'], motion: 'sway' }),
  ticklish: L('간지러워', { rig: 'hug', eyes: 'gt', mouth: 'laugh', extras: ['blush'], motion: 'wiggle' }),
  purr: L('기분 좋아', { eyes: 'happy', mouth: 'w', extras: ['hearts'], motion: 'sway' }),
  poke: L('콕?', { eyes: 'big', brows: 'raised', mouth: 'tiny', extras: ['exclaim'], motion: 'bounce' }),
  too_rough: L('살살 해줘', { eyes: 'gt', brows: 'worried', mouth: 'wavy', extras: ['sweat', 'dizzy'], motion: 'shake' }),

  // ----- 놀이·보상·인사 -----
  ready: L('준비 완료', { eyes: 'dot', brows: 'angry', mouth: 'teeth', motion: 'bounce' }),
  focus: L('집중', { eyes: 'dot', gaze: [0, -0.9], brows: 'flat', mouth: 'tiny', motion: 'lean' }),
  win: L('해냈다', { rig: 'hug', eyes: 'star', brows: 'raised', mouth: 'laugh', extras: ['sparkle'], motion: 'jump' }),
  miss: L('아쉬워', { eyes: 'gt', brows: 'worried', mouth: 'wavy', extras: ['sweat'], motion: 'shake' }),
  coin: L('반짝 보상', { eyes: 'star', brows: 'raised', mouth: 'open', extras: ['sparkle'], motion: 'hop' }),
  gift: L('선물이다', { eyes: 'shine', brows: 'raised', mouth: 'o', extras: ['hearts', 'sparkle'], motion: 'bounce' }),
  thanks: L('고마워!', { rig: 'hug', eyes: 'happy', mouth: 'smile', extras: ['hearts'], motion: 'nod' }),
  hello: L('안녕', { eyes: 'dot', brows: 'raised', mouth: 'open', motion: 'bounce' }),
  bye: L('또 만나', { eyes: 'happy', mouth: 'smile', motion: 'sway' }),
  morning: L('좋은 아침', { eyes: 'big', brows: 'raised', mouth: 'open', extras: ['sparkle'], motion: 'stretch' }),
  evening: L('좋은 저녁', { eyes: 'dot', brows: 'soft', mouth: 'smile', motion: 'sway' }),
  night: L('밤 인사', { eyes: 'half', mouth: 'smile', extras: ['zzz'], motion: 'doze' }),
  miss_you: L('보고 싶었어', { rig: 'hug', eyes: 'teary', brows: 'worried', mouth: 'smile', extras: ['hearts'], motion: 'lean' }),
  welcome_back: L('왔구나!', { rig: 'hug', eyes: 'shine', brows: 'raised', mouth: 'laugh', extras: ['hearts'], motion: 'hop' }),
} as const satisfies Record<string, Look>

export type LookId = keyof typeof LOOKS
export const LOOK_IDS = Object.keys(LOOKS) as LookId[]
export const isLook = (v: unknown): v is LookId => typeof v === 'string' && v in LOOKS

/** What the pet looks like while nothing is happening, by mood. The first entry is the resting face. */
export const IDLE: Record<Mood, LookId[]> = {
  happy: ['happy', 'love', 'happy_open', 'giggle', 'content', 'hum'],
  excited: ['excited', 'happy_open', 'beam', 'star_eyes', 'yay', 'music'],
  calm: ['smile', 'smile_soft', 'look_left', 'look_right', 'look_up', 'rest', 'wonder', 'hum', 'wink', 'daydream', 'calm', 'blush_smile'],
  sleepy: ['sleepy', 'dozing', 'yawn', 'drowsy_smile', 'asleep'],
  worried: ['worried', 'concerned', 'look_down', 'lonely', 'nervous'],
  hungry: ['hungry', 'drool', 'look_up', 'waiting', 'tired'],
  hurt: ['hurt', 'ouch', 'teary', 'sob', 'gloomy'],
}

/** Faces for one-off moments. A random one is picked each time, so the pet never reacts the same way twice in a row. */
export const MOMENTS = {
  petting: ['petted', 'melt', 'purr', 'love', 'content'],
  petted: ['love', 'blush_smile', 'thanks', 'giggle', 'heart_eyes', 'ticklish'],
  rough: ['too_rough', 'dizzy', 'ouch'],
  tap: ['poke', 'surprised', 'wink', 'curious', 'tongue'],
  eating: ['munch', 'chewing'],
  fed: ['yummy', 'full', 'thanks', 'content'],
  refused: ['no_thanks', 'pout'],
  play: ['ready', 'focus', 'fighting'],
  win: ['win', 'celebrate', 'cheer', 'proud'],
  lose: ['miss', 'embarrassed', 'determined'],
  reward: ['coin', 'gift', 'star_eyes', 'celebrate'],
  dressed: ['proud', 'sparkle_eyes', 'wink', 'shy', 'smug'],
  wrote: ['proud', 'grateful', 'content', 'listening'],
  listening: ['listening', 'attentive', 'nod', 'curious'],
  thinking: ['thinking', 'hmm', 'wonder'],
} as const satisfies Record<string, LookId[]>

export type Moment = keyof typeof MOMENTS

const lastPick = new Map<string, string>()
/** Picks at random but avoids repeating the previous pick from the same list. */
export function pick<T extends string>(key: string, list: readonly T[]): T {
  const prev = lastPick.get(key)
  const pool = list.length > 1 ? list.filter((v) => v !== prev) : list
  const v = pool[Math.floor(Math.random() * pool.length)]
  lastPick.set(key, v)
  return v
}

export const moment = (m: Moment): LookId => pick(m, MOMENTS[m])

export function greeting(hour: number, awayHours: number): LookId {
  if (awayHours >= 20) return pick('greet-back', ['welcome_back', 'miss_you'] as const)
  if (hour < 6 || hour >= 22) return 'night'
  if (hour < 11) return pick('greet-am', ['morning', 'hello', 'wake_up'] as const)
  if (hour < 18) return pick('greet-pm', ['hello', 'yay', 'beam'] as const)
  return pick('greet-eve', ['evening', 'hello'] as const)
}

/** When the server has no opinion, choose a face from how the child seems to feel. */
export function lookForEmotion(emotion: Emotion): LookId {
  const by: Record<Emotion, readonly LookId[]> = {
    joy: ['happy_open', 'beam', 'laugh', 'excited'],
    calm: ['smile', 'listening', 'nod', 'content'],
    sad: ['caring', 'concerned', 'teary'],
    anxious: ['caring', 'concerned', 'deep_breath'],
    angry: ['listening', 'concerned', 'attentive'],
    tired: ['drowsy_smile', 'caring', 'peaceful'],
    lonely: ['caring', 'love', 'miss_you'],
  }
  return pick(`emo-${emotion}`, by[emotion])
}
