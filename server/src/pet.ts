import { one, query } from "./db.js";
import { relationship } from "./catalog.js";
import { dayKey, isLateNight } from "./time.js";

export type Mood = "happy" | "calm" | "worried" | "sleepy" | "hungry" | "hurt" | "excited";

export const MOOD_LABEL: Record<Mood, { label: string; emoji: string }> = {
  happy: { label: "기분좋음", emoji: "😊" },
  excited: { label: "신남", emoji: "🥳" },
  calm: { label: "편안함", emoji: "🙂" },
  worried: { label: "걱정됨", emoji: "🥺" },
  sleepy: { label: "졸려요", emoji: "😪" },
  hungry: { label: "배고파요", emoji: "🥕" },
  hurt: { label: "아파요", emoji: "😣" },
};

export interface PetRow {
  user_id: string;
  intimacy: number;
  fullness: number;
  energy: number;
  mood: Mood;
  mood_until: number;
  equipped: string;
  theme: string;
  last_tick: number;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** Advance the pet's needs to `now`. Hunger grows, energy slowly recovers, long absences cool the bond a little. */
export function tick(pet: PetRow, now: number): PetRow {
  const hours = Math.max(0, (now - pet.last_tick) / 3_600_000);
  if (hours < 1 / 120) return pet; // < 30 s: nothing meaningful changed
  const fullness = clamp(pet.fullness - 4.5 * hours);
  const energy = clamp(pet.energy + 3 * hours);
  // Missing the pet for more than two days slowly lowers intimacy, never below the "friend" floor once reached.
  const idleDays = hours / 24;
  const floor = pet.intimacy >= 20 ? 20 : 0;
  const intimacy = idleDays > 2 ? Math.max(floor, pet.intimacy - (idleDays - 2) * 1.5) : pet.intimacy;
  return { ...pet, fullness, energy, intimacy, last_tick: now };
}

/** The mood shown on screen: a short-lived reaction if one is active, otherwise derived from needs. */
export function displayMood(pet: PetRow, now: number): Mood {
  if (pet.mood_until > now) return pet.mood;
  if (pet.fullness < 25) return "hungry";
  if (pet.energy < 20 || isLateNight(now)) return "sleepy";
  if (pet.intimacy >= 40 && pet.fullness > 60) return "happy";
  return "calm";
}

/** Read the pet and bring its needs up to date. The caller saves it (every caller either saves or only reads). */
export async function loadPet(userId: string, now = Date.now()): Promise<PetRow> {
  const raw = await one<PetRow>("SELECT * FROM pets WHERE user_id = ?", [userId]);
  if (!raw) throw new Error(`pet missing for user ${userId}`);
  return tick(raw, now);
}

export async function savePet(p: PetRow) {
  await query(
    `UPDATE pets SET intimacy = ?, fullness = ?, energy = ?, mood = ?, mood_until = ?,
                     equipped = ?, theme = ?, last_tick = ? WHERE user_id = ?`,
    [p.intimacy, p.fullness, p.energy, p.mood, p.mood_until, p.equipped, p.theme, p.last_tick, p.user_id],
  );
}

export function react(pet: PetRow, mood: Mood, seconds: number, now = Date.now()): PetRow {
  return { ...pet, mood, mood_until: now + seconds * 1000 };
}

export function petView(pet: PetRow, now = Date.now()) {
  const mood = displayMood(pet, now);
  return {
    intimacy: Math.round(pet.intimacy * 10) / 10,
    fullness: Math.round(pet.fullness),
    energy: Math.round(pet.energy),
    mood,
    moodLabel: MOOD_LABEL[mood].label,
    moodEmoji: MOOD_LABEL[mood].emoji,
    relationship: relationship(pet.intimacy),
    equipped: JSON.parse(pet.equipped) as Record<string, string>,
    theme: pet.theme,
  };
}

// ---------- events & daily rewards ----------

export async function logEvent(userId: string, type: string, data: Record<string, unknown>, now = Date.now()) {
  await query("INSERT INTO events (user_id, type, data, created_at) VALUES (?, ?, ?, ?)", [userId, type, JSON.stringify(data), now]);
}

/**
 * Grant a reward at most `cap` times per day. One statement, so two taps arriving together can never
 * both slip under the cap. Returns what was granted (zeros when capped).
 */
export async function grant(userId: string, kind: string, cap: number, coins: number, gems = 0, now = Date.now()) {
  const rows = await query(
    `WITH bump AS (
       INSERT INTO rewards (user_id, day, kind, count) VALUES (?, ?, ?, 1)
       ON CONFLICT (user_id, day, kind) DO UPDATE SET count = rewards.count + 1 WHERE rewards.count < ?
       RETURNING count
     )
     UPDATE users SET coins = coins + ?, gems = gems + ?
      WHERE id = ? AND EXISTS (SELECT 1 FROM bump)
     RETURNING id`,
    [userId, dayKey(now), kind, cap, coins, gems, userId],
  );
  return rows.length ? { coins, gems } : { coins: 0, gems: 0 };
}

const QUESTS = [
  { kind: "checkin", label: "하루 만나러 오기", goal: 1, reward: "🪙 30" },
  { kind: "pat", label: "부드럽게 쓰다듬기 5번", goal: 5, reward: "🪙 2 × 5" },
  { kind: "meal_on_time", label: "밥 시간 지켜주기", goal: 2, reward: "🪙 10 × 2" },
  { kind: "chat", label: "하루와 이야기 나누기", goal: 3, reward: "🪙 3 × 3" },
  { kind: "diary", label: "오늘의 마음 일기", goal: 1, reward: "💎 1" },
] as const;

/** Daily goals that steer kids toward a gentle, regular routine rather than long sessions. */
export async function dailyQuests(userId: string, now = Date.now()) {
  const rows = await query<{ kind: string; count: number }>("SELECT kind, count FROM rewards WHERE user_id = ? AND day = ?", [
    userId,
    dayKey(now),
  ]);
  const counts = new Map(rows.map((r) => [r.kind, r.count]));
  return QUESTS.map((q) => {
    const count = counts.get(q.kind) ?? 0;
    return { ...q, count: Math.min(count, q.goal), done: count >= q.goal };
  });
}
