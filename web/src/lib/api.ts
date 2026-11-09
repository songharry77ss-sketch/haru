export type Mood = 'happy' | 'calm' | 'worried' | 'sleepy' | 'hungry' | 'hurt' | 'excited'
export type Emotion = 'joy' | 'calm' | 'sad' | 'anxious' | 'angry' | 'tired' | 'lonely'
export type Risk = 'none' | 'watch' | 'high'

export interface Relationship {
  index: number
  key: string
  label: string
  nextLabel: string | null
  progress: number
}

export interface Quest {
  kind: string
  label: string
  goal: number
  count: number
  done: boolean
  reward: string
}

export interface AppState {
  user: {
    nickname: string
    ageGroup: 'child' | 'teen' | 'adult'
    character: string
    petName: string
    coins: number
    gems: number
    dailyLimitMin: number
    recoveryCode: string
    guardianCode: string
    createdAt: number
  }
  pet: {
    intimacy: number
    fullness: number
    energy: number
    mood: Mood
    moodLabel: string
    moodEmoji: string
    relationship: Relationship
    equipped: Partial<Record<'hat' | 'face' | 'neck', string>>
    theme: string
  }
  inventory: string[]
  usage: { usedSec: number; limitSec: number; remainingSec: number; restMode: boolean }
  quests: Quest[]
  ai: 'model' | 'offline'
}

export interface Reward {
  coins: number
  gems: number
}

export interface Item {
  id: string
  name: string
  kind: 'outfit' | 'theme' | 'food'
  slot?: 'hat' | 'face' | 'neck'
  price: number
  currency: 'coins' | 'gems'
  description: string
}

export interface Helpline {
  name: string
  tel: string
  note: string
}

export interface Catalog {
  characters: { id: string; name: string; defaultName: string; blurb: string }[]
  items: Item[]
  foods: { id: string; name: string; fullness: number; price: number }[]
  helplines: Helpline[]
}

export interface ChatMessage {
  id: number | string
  role: 'user' | 'assistant'
  content: string
  risk?: Risk
  at: number
}

export interface DiaryEntry {
  id: number
  day: string
  content: string
  mood: Emotion
  created_at: number
}

export interface Behavior {
  days: number
  routine: {
    onTimeRate: number | null
    avgDelayMin: number
    missed: number
    late: number
    onTime: number
    byDay: { day: string; weekday: string; onTime: number; late: number; missed: number }[]
  }
  balance: { axes: { key: string; label: string; actual: number; recommended: number; count: number }[]; tip: string }
  roughTouch: { rate: number; peakPerSec: number; recovery: number | null; episodes: number; suggestRest: boolean }
  access: { sessions: number; lateNight: number; avgMinutesPerDay: number }
}

export interface Report {
  days: number
  state: { key: 'stable' | 'anxious' | 'joyful' | 'lethargic'; label: string; percent: number }
  distribution: { key: string; label: string; percent: number }[]
  indicators: { routine: string; energy: string; emotion: string }
  evidence: string[]
  signals: { key: string; label: string; level: string; desc: string }[]
  suggestion: string
  confidence: 'low' | 'medium' | 'high'
  variables: { key: string; label: string; value: number }[]
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const TOKEN_KEY = 'haru.token'

export const token = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(v: string | null) {
    try {
      if (v) localStorage.setItem(TOKEN_KEY, v)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* private mode: session lasts until reload */
    }
  },
}

const ERROR_TEXT: Record<string, string> = {
  rest_mode: '오늘은 충분히 놀았어요. 내일 또 만나요!',
  not_enough_coins: '코인이 부족해요',
  not_enough: '재화가 부족해요',
  slow_down: '조금만 천천히 이야기해 줘!',
  unauthorized: '다시 시작해 주세요',
}

export async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const t = token.get()
  if (t) headers.authorization = `Bearer ${t}`
  if (init.body !== undefined) headers['content-type'] = 'application/json'
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'network', '인터넷 연결을 확인해 주세요')
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const code = String(data.error ?? 'error')
    throw new ApiError(res.status, code, String(data.message ?? ERROR_TEXT[code] ?? '잠시 후 다시 시도해 주세요'))
  }
  return data as T
}

export const api = {
  catalog: () => request<Catalog>('/catalog'),
  register: (body: { nickname: string; ageGroup: string; character: string; petName: string }) =>
    request<AppState & { token: string }>('/auth/register', { body }),
  restore: (recoveryCode: string) => request<AppState & { token: string }>('/auth/restore', { body: { recoveryCode } }),
  me: () => request<AppState & { reward?: Reward }>('/me'),
  heartbeat: (seconds: number) => request<AppState['usage']>('/usage/heartbeat', { body: { seconds } }),
  touch: (body: { strokes: number; taps: number; avgSpeed: number; peakRate: number; durationMs: number }) =>
    request<AppState & { rough: boolean; line: string; reward: Reward }>('/pet/touch', { body }),
  feed: (food: string) =>
    request<AppState & { line: string; reward?: Reward; refused?: boolean; onTime?: boolean }>('/pet/feed', { body: { food } }),
  play: (body: { game: string; score: number; durationMs: number }) =>
    request<AppState & { line: string; reward?: Reward; refused?: boolean }>('/pet/play', { body }),
  equip: (itemId: string) => request<AppState>('/pet/equip', { body: { itemId } }),
  buy: (itemId: string) => request<AppState>('/shop/buy', { body: { itemId } }),
  chatHistory: () => request<{ messages: ChatMessage[] }>('/chat'),
  chat: (text: string) =>
    request<
      AppState & {
        reply: string
        emotion: { key: Emotion; label: string; intensity: number }
        risk: Risk
        helplines?: Helpline[]
        reward: Reward
      }
    >('/chat', { body: { text } }),
  diary: (month?: string) => request<{ month: string; entries: DiaryEntry[] }>(`/diary${month ? `?month=${month}` : ''}`),
  writeDiary: (content: string, mood: Emotion) =>
    request<AppState & { id: number; line: string; risk: Risk; helplines?: Helpline[]; reward: Reward }>('/diary', {
      body: { content, mood },
    }),
  deleteDiary: (id: number) => request<{ ok: true }>(`/diary/${id}`, { method: 'DELETE' }),
  behavior: (days = 7) => request<Behavior>(`/analysis/behavior?days=${days}`),
  report: (days = 7) => request<Report>(`/analysis/report?days=${days}`),
  settings: (body: { petName?: string; nickname?: string; dailyLimitMin?: number }) =>
    request<AppState>('/settings', { method: 'PATCH', body }),
  deleteAccount: () => request<{ ok: true }>('/account', { method: 'DELETE' }),
  guardian: (code: string) =>
    request<{
      nickname: string
      petName: string
      relationship: Relationship
      report: Report
      behavior: Behavior
      alerts: { level: Risk; day: string; hour: number }[]
      helplines: Helpline[]
      dailyLimitMin: number
    }>(`/guardian/${encodeURIComponent(code)}`),
}

export const stripState = <T extends AppState>(r: T): AppState => ({
  user: r.user,
  pet: r.pet,
  inventory: r.inventory,
  usage: r.usage,
  quests: r.quests,
  ai: r.ai,
})
