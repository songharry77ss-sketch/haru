import { db, tx } from "./db.js";
import { relationship } from "./catalog.js";
import { dayKey, isLateNight, local } from "./time.js";

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

const getPetStmt = db.prepare("SELECT * FROM pets WHERE user_id = ?");
const savePetStmt = db.prepare(
  `UPDATE pets SET intimacy = ?, fullness = ?, energy = ?, mood = ?, mood_until = ?,
                   equipped = ?, theme = ?, last_tick = ? WHERE user_id = ?`,
);

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

export function loadPet(userId: string, now = Date.now()): PetRow {
  const raw = getPetStmt.get(userId) as unknown as PetRow;
  const pet = tick(raw, now);
  if (pet !== raw) savePet(pet);
  return pet;
}

export function savePet(p: PetRow) {
  savePetStmt.run(
    p.intimacy, p.fullness, p.energy, p.mood, p.mood_until, p.equipped, p.theme, p.last_tick, p.user_id,
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

const insertEvent = db.prepare("INSERT INTO events (user_id, type, data, created_at) VALUES (?, ?, ?, ?)");
export function logEvent(userId: string, type: string, data: Record<string, unknown>, now = Date.now()) {
  insertEvent.run(userId, type, JSON.stringify(data), now);
}

const getReward = db.prepare("SELECT count FROM rewards WHERE user_id = ? AND day = ? AND kind = ?");
const bumpReward = db.prepare(
  `INSERT INTO rewards (user_id, day, kind, count) VALUES (?, ?, ?, 1)
   ON CONFLICT(user_id, day, kind) DO UPDATE SET count = count + 1`,
);
const addCurrency = db.prepare("UPDATE users SET coins = coins + ?, gems = gems + ? WHERE id = ?");

/** Grant a reward at most `cap` times per day. Returns what was granted (0s when capped). */
export function grant(userId: string, kind: string, cap: number, coins: number, gems = 0, now = Date.now()) {
  const day = dayKey(now);
  const row = getReward.get(userId, day, kind) as { count: number } | undefined;
  if ((row?.count ?? 0) >= cap) return { coins: 0, gems: 0 };
  return tx(() => {
    bumpReward.run(userId, day, kind);
    if (coins || gems) addCurrency.run(coins, gems, userId);
    return { coins, gems };
  });
}

export function rewardCount(userId: string, kind: string, now = Date.now()): number {
  const row = getReward.get(userId, dayKey(now), kind) as { count: number } | undefined;
  return row?.count ?? 0;
}

/** Daily goals that steer kids toward a gentle, regular routine rather than long sessions. */
export function dailyQuests(userId: string, now = Date.now()) {
  const q = (kind: string, label: string, goal: number, reward: string) => {
    const count = rewardCount(userId, kind, now);
    return { kind, label, goal, count: Math.min(count, goal), done: count >= goal, reward };
  };
  return [
    q("checkin", "하루 만나러 오기", 1, "🪙 30"),
    q("pat", "부드럽게 쓰다듬기 5번", 5, "🪙 2 × 5"),
    q("meal_on_time", "밥 시간 지켜주기", 2, "🪙 10 × 2"),
    q("chat", "하루와 이야기 나누기", 3, "🪙 3 × 3"),
    q("diary", "오늘의 마음 일기", 1, "💎 1"),
  ];
}

export function hourOf(ts: number) {
  return local(ts).hour;
}
