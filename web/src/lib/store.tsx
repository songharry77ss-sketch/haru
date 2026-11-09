import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, api, stripState, token, type AppState, type Catalog, type Helpline, type Reward } from './api'

export interface Toast {
  id: number
  text: string
  tone?: 'default' | 'reward' | 'warn'
}

export interface Speech {
  id: number
  text: string
}

interface Ctx {
  state: AppState | null
  catalog: Catalog | null
  booting: boolean
  setState: (s: AppState) => void
  apply: <T extends AppState>(r: T) => T
  toast: (text: string, tone?: Toast['tone']) => void
  toasts: Toast[]
  say: (text: string) => void
  speech: Speech | null
  rewardToast: (r?: Reward) => void
  fail: (e: unknown) => void
  help: Helpline[] | null
  showHelp: (h: Helpline[] | null) => void
  signIn: (t: string, s: AppState) => void
  signOut: () => void
  refresh: () => Promise<void>
}

const HaruContext = createContext<Ctx | null>(null)

export function HaruProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [booting, setBooting] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [speech, setSpeech] = useState<Speech | null>(null)
  const [help, showHelp] = useState<Helpline[] | null>(null)
  const seq = useRef(0)
  const speechTimer = useRef<number | undefined>(undefined)

  const toast = useCallback((text: string, tone: Toast['tone'] = 'default') => {
    const id = ++seq.current
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  const say = useCallback((text: string) => {
    const id = ++seq.current
    setSpeech({ id, text })
    window.clearTimeout(speechTimer.current)
    speechTimer.current = window.setTimeout(() => setSpeech(null), Math.min(6000, 2200 + text.length * 70))
  }, [])

  const rewardToast = useCallback(
    (r?: Reward) => {
      if (!r) return
      const parts = [r.coins ? `🪙 +${r.coins}` : '', r.gems ? `💎 +${r.gems}` : ''].filter(Boolean)
      if (parts.length) toast(parts.join('  '), 'reward')
    },
    [toast],
  )

  const signOut = useCallback(() => {
    token.set(null)
    setState(null)
  }, [])

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.status === 401) return signOut()
        if (e.code === 'rest_mode') {
          setState((s) => (s ? { ...s, usage: { ...s.usage, restMode: true, remainingSec: 0 } } : s))
        }
        toast(e.message, 'warn')
      } else toast('잠시 후 다시 시도해 주세요', 'warn')
    },
    [signOut, toast],
  )

  const apply = useCallback(<T extends AppState>(r: T) => {
    setState(stripState(r))
    return r
  }, [])

  const signIn = useCallback((t: string, s: AppState) => {
    token.set(t)
    setState(stripState(s))
  }, [])

  const refresh = useCallback(async () => {
    const r = await api.me()
    setState(stripState(r))
    rewardToast(r.reward)
  }, [rewardToast])

  useEffect(() => {
    api.catalog().then(setCatalog).catch(() => undefined)
    if (!token.get()) {
      setBooting(false)
      return
    }
    refresh()
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) token.set(null)
      })
      .finally(() => setBooting(false))
  }, [refresh])

  // Count active (visible) time toward the daily healthy-use limit.
  useEffect(() => {
    if (!state) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      api
        .heartbeat(30)
        .then((usage) => setState((s) => (s ? { ...s, usage } : s)))
        .catch(() => undefined)
    }, 30_000)
    return () => window.clearInterval(id)
  }, [state === null]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<Ctx>(
    () => ({
      state,
      catalog,
      booting,
      setState,
      apply,
      toast,
      toasts,
      say,
      speech,
      rewardToast,
      fail,
      help,
      showHelp,
      signIn,
      signOut,
      refresh,
    }),
    [state, catalog, booting, apply, toast, toasts, say, speech, rewardToast, fail, help, signIn, signOut, refresh],
  )
  return <HaruContext.Provider value={value}>{children}</HaruContext.Provider>
}

export function useHaru() {
  const ctx = useContext(HaruContext)
  if (!ctx) throw new Error('useHaru outside provider')
  return ctx
}

export const asset = (name: string) => `/img/${name}`
