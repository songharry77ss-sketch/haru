/**
 * Behaviour-based emotion analysis.
 *
 * Six variables are computed from everyday care actions — no self-report required — and combined into
 * a distribution over four states: 불안(anxious) · 안정(stable) · 기쁨(joyful) · 무기력(lethargic).
 * Every weight is written out here so the result can be explained to a parent or teacher (XAI).
 */
import { query } from "./db.js";
import { EMOTION_VALENCE, type Emotion } from "./safety.js";
import { MEALS, dayKey, dayStart, isLateNight, lastNDays, local } from "./time.js";

export interface Ev {
  type: string;
  data: Record<string, unknown>;
  created_at: number;
}

/** Everything the analysis needs for one user and window, read once per request. */
export interface Window {
  days: number;
  now: number;
  createdAt: number;
  events: Ev[];
  usage: { day: string; seconds: number }[];
}

export async function loadWindow(userId: string, createdAt: number, days = 7, now = Date.now()): Promise<Window> {
  const since = dayStart(now, -(days - 1));
  const [rows, usage] = await Promise.all([
    query<{ type: string; data: string; created_at: number }>(
      "SELECT type, data, created_at FROM events WHERE user_id = ? AND created_at >= ? ORDER BY created_at",
      [userId, since],
    ),
    query<{ day: string; seconds: number }>("SELECT day, seconds FROM usage WHERE user_id = ? AND day >= ?", [userId, dayKey(since)]),
  ]);
  return {
    days,
    now,
    createdAt,
    usage,
    events: rows.map((r) => ({ type: r.type, data: JSON.parse(r.data) as Record<string, unknown>, created_at: r.created_at })),
  };
}

const WEEKDAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const std = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

// ---------- routine (meal schedule) ----------

export function routine(w: Window) {
  const { days, now, createdAt } = w;
  const feeds = w.events.filter((e) => e.type === "feed");
  const today = dayKey(now);
  const nowMins = local(now).hour * 60 + local(now).minute;

  const byDay = lastNDays(now, days).map((day) => {
    const dayFeeds = feeds.filter((f) => dayKey(f.created_at) === day);
    let onTime = 0;
    let late = 0;
    let missed = 0;
    for (const m of MEALS) {
      const fed = dayFeeds.filter((f) => f.data.slot === m.slot);
      if (fed.length) {
        const delay = Math.min(...fed.map((f) => Number(f.data.delayMin ?? 0)));
        if (delay <= 60) onTime++;
        else late++;
        continue;
      }
      // Only count a meal as missed once its window has closed and the account existed then.
      const slotEnd = dayStart(Date.parse(`${day}T12:00:00Z`)) + (m.hour * 60 + 180) * 60_000;
      const windowClosed = day < today || (day === today && nowMins > m.hour * 60 + 180);
      if (windowClosed && slotEnd > createdAt) missed++;
    }
    return { day, weekday: WEEKDAY[new Date(`${day}T12:00:00Z`).getUTCDay()], onTime, late, missed };
  });

  const onTime = byDay.reduce((a, d) => a + d.onTime, 0);
  const late = byDay.reduce((a, d) => a + d.late, 0);
  const missed = byDay.reduce((a, d) => a + d.missed, 0);
  const total = onTime + late + missed;
  const delays = feeds.map((f) => Number(f.data.delayMin ?? 0)).filter((d) => d > 0);
  return {
    onTimeRate: total ? onTime / total : null,
    avgDelayMin: delays.length ? Math.round(mean(delays)) : 0,
    missed,
    late,
    onTime,
    byDay,
  };
}

// ---------- the six variables ----------

function variables(w: Window) {
  const ev = w.events;
  const touches = ev.filter((e) => e.type === "touch");
  const chats = ev.filter((e) => e.type === "chat");
  const diaries = ev.filter((e) => e.type === "diary");
  const plays = ev.filter((e) => e.type === "play");
  const sessions = ev.filter((e) => e.type === "session");
  const activeDays = new Set(ev.map((e) => dayKey(e.created_at))).size || 1;

  const rough = touches.filter((t) => t.data.rough === true);
  const intensities = touches.map((t) => Number(t.data.intensity ?? 0.3));

  const emotions: { emotion: Emotion; w: number; at: number }[] = [
    ...chats.map((c) => ({ emotion: c.data.emotion as Emotion, w: Number(c.data.intensity ?? 0.5), at: c.created_at })),
    ...diaries.map((d) => ({ emotion: d.data.mood as Emotion, w: 1, at: d.created_at })),
  ].filter((e) => e.emotion in EMOTION_VALENCE);
  const valences = emotions.map((e) => EMOTION_VALENCE[e.emotion] * (0.5 + e.w / 2));
  const share = (set: Emotion[]) => (emotions.length ? emotions.filter((e) => set.includes(e.emotion)).length / emotions.length : 0);

  const r = routine(w);

  return {
    sample: { touches: touches.length, chats: chats.length, diaries: diaries.length, plays: plays.length, activeDays },
    touchIntensity: mean(intensities),
    touchFrequency: Math.min(1, touches.length / activeDays / 12),
    roughRatio: touches.length ? rough.length / touches.length : 0,
    lateNightRatio: sessions.length ? sessions.filter((s) => isLateNight(s.created_at)).length / sessions.length : 0,
    routineAdherence: r.onTimeRate ?? 0.6,
    sentiment: valences.length ? mean(valences) : 0.1,
    volatility: Math.min(1, std(valences)),
    negativeAnxious: share(["anxious", "angry"]),
    negativeLow: share(["sad", "tired", "lonely"]),
    playRate: Math.min(1, plays.length / activeDays / 2),
    gentleShare: touches.length ? 1 - rough.length / touches.length : 1,
    routineDetail: r,
    touches,
    rough,
    emotions,
  };
}

/** A "recovery" is gentle touching within 3 minutes after a rough burst. */
function recoveries(v: ReturnType<typeof variables>) {
  return v.rough.filter((r) =>
    v.touches.some((t) => t.data.rough !== true && t.created_at > r.created_at && t.created_at - r.created_at < 180_000),
  ).length;
}

// ---------- behaviour dashboard ----------

export function behavior(w: Window) {
  const ev = w.events;
  const v = variables(w);
  const count = (t: string) => ev.filter((e) => e.type === t).length;

  const raw = { touch: count("touch"), feed: count("feed"), play: count("play"), dress: count("dress"), chat: count("chat") };
  const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
  // Recommended mix from the clinical model: care and conversation lead, decoration stays light.
  const recommended = { touch: 0.25, feed: 0.2, play: 0.2, dress: 0.1, chat: 0.25 };
  const actual = Object.fromEntries(Object.entries(raw).map(([k, n]) => [k, n / total])) as typeof recommended;
  const gaps = (Object.keys(recommended) as (keyof typeof recommended)[])
    .map((k) => ({ k, gap: recommended[k] - actual[k] }))
    .sort((a, b) => b.gap - a.gap);
  const AXIS_LABEL = { touch: "쓰다듬기", feed: "밥", play: "놀이", dress: "옷", chat: "대화" } as const;
  const tip =
    total < 5
      ? "하루와 조금 더 지내면 상호작용 밸런스를 보여줄게요."
      : gaps[0].gap > 0.08
        ? `${AXIS_LABEL[gaps[0].k]}의 비중을 조금 더 늘려보는 건 어떨까요?`
        : "상호작용이 고르게 잘 이루어지고 있어요.";

  const peak = Math.max(0, ...v.touches.map((t) => Number(t.data.peakRate ?? 0)));
  const sessions = ev.filter((e) => e.type === "session");

  return {
    days: w.days,
    routine: v.routineDetail,
    balance: {
      axes: (Object.keys(AXIS_LABEL) as (keyof typeof AXIS_LABEL)[]).map((k) => ({
        key: k,
        label: AXIS_LABEL[k],
        actual: round(actual[k], 3),
        recommended: recommended[k],
        count: raw[k],
      })),
      tip,
    },
    roughTouch: {
      rate: round(v.roughRatio * 100),
      peakPerSec: round(peak, 1),
      recovery: v.rough.length ? round((recoveries(v) / v.rough.length) * 100) : null,
      episodes: v.rough.length,
      suggestRest: v.roughRatio > 0.3,
    },
    access: {
      sessions: sessions.length,
      lateNight: sessions.filter((s) => isLateNight(s.created_at)).length,
      avgMinutesPerDay: round(mean(w.usage.map((u) => u.seconds / 60))),
    },
  };
}

// ---------- 마음 리포트 ----------

export type StateKey = "stable" | "anxious" | "joyful" | "lethargic";
export const STATE_LABEL: Record<StateKey, string> = { stable: "안정", anxious: "불안", joyful: "기쁨", lethargic: "무기력" };

export function report(w: Window) {
  const { days, now } = w;
  const v = variables(w);
  const n = v.sample.touches + v.sample.chats + v.sample.diaries + v.sample.plays;

  const scores: Record<StateKey, number> = {
    anxious:
      1.6 * v.roughRatio + 1.0 * v.lateNightRatio + 1.2 * v.negativeAnxious + 0.5 * v.touchFrequency * v.touchIntensity + 0.5 * v.volatility,
    lethargic: 1.1 * (1 - v.routineAdherence) + 0.8 * (1 - v.touchFrequency) + 1.2 * v.negativeLow + 0.4 * (1 - v.playRate),
    joyful: 1.5 * Math.max(0, v.sentiment) + 0.7 * v.playRate + 0.5 * v.gentleShare * v.touchFrequency,
    stable: 1.3 * v.routineAdherence + 0.6 * (1 - v.volatility) + 0.5 * v.gentleShare + 0.3 * (1 - v.lateNightRatio),
  };
  // Little data → softer distribution, so a brand-new account never reads as "99% 안정".
  const T = n >= 40 ? 0.35 : n >= 12 ? 0.55 : 0.9;
  const exps = Object.fromEntries(Object.entries(scores).map(([k, s]) => [k, Math.exp(s / T)])) as Record<StateKey, number>;
  const z = Object.values(exps).reduce((a, b) => a + b, 0);
  const dist = Object.fromEntries(Object.entries(exps).map(([k, e]) => [k, Math.round((e / z) * 100)])) as Record<StateKey, number>;
  const top = (Object.keys(dist) as StateKey[]).sort((a, b) => dist[b] - dist[a])[0];

  const r = v.routineDetail;
  const routineLevel = r.onTimeRate === null ? "보통" : r.onTimeRate >= 0.75 ? "좋음" : r.onTimeRate >= 0.45 ? "보통" : "낮음";
  const energyLevel = v.playRate + v.touchFrequency > 1 ? "높음" : v.playRate + v.touchFrequency > 0.45 ? "보통" : "낮음";
  const emotionLevel = v.volatility > 0.45 ? "변동" : "안정";

  // Did rough touching rise on days the child expressed negative feelings?
  const negDays = new Set(v.emotions.filter((e) => EMOTION_VALENCE[e.emotion] < 0).map((e) => dayKey(e.at)));
  const roughOnNeg = v.touches.filter((t) => negDays.has(dayKey(t.created_at)));
  const roughRateNeg = roughOnNeg.length ? roughOnNeg.filter((t) => t.data.rough === true).length / roughOnNeg.length : 0;
  const recoveryRate = v.rough.length ? recoveries(v) / v.rough.length : null;

  const evidence: string[] = [];
  if (r.onTimeRate !== null)
    evidence.push(`밥 시간 정시율 ${Math.round(r.onTimeRate * 100)}%로 루틴이 ${r.onTimeRate >= 0.7 ? "대체로 유지됐어요" : "조금 흔들렸어요"}.`);
  if (v.sample.touches >= 5)
    evidence.push(
      v.roughRatio > 0.25
        ? `거친 터치 비율이 ${Math.round(v.roughRatio * 100)}%로 평소보다 높아요.`
        : `터치의 ${Math.round(v.gentleShare * 100)}%가 부드러운 쓰다듬기였어요.`,
    );
  if (recoveryRate !== null && v.rough.length >= 2)
    evidence.push(`거친 터치 뒤 ${Math.round(recoveryRate * 100)}%는 스스로 토닥이며 진정하는 패턴이 보여요.`);
  if (v.emotions.length >= 3)
    evidence.push(
      v.sentiment >= 0.2
        ? "대화와 일기에서 긍정적인 표현이 많았어요."
        : v.sentiment <= -0.2
          ? "대화와 일기에서 힘든 마음이 자주 보였어요."
          : "대화와 일기의 감정은 잔잔한 편이었어요.",
    );
  if (v.lateNightRatio > 0.3) evidence.push("늦은 밤 접속이 잦았어요. 잠이 부족하지 않은지 살펴봐 주세요.");
  if (!evidence.length) evidence.push("하루와 함께한 시간이 쌓이면 더 정확한 리포트를 보여줄게요.");

  const spanDays = Math.max(1, Math.min(days, Math.ceil((now - dayStart(w.createdAt)) / 86_400_000)));
  const level = (x: number) => (x > 0.6 ? "높음" : x > 0.3 ? "보통" : "낮음");
  const signals = [
    {
      key: "stress",
      label: "스트레스 신호",
      level: level(Math.max(v.roughRatio, roughRateNeg) * 1.6),
      desc: roughRateNeg > v.roughRatio + 0.1 ? "속상한 날 거친 터치가 늘어나는 경향" : v.roughRatio > 0.25 ? "거친 터치가 잦아요" : "뚜렷한 신호 없음",
    },
    {
      key: "recovery",
      label: "회복 신호",
      level: recoveryRate === null ? "보통" : level(recoveryRate),
      desc: recoveryRate === null ? "토닥/쓰다듬기로 스스로 진정" : `토닥/쓰다듬기로 스스로 진정 ${Math.round(recoveryRate * 100)}%`,
    },
    {
      key: "bond",
      label: "관계 유지 신호",
      level: level(v.sample.activeDays / spanDays),
      desc: `${spanDays}일 중 ${v.sample.activeDays}일 함께했어요`,
    },
  ];

  const SUGGEST: Record<StateKey, string> = {
    stable: "지금처럼 규칙적인 하루를 응원해 주세요. 작은 칭찬이 큰 힘이 돼요.",
    joyful: "좋은 일을 함께 기뻐해 주세요. 즐거웠던 이야기를 물어봐 주면 좋아요.",
    anxious: "걱정되는 일이 있는지 부드럽게 물어봐 주세요. 잠들기 전 대화 시간이 도움이 돼요.",
    lethargic: "함께 산책하거나 식사 시간을 맞춰보세요. 작은 루틴이 다시 힘을 만들어요.",
  };

  return {
    days,
    state: { key: top, label: STATE_LABEL[top], percent: dist[top] },
    distribution: (Object.keys(STATE_LABEL) as StateKey[]).map((k) => ({ key: k, label: STATE_LABEL[k], percent: dist[k] })),
    indicators: { routine: routineLevel, energy: energyLevel, emotion: emotionLevel },
    evidence,
    signals,
    suggestion: SUGGEST[top],
    confidence: n >= 40 ? "high" : n >= 12 ? "medium" : "low",
    variables: [
      { key: "touchIntensity", label: "터치 강도", value: round(v.touchIntensity, 2) },
      { key: "touchFrequency", label: "터치 빈도", value: round(v.touchFrequency, 2) },
      { key: "roughRatio", label: "거친 터치 비율", value: round(v.roughRatio, 2) },
      { key: "lateNightRatio", label: "심야 접속 비율", value: round(v.lateNightRatio, 2) },
      { key: "routineAdherence", label: "돌봄 루틴 준수", value: round(v.routineAdherence, 2) },
      { key: "sentiment", label: "표현된 감정", value: round(v.sentiment, 2) },
    ],
  };
}
