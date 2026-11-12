import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Chevron, Pencil, Trash } from '../components/Icons'
import { Panel, Sheet } from '../components/Overlay'
import { api, type Behavior, type DiaryEntry, type Emotion, type Report } from '../lib/api'
import { useCharacter } from '../lib/characters'
import { asset, useHaru } from '../lib/store'

export const MOOD_FACE: Record<Emotion, { emoji: string; label: string }> = {
  joy: { emoji: '😄', label: '기뻐요' },
  calm: { emoji: '🙂', label: '평온해요' },
  sad: { emoji: '😢', label: '슬퍼요' },
  anxious: { emoji: '😟', label: '불안해요' },
  angry: { emoji: '😠', label: '화나요' },
  tired: { emoji: '😪', label: '지쳤어요' },
  lonely: { emoji: '🥺', label: '외로워요' },
}

type Tab = 'diary' | 'behavior' | 'report'

export function Analysis({ onClose, initialTab = 'diary' }: { onClose: () => void; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab)
  return (
    <Panel title="분석" onClose={onClose} className="analysis">
      <div className="tabs" role="tablist">
        {(
          [
            ['diary', '일기'],
            ['behavior', '행동 분석'],
            ['report', '마음 리포트'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <div className="scroll analysis-body">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.16 }}>
            {tab === 'diary' && <DiaryTab />}
            {tab === 'behavior' && <BehaviorTab />}
            {tab === 'report' && <ReportTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Panel>
  )
}

// ---------------- diary ----------------

const WD = ['일', '월', '화', '수', '목', '금', '토']
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function DiaryTab() {
  const { apply, fail, say, showHelp, rewardToast } = useHaru()
  const friend = useCharacter()
  const [selected, setSelected] = useState(() => new Date())
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null)
  const [writing, setWriting] = useState(false)
  const [mood, setMood] = useState<Emotion | null>(null)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const month = ymd(selected).slice(0, 7)

  useEffect(() => {
    setEntries(null)
    api
      .diary(month)
      .then((r) => setEntries(r.entries))
      .catch(fail)
  }, [month, fail])

  const week = useMemo(() => {
    const out: Date[] = []
    for (let i = -3; i <= 3; i++) {
      const d = new Date(selected)
      d.setDate(d.getDate() + i)
      out.push(d)
    }
    return out
  }, [selected])

  const shift = (days: number) => {
    const d = new Date(selected)
    d.setDate(d.getDate() + days)
    if (d > new Date()) return
    setSelected(d)
  }

  const dayEntries = (entries ?? []).filter((e) => e.day === ymd(selected))
  const hasEntry = (d: Date) => (entries ?? []).some((e) => e.day === ymd(d))
  const isToday = ymd(selected) === ymd(new Date())

  const save = async () => {
    if (!mood || !content.trim()) return
    setBusy(true)
    try {
      const r = apply(await api.writeDiary(content.trim(), mood))
      setEntries((list) => [{ id: r.id, day: ymd(new Date()), content: content.trim(), mood, created_at: Date.now() }, ...(list ?? [])])
      setWriting(false)
      setContent('')
      setMood(null)
      say(r.line)
      rewardToast(r.reward)
      if (r.helplines) showHelp(r.helplines)
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    try {
      await api.deleteDiary(id)
      setEntries((l) => (l ?? []).filter((e) => e.id !== id))
    } catch (e) {
      fail(e)
    }
  }

  return (
    <div className="diary">
      <div className="date-nav">
        <button className="icon-btn" onClick={() => shift(-7)} aria-label="이전 주">
          <Chevron dir="left" />
        </button>
        <span className="date-pill">
          {selected.getMonth() + 1}월 {selected.getDate()}일 {WD[selected.getDay()]}
        </span>
        <button className="icon-btn" onClick={() => shift(7)} aria-label="다음 주" disabled={isToday}>
          <Chevron />
        </button>
      </div>
      <div className="week">
        {week.map((d) => {
          const sel = ymd(d) === ymd(selected)
          const future = d > new Date()
          return (
            <button key={ymd(d)} className={`day ${sel ? 'sel' : ''}`} disabled={future} onClick={() => setSelected(d)} aria-pressed={sel}>
              <b>{d.getDate()}</b>
              <small>{WD[d.getDay()]}</small>
              {hasEntry(d) && <i className="dot" />}
            </button>
          )
        })}
      </div>

      <div className="entries">
        {entries === null && <div className="skeleton" />}
        {entries !== null && dayEntries.length === 0 && (
          <div className="empty">
            <img src={asset(friend.calm)} alt="" />
            <p>{isToday ? '오늘의 마음을 기록해 볼까요?' : '이 날은 기록이 없어요'}</p>
          </div>
        )}
        {dayEntries.map((e) => (
          <article key={e.id} className="entry">
            <div>
              <time>
                {selected.getMonth() + 1}월 {selected.getDate()}일 ({WD[selected.getDay()]}) ·{' '}
                {new Date(e.created_at).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}
              </time>
              <p>{e.content}</p>
            </div>
            <span className="entry-face" title={MOOD_FACE[e.mood].label}>
              {MOOD_FACE[e.mood].emoji}
            </span>
            <button className="entry-del" onClick={() => remove(e.id)} aria-label="일기 삭제">
              <Trash />
            </button>
          </article>
        ))}
      </div>

      {isToday && (
        <button className="btn fab" onClick={() => setWriting(true)}>
          <Pencil /> 작성하기
        </button>
      )}

      <Sheet open={writing} onClose={() => setWriting(false)} label="마음 일기 쓰기">
        <div className="write">
          <h2>오늘 마음은 어땠어요?</h2>
          <div className="mood-picker">
            {(Object.keys(MOOD_FACE) as Emotion[]).map((m) => (
              <button key={m} className={`mood-opt ${mood === m ? 'on' : ''}`} onClick={() => setMood(m)} aria-pressed={mood === m}>
                <span>{MOOD_FACE[m].emoji}</span>
                <small>{MOOD_FACE[m].label}</small>
              </button>
            ))}
          </div>
          <textarea
            className="field area"
            placeholder="오늘 있었던 일, 하고 싶은 말을 자유롭게 적어보세요"
            value={content}
            maxLength={1000}
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="muted small">일기는 나만 볼 수 있어요. 보호자에게는 내용이 보이지 않아요.</p>
          <button className="btn block" disabled={!mood || !content.trim() || busy} onClick={save}>
            저장하기
          </button>
        </div>
      </Sheet>
    </div>
  )
}

// ---------------- behaviour ----------------

export function BehaviorTab({ data: given }: { data?: Behavior }) {
  const { fail } = useHaru()
  const [data, setData] = useState<Behavior | null>(given ?? null)
  const [breathing, setBreathing] = useState(false)
  useEffect(() => {
    if (!given) api.behavior().then(setData).catch(fail)
  }, [given, fail])
  if (!data) return <div className="skeleton tall" />
  const r = data.routine
  const maxDay = Math.max(3, ...r.byDay.map((d) => d.onTime + d.late + d.missed))
  return (
    <div className="cards">
      <section className="card">
        <h2 className="section-title">돌봄 루틴 준수</h2>
        <div className="kpis">
          <Kpi label="밥 정시율" value={r.onTimeRate === null ? '—' : `${Math.round(r.onTimeRate * 100)}%`} />
          <Kpi label="평균 지연" value={`${r.avgDelayMin}분`} />
          <Kpi label="누락" value={`${r.missed}회`} />
        </div>
        <div className="stack-chart" role="img" aria-label="요일별 밥 시간 기록">
          {r.byDay.map((d) => {
            const px = (n: number) => `${(n / maxDay) * 92}px`
            const empty = d.onTime + d.late + d.missed === 0
            return (
              <div key={d.day} className="stack-col">
                <div className="stack">
                  {empty ? (
                    <span className="seg none" />
                  ) : (
                    <>
                      {d.missed > 0 && <span className="seg missed" style={{ height: px(d.missed) }} />}
                      {d.late > 0 && <span className="seg late" style={{ height: px(d.late) }} />}
                      {d.onTime > 0 && <span className="seg ontime" style={{ height: px(d.onTime) }} />}
                    </>
                  )}
                </div>
                <small>{d.weekday}</small>
              </div>
            )
          })}
        </div>
        <div className="legend">
          <span>
            <i className="ontime" />
            정시
          </span>
          <span>
            <i className="late" />
            지연
          </span>
          <span>
            <i className="missed" />
            누락
          </span>
        </div>
        <p className="muted small">아침 8시 · 점심 12시 · 저녁 6시가 밥 시간이에요 (1시간 이내면 정시)</p>
      </section>

      <section className="card">
        <h2 className="section-title">상호작용 밸런스</h2>
        <Radar axes={data.balance.axes} />
        <div className="legend">
          <span>
            <i className="dash" />
            권장
          </span>
          <span>
            <i className="ontime" />
            실제
          </span>
        </div>
        <p className="tip">{data.balance.tip}</p>
      </section>

      <section className="card">
        <div className="row-between">
          <h2 className="section-title">거친 터치</h2>
          <button className="btn small soft" onClick={() => setBreathing(true)}>
            잠깐 쉬어가기
          </button>
        </div>
        <div className="kpis">
          <Kpi label="거친 터치" value={`${data.roughTouch.rate}%`} warn={data.roughTouch.rate > 30} />
          <Kpi label="연속 터치 피크" value={`${data.roughTouch.peakPerSec}/초`} />
          <Kpi label="회복(토닥)" value={data.roughTouch.recovery === null ? '—' : `${data.roughTouch.recovery}%`} />
        </div>
        {data.roughTouch.suggestRest && <p className="tip">마음이 바쁜 날일 수 있어요. 잠깐 숨을 골라볼까요?</p>}
      </section>

      <section className="card">
        <h2 className="section-title">접속 패턴</h2>
        <div className="kpis">
          <Kpi label="방문" value={`${data.access.sessions}회`} />
          <Kpi label="늦은 밤" value={`${data.access.lateNight}회`} warn={data.access.lateNight > 2} />
          <Kpi label="하루 평균" value={`${data.access.avgMinutesPerDay}분`} />
        </div>
      </section>
      <Breathing open={breathing} onClose={() => setBreathing(false)} />
    </div>
  )
}

function Kpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`kpi ${warn ? 'warn' : ''}`}>
      <small>{label}</small>
      <b>{value}</b>
    </div>
  )
}

function Radar({ axes }: { axes: Behavior['balance']['axes'] }) {
  const size = 220
  const c = size / 2
  const R = 78
  const n = axes.length
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v] as const
  }
  // Scale so the larger of actual/recommended reaches the outer ring.
  const peak = Math.max(0.3, ...axes.map((a) => Math.max(a.actual, a.recommended)))
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v / peak).join(',')).join(' ')
  return (
    <svg className="radar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="상호작용 밸런스 레이더 차트">
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={axes.map((_, i) => pt(i, s).join(',')).join(' ')} fill="none" stroke="#efe2d8" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#efe2d8" />
      })}
      <polygon points={poly(axes.map((a) => a.recommended))} fill="none" stroke="#b9a497" strokeDasharray="4 4" strokeWidth="1.5" />
      <motion.polygon
        points={poly(axes.map((a) => a.actual))}
        fill="rgba(238,125,118,.28)"
        stroke="#e2605a"
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ transformOrigin: 'center' }}
      />
      {axes.map((a, i) => {
        const [x, y] = pt(i, 1.27)
        return (
          <text key={a.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#6f5a4e">
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}

function Breathing({ open, onClose }: { open: boolean; onClose: () => void }) {
  const friend = useCharacter()
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    if (!open) return
    setPhase(0)
    const id = window.setInterval(() => setPhase((p) => p + 1), 4000)
    return () => window.clearInterval(id)
  }, [open])
  const inhale = phase % 2 === 0
  return (
    <Sheet open={open} onClose={onClose} label="숨 고르기">
      <div className="breathe">
        <motion.div className="breathe-orb" animate={{ scale: inhale ? 1.35 : 0.85 }} transition={{ duration: 4, ease: 'easeInOut' }}>
          <img src={asset(friend.calm)} alt="" />
        </motion.div>
        <h2>{inhale ? '코로 천천히 들이마셔요' : '입으로 후— 내쉬어요'}</h2>
        <p className="muted">{Math.min(4, Math.floor(phase / 2) + 1)} / 4번째 숨</p>
        {phase >= 8 && (
          <button className="btn block" onClick={onClose}>
            마음이 조금 편해졌어요
          </button>
        )}
      </div>
    </Sheet>
  )
}

// ---------------- report ----------------

const STATE_COLOR: Record<string, string> = { stable: '#7cc4a4', joyful: '#f3b45b', anxious: '#ee7d76', lethargic: '#9a8fc2' }

export function ReportTab({ data: given }: { data?: Report }) {
  const { fail } = useHaru()
  const [data, setData] = useState<Report | null>(given ?? null)
  const [why, setWhy] = useState(false)
  useEffect(() => {
    if (!given) api.report().then(setData).catch(fail)
  }, [given, fail])
  if (!data) return <div className="skeleton tall" />
  return (
    <div className="cards">
      <section className="card report-hero">
        <h2 className="section-title">이번 주 마음 상태</h2>
        <Gauge percent={data.state.percent} label={data.state.label} color={STATE_COLOR[data.state.key]} />
        <div className="indicators">
          <Indicator label="루틴" value={data.indicators.routine} />
          <Indicator label="에너지" value={data.indicators.energy} />
          <Indicator label="정서" value={data.indicators.emotion} />
        </div>
        {data.confidence === 'low' && <p className="muted small center">아직 데이터가 쌓이는 중이에요. 며칠 더 함께하면 정확해져요.</p>}
      </section>

      <section className="card">
        <h2 className="section-title">근거 요약</h2>
        <ul className="evidence">
          {data.evidence.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="section-title">패턴 신호</h2>
        <div className="signals">
          {data.signals.map((s) => (
            <div key={s.key} className={`signal ${s.key}`}>
              <b>{s.label}</b>
              <span className={`lvl ${s.level === '높음' ? 'hi' : s.level === '보통' ? 'mid' : 'lo'}`}>{s.level}</span>
              <small>{s.desc}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">4가지 상태 분포</h2>
        <div className="dist">
          {data.distribution.map((d) => (
            <div key={d.key} className="dist-row">
              <span>{d.label}</span>
              <div className="dist-bar">
                <motion.i initial={{ width: 0 }} animate={{ width: `${d.percent}%` }} style={{ background: STATE_COLOR[d.key] }} />
              </div>
              <b>{d.percent}%</b>
            </div>
          ))}
        </div>
        <p className="tip">{data.suggestion}</p>
        <button className="link" onClick={() => setWhy((w) => !w)} aria-expanded={why}>
          어떻게 계산되나요? {why ? '접기' : '보기'}
        </button>
        {why && (
          <div className="why">
            <p className="muted small">
              자기보고 없이, 하루를 돌보는 행동에서 6가지 변수를 측정해 불안·안정·기쁨·무기력 4가지 상태로 분류해요. 의학적 진단이 아니라 마음을 살피기 위한
              참고 지표예요.
            </p>
            {data.variables.map((v) => (
              <div key={v.key} className="var-row">
                <span>{v.label}</span>
                <b>{v.value}</b>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Indicator({ label, value }: { label: string; value: string }) {
  return (
    <div className="indicator">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  )
}

function Gauge({ percent, label, color }: { percent: number; label: string; color: string }) {
  const r = 90
  const len = Math.PI * r
  const angle = -90 + (percent / 100) * 180
  return (
    <div className="gauge">
      <svg viewBox="0 0 220 124" role="img" aria-label={`${label} ${percent}%`}>
        <defs>
          <linearGradient id="gg" x1="0" x2="1">
            <stop offset="0" stopColor="#ee7d76" />
            <stop offset="1" stopColor="#f6c05a" />
          </linearGradient>
        </defs>
        <path d="M20 112a90 90 0 01180 0" fill="none" stroke="#f4e7de" strokeWidth="20" strokeLinecap="round" />
        <motion.path
          d="M20 112a90 90 0 01180 0"
          fill="none"
          stroke="url(#gg)"
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray={len}
          initial={{ strokeDashoffset: len }}
          animate={{ strokeDashoffset: len * (1 - percent / 100) }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        {/* a short marker riding the arc, so the centre stays free for the number */}
        <motion.g
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ transformOrigin: '110px 112px' }}
        >
          <line x1="110" y1="4" x2="110" y2="40" stroke="#3b2a22" strokeWidth="4" strokeLinecap="round" />
        </motion.g>
      </svg>
      <div className="gauge-label">
        <b>{percent}%</b>
        <span style={{ color }}>{label}</span>
      </div>
    </div>
  )
}
