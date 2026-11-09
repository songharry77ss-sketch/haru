import express, { type Request, type Response } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { db, tx } from "./db.js";
import { code, newToken, requireUser, sha256, type User } from "./auth.js";
import { CHARACTERS, FOODS, ITEMS, STARTER_ITEMS, itemById, relationship, type FoodId } from "./catalog.js";
import {
  MOOD_LABEL,
  dailyQuests,
  grant,
  loadPet,
  logEvent,
  petView,
  react,
  savePet,
  type Mood,
} from "./pet.js";
import { behavior, report, routine } from "./analysis.js";
import { companionReply, llmEnabled } from "./llm.js";
import { EMOTION_LABEL, HELPLINES, assessRisk, crisisReply, redactPII, type Emotion } from "./safety.js";
import { dayKey, isLateNight, local, mealFor } from "./time.js";

export const api = express.Router();

const parse = <T extends z.ZodTypeAny>(schema: T, req: Request, res: Response): z.infer<T> | null => {
  const r = schema.safeParse(req.body ?? {});
  if (!r.success) {
    res.status(400).json({ error: "invalid_request", detail: r.error.issues.map((i) => i.message).join(", ") });
    return null;
  }
  return r.data;
};

const userRow = db.prepare(
  `SELECT id, nickname, age_group, character, pet_name, coins, gems, daily_limit_min,
          recovery_code, guardian_code, created_at FROM users WHERE id = ?`,
);
const refreshUser = (id: string) => userRow.get(id) as unknown as User;

const inventoryStmt = db.prepare("SELECT item_id FROM inventory WHERE user_id = ?");
const usageGet = db.prepare("SELECT seconds FROM usage WHERE user_id = ? AND day = ?");

function usageToday(userId: string, now = Date.now()) {
  return (usageGet.get(userId, dayKey(now)) as { seconds: number } | undefined)?.seconds ?? 0;
}

function state(user: User, now = Date.now()) {
  const pet = loadPet(user.id, now);
  const used = usageToday(user.id, now);
  const limit = user.daily_limit_min * 60;
  return {
    user: {
      nickname: user.nickname,
      ageGroup: user.age_group,
      character: user.character,
      petName: user.pet_name,
      coins: user.coins,
      gems: user.gems,
      dailyLimitMin: user.daily_limit_min,
      recoveryCode: user.recovery_code,
      guardianCode: user.guardian_code,
      createdAt: user.created_at,
    },
    pet: petView(pet, now),
    inventory: (inventoryStmt.all(user.id) as { item_id: string }[]).map((r) => r.item_id),
    usage: { usedSec: used, limitSec: limit, remainingSec: Math.max(0, limit - used), restMode: used >= limit },
    quests: dailyQuests(user.id, now),
    ai: llmEnabled() ? "model" : "offline",
  };
}

// ---------- public ----------

api.get("/health", (_req, res) => res.json({ ok: true, ai: llmEnabled() ? "model" : "offline" }));

api.get("/catalog", (_req, res) => res.json({ characters: Object.values(CHARACTERS), items: ITEMS, foods: Object.values(FOODS), helplines: HELPLINES }));

const RegisterBody = z.object({
  nickname: z.string().trim().min(1, "이름을 알려주세요").max(12),
  ageGroup: z.enum(["child", "teen", "adult"]).default("teen"),
  character: z.enum(Object.keys(CHARACTERS) as [keyof typeof CHARACTERS]),
  petName: z.string().trim().min(1).max(10),
});

api.post("/auth/register", (req, res) => {
  const body = parse(RegisterBody, req, res);
  if (!body) return;
  const now = Date.now();
  const id = crypto.randomUUID();
  const token = newToken();
  const recovery = `HARU-${code(3)}`;
  const guardian = code(2);
  tx(() => {
    db.prepare(
      `INSERT INTO users (id, token_hash, recovery_code, guardian_code, nickname, age_group, character, pet_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, sha256(token), recovery, guardian, body.nickname, body.ageGroup, body.character, body.petName, now);
    db.prepare("INSERT INTO pets (user_id, equipped, last_tick) VALUES (?, ?, ?)").run(id, JSON.stringify({ hat: "ribbon" }), now);
    const inv = db.prepare("INSERT INTO inventory (user_id, item_id, acquired_at) VALUES (?, ?, ?)");
    for (const item of STARTER_ITEMS) inv.run(id, item, now);
  });
  logEvent(id, "session", { hour: local(now).hour, first: true }, now);
  grant(id, "checkin", 1, 30, 0, now);
  res.status(201).json({ token, ...state(refreshUser(id), now) });
});

api.post("/auth/restore", (req, res) => {
  const body = parse(z.object({ recoveryCode: z.string().trim().min(6).max(24) }), req, res);
  if (!body) return;
  const row = db.prepare("SELECT id FROM users WHERE recovery_code = ?").get(body.recoveryCode.toUpperCase()) as
    | { id: string }
    | undefined;
  if (!row) return res.status(404).json({ error: "not_found" });
  const token = newToken();
  db.prepare("UPDATE users SET token_hash = ? WHERE id = ?").run(sha256(token), row.id);
  res.json({ token, ...state(refreshUser(row.id)) });
});

// Guardians see trends and safety signals only — never the child's messages or diary text.
api.get("/guardian/:code", (req, res) => {
  const row = db.prepare("SELECT id FROM users WHERE guardian_code = ?").get(String(req.params.code).toUpperCase()) as
    | { id: string }
    | undefined;
  if (!row) return res.status(404).json({ error: "not_found" });
  const user = refreshUser(row.id);
  const since = Date.now() - 14 * 86_400_000;
  const alerts = db
    .prepare(
      `SELECT risk, created_at FROM messages WHERE user_id = ? AND role = 'user' AND risk != 'none' AND created_at >= ?
       ORDER BY created_at DESC LIMIT 20`,
    )
    .all(row.id, since) as { risk: string; created_at: number }[];
  const pet = loadPet(row.id);
  res.json({
    nickname: user.nickname,
    petName: user.pet_name,
    relationship: relationship(pet.intimacy),
    report: report(row.id),
    behavior: behavior(row.id),
    alerts: alerts.map((a) => ({ level: a.risk, day: dayKey(a.created_at), hour: local(a.created_at).hour })),
    helplines: HELPLINES,
    dailyLimitMin: user.daily_limit_min,
  });
});

// ---------- authenticated ----------

api.use(requireUser);

api.get("/me", (req, res) => {
  const user = req.user!;
  const now = Date.now();
  const lastSession = db
    .prepare("SELECT created_at FROM events WHERE user_id = ? AND type = 'session' ORDER BY created_at DESC LIMIT 1")
    .get(user.id) as { created_at: number } | undefined;
  // A new "visit" is any return after 20 minutes away; it feeds the access-pattern variable.
  if (!lastSession || now - lastSession.created_at > 20 * 60_000) {
    logEvent(user.id, "session", { hour: local(now).hour, lateNight: isLateNight(now) }, now);
  }
  const reward = grant(user.id, "checkin", 1, 30, 0, now);
  res.json({ ...state(refreshUser(user.id), now), reward: reward.coins ? reward : undefined });
});

api.post("/usage/heartbeat", (req, res) => {
  const body = parse(z.object({ seconds: z.number().int().min(1).max(120) }), req, res);
  if (!body) return;
  const user = req.user!;
  db.prepare(
    `INSERT INTO usage (user_id, day, seconds) VALUES (?, ?, ?)
     ON CONFLICT(user_id, day) DO UPDATE SET seconds = seconds + excluded.seconds`,
  ).run(user.id, dayKey(Date.now()), body.seconds);
  const used = usageToday(user.id);
  const limit = user.daily_limit_min * 60;
  res.json({ usedSec: used, limitSec: limit, remainingSec: Math.max(0, limit - used), restMode: used >= limit });
});

function restGuard(user: User, res: Response): boolean {
  if (usageToday(user.id) >= user.daily_limit_min * 60) {
    res.status(423).json({ error: "rest_mode", message: `${user.pet_name}는 오늘 충분히 놀았어요. 내일 또 만나요!` });
    return true;
  }
  return false;
}

const TouchBody = z.object({
  strokes: z.number().int().min(0).max(200),
  taps: z.number().int().min(0).max(200),
  avgSpeed: z.number().min(0).max(50), // px per ms
  peakRate: z.number().min(0).max(60), // touches per second in the busiest second
  durationMs: z.number().int().min(0).max(120_000),
});

api.post("/pet/touch", (req, res) => {
  const body = parse(TouchBody, req, res);
  if (!body) return;
  const user = req.user!;
  if (restGuard(user, res)) return;
  const now = Date.now();
  const rough = body.peakRate >= 7 || body.avgSpeed > 3.2 || (body.taps >= 8 && body.strokes === 0 && body.durationMs < 2500);
  const intensity = Math.min(1, body.avgSpeed / 4 + body.peakRate / 14);
  let pet = loadPet(user.id, now);
  let reward = { coins: 0, gems: 0 };
  let line: string;
  if (rough) {
    pet = react({ ...pet, intimacy: Math.max(0, pet.intimacy - 0.4) }, "hurt", 6, now);
    line = "아야… 조금만 살살 해줄래? 🥺";
  } else {
    pet = react({ ...pet, intimacy: Math.min(100, pet.intimacy + (body.strokes > 0 ? 0.7 : 0.35)) }, "happy", 8, now);
    reward = grant(user.id, "pat", 5, 2, 0, now);
    line = body.strokes > 2 ? "헤헤, 기분 좋아~ 💕" : "간지러워! 헤헤";
  }
  savePet(pet);
  logEvent(user.id, "touch", { ...body, rough, intensity: Math.round(intensity * 100) / 100 }, now);
  res.json({ rough, line, reward, ...state(refreshUser(user.id), now) });
});

api.post("/pet/feed", (req, res) => {
  const body = parse(z.object({ food: z.enum(Object.keys(FOODS) as [FoodId]) }), req, res);
  if (!body) return;
  const user = req.user!;
  if (restGuard(user, res)) return;
  const now = Date.now();
  const food = FOODS[body.food];
  let pet = loadPet(user.id, now);
  if (pet.fullness >= 95) {
    pet = react(pet, "calm", 4, now);
    savePet(pet);
    return res.json({ refused: true, line: "배불러… 조금 이따 먹을래!", ...state(refreshUser(user.id), now) });
  }
  if (food.price > user.coins) return res.status(402).json({ error: "not_enough_coins", message: "코인이 부족해요" });
  const meal = mealFor(now);
  // Only the first feeding inside a meal window counts toward the routine.
  const alreadyFed =
    meal &&
    (db
      .prepare(
        "SELECT 1 FROM events WHERE user_id = ? AND type = 'feed' AND created_at >= ? AND json_extract(data, '$.slot') = ?",
      )
      .get(user.id, now - 5 * 3_600_000, meal.slot) as unknown);
  const slot = meal && !alreadyFed ? meal.slot : null;
  tx(() => {
    if (food.price) db.prepare("UPDATE users SET coins = coins - ? WHERE id = ?").run(food.price, user.id);
    pet = react(
      { ...pet, fullness: Math.min(100, pet.fullness + food.fullness), intimacy: Math.min(100, pet.intimacy + food.intimacy) },
      "happy",
      7,
      now,
    );
    savePet(pet);
  });
  logEvent(user.id, "feed", { food: body.food, slot, delayMin: slot ? meal!.delayMin : null }, now);
  const onTime = slot !== null && meal!.delayMin <= 60;
  const reward = onTime ? grant(user.id, "meal_on_time", 2, 10, 0, now) : { coins: 0, gems: 0 };
  const lines: Record<FoodId, string> = {
    kibble: "냠냠, 든든하다!",
    carrot: "당근이다! 내가 제일 좋아하는 거 🥕",
    meat: "우와 고기! 오늘 무슨 날이야?",
    broccoli: "브로콜리도 잘 먹어야지… 냠!",
  };
  res.json({ line: onTime ? `${lines[body.food]} 딱 밥 먹을 시간이었어!` : lines[body.food], reward, onTime, ...state(refreshUser(user.id), now) });
});

api.post("/pet/play", (req, res) => {
  const body = parse(
    z.object({ game: z.enum(["carrot_catch", "bubble_pop"]), score: z.number().int().min(0).max(500), durationMs: z.number().int().min(0).max(300_000) }),
    req,
    res,
  );
  if (!body) return;
  const user = req.user!;
  if (restGuard(user, res)) return;
  const now = Date.now();
  let pet = loadPet(user.id, now);
  if (pet.energy < 12) return res.json({ refused: true, line: "너무 졸려… 조금 쉬었다 놀자 😪", ...state(refreshUser(user.id), now) });
  pet = react(
    { ...pet, energy: Math.max(0, pet.energy - 14), fullness: Math.max(0, pet.fullness - 5), intimacy: Math.min(100, pet.intimacy + 1.2) },
    "excited",
    8,
    now,
  );
  savePet(pet);
  logEvent(user.id, "play", body, now);
  const reward = grant(user.id, "play", 3, Math.min(30, 5 + Math.floor(body.score / 3)), 0, now);
  res.json({ line: "같이 노니까 너무 재밌다!", reward, ...state(refreshUser(user.id), now) });
});

api.post("/pet/equip", (req, res) => {
  const body = parse(z.object({ itemId: z.string().max(40) }), req, res);
  if (!body) return;
  const user = req.user!;
  const item = itemById(body.itemId);
  if (!item || item.kind === "food") return res.status(404).json({ error: "not_found" });
  const owned = db.prepare("SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?").get(user.id, item.id);
  if (!owned) return res.status(403).json({ error: "not_owned" });
  const now = Date.now();
  let pet = loadPet(user.id, now);
  if (item.kind === "theme") {
    pet = { ...pet, theme: item.id.replace("theme_", "") };
  } else {
    const eq = JSON.parse(pet.equipped) as Record<string, string>;
    if (eq[item.slot!] === item.id) delete eq[item.slot!];
    else eq[item.slot!] = item.id;
    pet = react({ ...pet, equipped: JSON.stringify(eq) }, "happy", 5, now);
  }
  savePet(pet);
  logEvent(user.id, "dress", { item: item.id }, now);
  res.json(state(refreshUser(user.id), now));
});

api.post("/shop/buy", (req, res) => {
  const body = parse(z.object({ itemId: z.string().max(40) }), req, res);
  if (!body) return;
  const user = req.user!;
  const item = itemById(body.itemId);
  if (!item || item.kind === "food") return res.status(404).json({ error: "not_found" });
  const owned = db.prepare("SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?").get(user.id, item.id);
  if (owned) return res.status(409).json({ error: "already_owned", message: "이미 가지고 있어요" });
  const balance = item.currency === "coins" ? user.coins : user.gems;
  if (balance < item.price)
    return res.status(402).json({ error: "not_enough", message: item.currency === "coins" ? "코인이 부족해요" : "보석이 부족해요" });
  tx(() => {
    db.prepare(`UPDATE users SET ${item.currency} = ${item.currency} - ? WHERE id = ?`).run(item.price, user.id);
    db.prepare("INSERT INTO inventory (user_id, item_id, acquired_at) VALUES (?, ?, ?)").run(user.id, item.id, Date.now());
  });
  res.json(state(refreshUser(user.id)));
});

// ---------- chat ----------

const recentChat = new Map<string, number[]>();
function chatRateLimited(userId: string, now: number) {
  const hits = (recentChat.get(userId) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recentChat.set(userId, hits);
  return hits.length > 12;
}

api.get("/chat", (req, res) => {
  const rows = db
    .prepare("SELECT id, role, content, emotion, risk, created_at FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT 60")
    .all(req.user!.id) as { id: number; role: string; content: string; emotion: string | null; risk: string; created_at: number }[];
  res.json({ messages: rows.reverse().map((r) => ({ id: r.id, role: r.role, content: r.content, risk: r.risk, at: r.created_at })) });
});

api.post("/chat", async (req, res) => {
  const body = parse(z.object({ text: z.string().trim().min(1).max(500) }), req, res);
  if (!body) return;
  const user = req.user!;
  const now = Date.now();
  if (restGuard(user, res)) return;
  if (chatRateLimited(user.id, now)) return res.status(429).json({ error: "slow_down", message: "조금만 천천히 이야기해 줘!" });

  const text = redactPII(body.text);
  const pet = loadPet(user.id, now);
  const view = petView(pet, now);
  const risk = assessRisk(text);

  const insertMsg = db.prepare("INSERT INTO messages (user_id, role, content, emotion, risk, created_at) VALUES (?, ?, ?, ?, ?, ?)");
  let reply: string;
  let petMood: Mood;
  let emotion: Emotion;
  let intensity: number;
  let finalRisk = risk;

  if (risk === "high") {
    reply = crisisReply(user.pet_name);
    petMood = "worried";
    emotion = "sad";
    intensity = 1;
  } else {
    const history = (
      db.prepare("SELECT role, content FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT 12").all(user.id) as {
        role: "user" | "assistant";
        content: string;
      }[]
    ).reverse();
    const diary = db.prepare("SELECT content FROM diary WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(user.id) as
      | { content: string }
      | undefined;
    const h = local(now).hour;
    const out = await companionReply(
      {
        petName: user.pet_name,
        species: CHARACTERS[user.character as keyof typeof CHARACTERS]?.name ?? "토끼",
        nickname: user.nickname,
        ageGroup: user.age_group,
        relationship: view.relationship.label,
        petMood: view.moodLabel,
        fullness: view.fullness,
        energy: view.energy,
        timeOfDay: h < 6 ? "새벽" : h < 12 ? "아침" : h < 18 ? "오후" : h < 22 ? "저녁" : "밤",
        recentDiary: diary?.content.slice(0, 120),
      },
      history,
      text,
    );
    reply = out.reply;
    petMood = out.petMood;
    emotion = out.userEmotion;
    intensity = out.intensity;
    if (out.risk === "high") {
      finalRisk = "high";
      reply = `${reply}\n\n${crisisReply(user.pet_name)}`;
    } else if (out.risk === "watch" && finalRisk === "none") finalRisk = "watch";
  }

  tx(() => {
    insertMsg.run(user.id, "user", text, emotion, finalRisk, now);
    insertMsg.run(user.id, "assistant", reply, null, "none", now + 1);
    const next = react({ ...pet, intimacy: Math.min(100, pet.intimacy + 0.4) }, petMood, 10, now);
    savePet(next);
  });
  logEvent(user.id, "chat", { emotion, intensity, risk: finalRisk, length: text.length }, now);
  const reward = grant(user.id, "chat", 3, 3, 0, now);
  res.json({
    reply,
    emotion: { key: emotion, label: EMOTION_LABEL[emotion], intensity },
    risk: finalRisk,
    helplines: finalRisk !== "none" ? HELPLINES : undefined,
    reward,
    ...state(refreshUser(user.id), now),
  });
});

// ---------- diary ----------

const DiaryBody = z.object({
  content: z.string().trim().min(1, "내용을 적어주세요").max(1000),
  mood: z.enum(["joy", "calm", "sad", "anxious", "angry", "tired", "lonely"]),
});

api.get("/diary", (req, res) => {
  const month = typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month) ? req.query.month : dayKey(Date.now()).slice(0, 7);
  const rows = db
    .prepare("SELECT id, day, content, mood, created_at FROM diary WHERE user_id = ? AND day LIKE ? ORDER BY created_at DESC")
    .all(req.user!.id, `${month}%`);
  res.json({ month, entries: rows });
});

api.post("/diary", (req, res) => {
  const body = parse(DiaryBody, req, res);
  if (!body) return;
  const user = req.user!;
  const now = Date.now();
  const content = redactPII(body.content);
  const risk = assessRisk(content);
  const info = db
    .prepare("INSERT INTO diary (user_id, day, content, mood, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(user.id, dayKey(now), content, body.mood, now);
  logEvent(user.id, "diary", { mood: body.mood, length: content.length, risk }, now);
  if (risk !== "none") {
    db.prepare("INSERT INTO messages (user_id, role, content, emotion, risk, created_at) VALUES (?, 'user', ?, ?, ?, ?)").run(
      user.id,
      "[일기]",
      body.mood,
      risk,
      now,
    );
  }
  const reward = grant(user.id, "diary", 1, 0, 1, now);
  const responses: Record<string, string> = {
    joy: "오늘 좋은 일이 있었구나! 읽는 나도 행복해져 ✨",
    calm: "잔잔한 하루였네. 기록해 줘서 고마워.",
    sad: "속상한 마음 적어줘서 고마워. 오늘은 푹 쉬자.",
    anxious: "걱정되는 마음, 적고 나니 조금 가벼워졌길 바라.",
    angry: "화났던 마음도 잘 적었어. 정말 잘했어.",
    tired: "오늘 정말 수고했어. 따뜻하게 자자.",
    lonely: "나는 늘 여기 있어. 내일도 이야기해 줘.",
  };
  res.status(201).json({
    id: Number(info.lastInsertRowid),
    line: responses[body.mood],
    risk,
    helplines: risk !== "none" ? HELPLINES : undefined,
    reward,
    ...state(refreshUser(user.id), now),
  });
});

api.delete("/diary/:id", (req, res) => {
  db.prepare("DELETE FROM diary WHERE id = ? AND user_id = ?").run(Number(req.params.id), req.user!.id);
  res.json({ ok: true });
});

// ---------- analysis ----------

api.get("/analysis/behavior", (req, res) => {
  const days = Math.min(30, Math.max(3, Number(req.query.days ?? 7) || 7));
  res.json(behavior(req.user!.id, days));
});

api.get("/analysis/report", (req, res) => {
  const days = Math.min(30, Math.max(3, Number(req.query.days ?? 7) || 7));
  res.json(report(req.user!.id, days));
});

api.get("/analysis/routine", (req, res) => res.json(routine(req.user!.id)));

// ---------- settings & privacy ----------

api.patch("/settings", (req, res) => {
  const body = parse(
    z.object({
      petName: z.string().trim().min(1).max(10).optional(),
      nickname: z.string().trim().min(1).max(12).optional(),
      dailyLimitMin: z.number().int().min(10).max(120).optional(),
    }),
    req,
    res,
  );
  if (!body) return;
  const user = req.user!;
  db.prepare("UPDATE users SET pet_name = ?, nickname = ?, daily_limit_min = ? WHERE id = ?").run(
    body.petName ?? user.pet_name,
    body.nickname ?? user.nickname,
    body.dailyLimitMin ?? user.daily_limit_min,
    user.id,
  );
  res.json(state(refreshUser(user.id)));
});

api.delete("/account", (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.user!.id);
  res.json({ ok: true });
});

export { MOOD_LABEL };
