// All day boundaries and routine checks use Korea time — the service launches in Korea.
export const TZ = process.env.APP_TZ ?? "Asia/Seoul";

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

export interface LocalParts {
  day: string; // YYYY-MM-DD
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
}

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function local(ts: number): LocalParts {
  const p: Record<string, string> = {};
  for (const part of partsFmt.formatToParts(new Date(ts))) p[part.type] = part.value;
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WD[p.weekday] ?? 0,
  };
}

export const dayKey = (ts: number) => local(ts).day;

/** Start-of-day timestamp (local tz) for the day containing ts, shifted by `offsetDays`. */
export function dayStart(ts: number, offsetDays = 0): number {
  const { hour, minute } = local(ts);
  const secs = new Date(ts).getUTCSeconds();
  const ms = new Date(ts).getUTCMilliseconds();
  return ts - ((hour * 60 + minute) * 60 + secs) * 1000 - ms + offsetDays * 86_400_000;
}

export function lastNDays(now: number, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(dayStart(now, -i) + 3_600_000));
  return out;
}

/** Meal routine the pet expects. Feeding within ±60 min counts as on time. */
export const MEALS = [
  { slot: "breakfast", label: "아침", hour: 8 },
  { slot: "lunch", label: "점심", hour: 12 },
  { slot: "dinner", label: "저녁", hour: 18 },
] as const;
export type MealSlot = (typeof MEALS)[number]["slot"];

export function mealFor(ts: number): { slot: MealSlot; delayMin: number } | null {
  const { hour, minute } = local(ts);
  const mins = hour * 60 + minute;
  for (const m of MEALS) {
    const diff = mins - m.hour * 60;
    // A meal window opens 60 min early and closes 3 h late; later than that is a skipped meal.
    if (diff >= -60 && diff <= 180) return { slot: m.slot, delayMin: Math.max(0, diff) };
  }
  return null;
}

export const isLateNight = (ts: number) => {
  const h = local(ts).hour;
  return h >= 23 || h < 5;
};
