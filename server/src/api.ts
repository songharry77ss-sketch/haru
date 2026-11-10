import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { one, query } from "./db.js";
import { code, newToken, requireUser, sha256, userById, type User } from "./auth.js";
import { CHARACTERS, FOODS, ITEMS, STARTER_ITEMS, itemById, relationship, type FoodId } from "./catalog.js";
import { dailyQuests, grant, loadPet, logEvent, petView, react, savePet, type Mood, type PetRow } from "./pet.js";
import { behavior, loadWindow, report, routine } from "./analysis.js";
import { companionReply, llmEnabled } from "./llm.js";
import { EMOTION_LABEL, HELPLINES, assessRisk, crisisReply, redactPII, type Emotion } from "./safety.js";
import { dayKey, dayStart, isLateNight, local, mealFor } from "./time.js";

const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 40);

export const api = express.Router();

/** Express 4 does not forward rejected promises to the error handler; this does. */
const h =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

const parse = <T extends z.ZodTypeAny>(schema: T, req: Request, res: Response): z.infer<T> | null => {
  const r = schema.safeParse(req.body ?? {});
  if (!r.success) {
    res.status(400).json({ error: "invalid_request", detail: r.error.issues.map((i) => i.message).join(", ") });
    return null;
  }
  return r.data;
};

async function usageToday(userId: string, now = Date.now()) {
  const row = await one<{ seconds: number }>("SELECT seconds FROM usage WHERE user_id = ? AND day = ?", [userId, dayKey(now)]);
  return row?.seconds ?? 0;
}

/** The full client state. Pass `pet` when the caller already holds the freshly saved row. */
async function state(userId: string, now = Date.now(), pet?: PetRow) {
  const [user, petRow, inventory, used, quests] = await Promise.all([
    userById(userId),
    pet ? Promise.resolve(pet) : loadPet(userId, now),
    query<{ item_id: string }>("SELECT item_id FROM inventory WHERE user_id = ?", [userId]),
    usageToday(userId, now),
    dailyQuests(userId, now),
  ]);
  if (!user) throw new Error(`user ${userId} disappeared`);
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
    pet: petView(petRow, now),
    inventory: inventory.map((r) => r.item_id),
    usage: { usedSec: used, limitSec: limit, remainingSec: Math.max(0, limit - used), restMode: used >= limit },
    quests,
    ai: llmEnabled() ? "model" : "offline",
  };
}

// ---------- public ----------

api.get(
  "/health",
  h(async (_req, res) => {
    await query("SELECT 1");
    res.json({ ok: true, ai: llmEnabled() ? "model" : "offline" });
  }),
);

api.get("/catalog", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({ characters: Object.values(CHARACTERS), items: ITEMS, foods: Object.values(FOODS), helplines: HELPLINES });
});

const RegisterBody = z.object({
  nickname: z.string().trim().min(1, "이름을 알려주세요").max(12),
  ageGroup: z.enum(["child", "teen", "adult"]).default("teen"),
  character: z.enum(Object.keys(CHARACTERS) as [keyof typeof CHARACTERS]),
  petName: z.string().trim().min(1).max(10),
});

api.post(
  "/auth/register",
  h(async (req, res) => {
    const body = parse(RegisterBody, req, res);
    if (!body) return;
    const now = Date.now();
    const id = crypto.randomUUID();
    const token = newToken();
    // One statement creates the account, its pet and the starter items together — or nothing at all.
    await query(
      `WITH u AS (
         INSERT INTO users (id, token_hash, recovery_code, guardian_code, nickname, age_group, character, pet_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id
       ), p AS (
         INSERT INTO pets (user_id, equipped, last_tick) SELECT id, ?::text, ?::bigint FROM u
       )
       INSERT INTO inventory (user_id, item_id, acquired_at)
       SELECT u.id, i.item_id, ?::bigint FROM u CROSS JOIN (VALUES ${STARTER_ITEMS.map(() => "(?::text)").join(", ")}) AS i(item_id)`,
      [
        id, sha256(token), `HARU-${code(3)}`, code(2), body.nickname, body.ageGroup, body.character, body.petName, now,
        JSON.stringify({ hat: "ribbon" }), now,
        now, ...STARTER_ITEMS,
      ],
    );
    await logEvent(id, "session", { hour: local(now).hour, first: true }, now);
    await grant(id, "checkin", 1, 30, 0, now);
    res.status(201).json({ token, ...(await state(id, now)) });
  }),
);

api.post(
  "/auth/restore",
  h(async (req, res) => {
    const body = parse(z.object({ recoveryCode: z.string().trim().min(6).max(24) }), req, res);
    if (!body) return;
    const token = newToken();
    // Issuing a new token signs the old device out, so a lost phone cannot keep reading the diary.
    const row = await one<{ id: string }>("UPDATE users SET token_hash = ? WHERE recovery_code = ? RETURNING id", [
      sha256(token),
      body.recoveryCode.toUpperCase(),
    ]);
    if (!row) return res.status(404).json({ error: "not_found" });
    res.json({ token, ...(await state(row.id)) });
  }),
);

// Guardians see trends and safety signals only — never the child's messages or diary text.
api.get(
  "/guardian/:code",
  h(async (req, res) => {
    const user = await one<User>(
      "SELECT id, nickname, pet_name, daily_limit_min, created_at FROM users WHERE guardian_code = ?",
      [String(req.params.code).toUpperCase()],
    );
    if (!user) return res.status(404).json({ error: "not_found" });
    const now = Date.now();
    const [alerts, pet, w] = await Promise.all([
      query<{ risk: string; created_at: number }>(
        `SELECT risk, created_at FROM messages
          WHERE user_id = ? AND role = 'user' AND risk <> 'none' AND created_at >= ?
          ORDER BY created_at DESC LIMIT 20`,
        [user.id, now - 14 * 86_400_000],
      ),
      loadPet(user.id, now),
      loadWindow(user.id, user.created_at, 7, now),
    ]);
    res.json({
      nickname: user.nickname,
      petName: user.pet_name,
      relationship: relationship(pet.intimacy),
      report: report(w),
      behavior: behavior(w),
      alerts: alerts.map((a) => ({ level: a.risk, day: dayKey(a.created_at), hour: local(a.created_at).hour })),
      helplines: HELPLINES,
      dailyLimitMin: user.daily_limit_min,
    });
  }),
);

// ---------- authenticated ----------

api.use(requireUser);

api.get(
  "/me",
  h(async (req, res) => {
    const user = req.user!;
    const now = Date.now();
    const last = await one<{ created_at: number }>(
      "SELECT created_at FROM events WHERE user_id = ? AND type = 'session' ORDER BY created_at DESC LIMIT 1",
      [user.id],
    );
    // A new "visit" is any return after 20 minutes away; it feeds the access-pattern variable.
    if (!last || now - last.created_at > 20 * 60_000) {
      await logEvent(user.id, "session", { hour: local(now).hour, lateNight: isLateNight(now) }, now);
    }
    const reward = await grant(user.id, "checkin", 1, 30, 0, now);
    res.json({ ...(await state(user.id, now)), reward: reward.coins ? reward : undefined });
  }),
);

api.post(
  "/usage/heartbeat",
  h(async (req, res) => {
    const body = parse(z.object({ seconds: z.number().int().min(1).max(120) }), req, res);
    if (!body) return;
    const user = req.user!;
    const row = await one<{ seconds: number }>(
      `INSERT INTO usage (user_id, day, seconds) VALUES (?, ?, ?)
       ON CONFLICT (user_id, day) DO UPDATE SET seconds = usage.seconds + excluded.seconds
       RETURNING seconds`,
      [user.id, dayKey(Date.now()), body.seconds],
    );
    const used = row?.seconds ?? 0;
    const limit = user.daily_limit_min * 60;
    res.json({ usedSec: used, limitSec: limit, remainingSec: Math.max(0, limit - used), restMode: used >= limit });
  }),
);

/** "건강한 이별": once today's time is used up, care actions wait until tomorrow. */
async function resting(user: User, res: Response): Promise<boolean> {
  if ((await usageToday(user.id)) < user.daily_limit_min * 60) return false;
  res.status(423).json({ error: "rest_mode", message: `${user.pet_name}는 오늘 충분히 놀았어요. 내일 또 만나요!` });
  return true;
}

const TouchBody = z.object({
  strokes: z.number().int().min(0).max(200),
  taps: z.number().int().min(0).max(200),
  avgSpeed: z.number().min(0).max(50), // px per ms
  peakRate: z.number().min(0).max(60), // touches per second in the busiest second
  durationMs: z.number().int().min(0).max(120_000),
});

api.post(
  "/pet/touch",
  h(async (req, res) => {
    const body = parse(TouchBody, req, res);
    if (!body) return;
    const user = req.user!;
    if (await resting(user, res)) return;
    const now = Date.now();
    const rough = body.peakRate >= 7 || body.avgSpeed > 3.2 || (body.taps >= 8 && body.strokes === 0 && body.durationMs < 2500);
    const intensity = Math.min(1, body.avgSpeed / 4 + body.peakRate / 14);
    let pet = await loadPet(user.id, now);
    let reward = { coins: 0, gems: 0 };
    let line: string;
    if (rough) {
      pet = react({ ...pet, intimacy: Math.max(0, pet.intimacy - 0.4) }, "hurt", 6, now);
      line = "아야… 조금만 살살 해줄래? 🥺";
    } else {
      pet = react({ ...pet, intimacy: Math.min(100, pet.intimacy + (body.strokes > 0 ? 0.7 : 0.35)) }, "happy", 8, now);
      line = body.strokes > 2 ? "헤헤, 기분 좋아~ 💕" : "간지러워! 헤헤";
    }
    await Promise.all([
      savePet(pet),
      logEvent(user.id, "touch", { ...body, rough, intensity: Math.round(intensity * 100) / 100 }, now),
    ]);
    if (!rough) reward = await grant(user.id, "pat", 5, 2, 0, now);
    res.json({ rough, line, reward, ...(await state(user.id, now, pet)) });
  }),
);

const FEED_LINES: Record<FoodId, string> = {
  kibble: "냠냠, 든든하다!",
  carrot: "당근이다! 내가 제일 좋아하는 거 🥕",
  meat: "우와 고기! 오늘 무슨 날이야?",
  broccoli: "브로콜리도 잘 먹어야지… 냠!",
};

api.post(
  "/pet/feed",
  h(async (req, res) => {
    const body = parse(z.object({ food: z.enum(Object.keys(FOODS) as [FoodId]) }), req, res);
    if (!body) return;
    const user = req.user!;
    if (await resting(user, res)) return;
    const now = Date.now();
    const food = FOODS[body.food];
    let pet = await loadPet(user.id, now);
    if (pet.fullness >= 95) {
      pet = react(pet, "calm", 4, now);
      await savePet(pet);
      return res.json({ refused: true, line: "배불러… 조금 이따 먹을래!", ...(await state(user.id, now, pet)) });
    }
    if (food.price > 0) {
      // Pay only if the balance covers it, in the same statement that checks it.
      const paid = await one("UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ? RETURNING id", [food.price, user.id, food.price]);
      if (!paid) return res.status(402).json({ error: "not_enough_coins", message: "코인이 부족해요" });
    }
    const meal = mealFor(now);
    // Only the first feeding inside a meal window counts toward the routine.
    const alreadyFed =
      meal &&
      (await one(
        `SELECT 1 AS fed FROM events
          WHERE user_id = ? AND type = 'feed' AND created_at >= ? AND (data::jsonb)->>'slot' = ? LIMIT 1`,
        [user.id, now - 5 * 3_600_000, meal.slot],
      ));
    const slot = meal && !alreadyFed ? meal.slot : null;
    pet = react(
      { ...pet, fullness: Math.min(100, pet.fullness + food.fullness), intimacy: Math.min(100, pet.intimacy + food.intimacy) },
      "happy",
      7,
      now,
    );
    await Promise.all([savePet(pet), logEvent(user.id, "feed", { food: body.food, slot, delayMin: slot ? meal!.delayMin : null }, now)]);
    const onTime = slot !== null && meal!.delayMin <= 60;
    const reward = onTime ? await grant(user.id, "meal_on_time", 2, 10, 0, now) : { coins: 0, gems: 0 };
    res.json({
      line: onTime ? `${FEED_LINES[body.food]} 딱 밥 먹을 시간이었어!` : FEED_LINES[body.food],
      reward,
      onTime,
      ...(await state(user.id, now, pet)),
    });
  }),
);

api.post(
  "/pet/play",
  h(async (req, res) => {
    const body = parse(
      z.object({ game: z.enum(["carrot_catch", "bubble_pop"]), score: z.number().int().min(0).max(500), durationMs: z.number().int().min(0).max(300_000) }),
      req,
      res,
    );
    if (!body) return;
    const user = req.user!;
    if (await resting(user, res)) return;
    const now = Date.now();
    let pet = await loadPet(user.id, now);
    if (pet.energy < 12) return res.json({ refused: true, line: "너무 졸려… 조금 쉬었다 놀자 😪", ...(await state(user.id, now, pet)) });
    pet = react(
      { ...pet, energy: Math.max(0, pet.energy - 14), fullness: Math.max(0, pet.fullness - 5), intimacy: Math.min(100, pet.intimacy + 1.2) },
      "excited",
      8,
      now,
    );
    await Promise.all([savePet(pet), logEvent(user.id, "play", body, now)]);
    const reward = await grant(user.id, "play", 3, Math.min(30, 5 + Math.floor(body.score / 3)), 0, now);
    res.json({ line: "같이 노니까 너무 재밌다!", reward, ...(await state(user.id, now, pet)) });
  }),
);

const ItemBody = z.object({ itemId: z.string().max(40) });
const owns = (userId: string, itemId: string) => one("SELECT 1 AS own FROM inventory WHERE user_id = ? AND item_id = ?", [userId, itemId]);

api.post(
  "/pet/equip",
  h(async (req, res) => {
    const body = parse(ItemBody, req, res);
    if (!body) return;
    const user = req.user!;
    const item = itemById(body.itemId);
    if (!item || item.kind === "food") return res.status(404).json({ error: "not_found" });
    if (!(await owns(user.id, item.id))) return res.status(403).json({ error: "not_owned" });
    const now = Date.now();
    let pet = await loadPet(user.id, now);
    if (item.kind === "theme") {
      pet = { ...pet, theme: item.id.replace("theme_", "") };
    } else {
      const eq = JSON.parse(pet.equipped) as Record<string, string>;
      if (eq[item.slot!] === item.id) delete eq[item.slot!];
      else eq[item.slot!] = item.id;
      pet = react({ ...pet, equipped: JSON.stringify(eq) }, "happy", 5, now);
    }
    await Promise.all([savePet(pet), logEvent(user.id, "dress", { item: item.id }, now)]);
    res.json(await state(user.id, now, pet));
  }),
);

api.post(
  "/shop/buy",
  h(async (req, res) => {
    const body = parse(ItemBody, req, res);
    if (!body) return;
    const user = req.user!;
    const item = itemById(body.itemId);
    if (!item || item.kind === "food") return res.status(404).json({ error: "not_found" });
    if (await owns(user.id, item.id)) return res.status(409).json({ error: "already_owned", message: "이미 가지고 있어요" });
    // `currency` comes from the catalog ("coins" | "gems"), never from the request. Paying and receiving the
    // item happen in one statement, so a double tap cannot charge twice or leave a paid-for item missing.
    const col = item.currency;
    const bought = await one(
      `WITH pay AS (
         UPDATE users SET ${col} = ${col} - ? WHERE id = ? AND ${col} >= ? RETURNING id
       )
       INSERT INTO inventory (user_id, item_id, acquired_at)
       SELECT id, ?::text, ?::bigint FROM pay
       ON CONFLICT (user_id, item_id) DO NOTHING
       RETURNING item_id`,
      [item.price, user.id, item.price, item.id, Date.now()],
    );
    if (!bought)
      return res.status(402).json({ error: "not_enough", message: col === "coins" ? "코인이 부족해요" : "보석이 부족해요" });
    res.json(await state(user.id));
  }),
);

// ---------- chat ----------

api.get(
  "/chat",
  h(async (req, res) => {
    const rows = await query<{ id: number; role: string; content: string; risk: string; created_at: number }>(
      "SELECT id, role, content, risk, created_at FROM messages WHERE user_id = ? AND content <> '[일기]' ORDER BY id DESC LIMIT 60",
      [req.user!.id],
    );
    res.json({ messages: rows.reverse().map((r) => ({ id: r.id, role: r.role, content: r.content, risk: r.risk, at: r.created_at })) });
  }),
);

api.post(
  "/chat",
  h(async (req, res) => {
    const body = parse(z.object({ text: z.string().trim().min(1).max(500) }), req, res);
    if (!body) return;
    const user = req.user!;
    const now = Date.now();
    if (await resting(user, res)) return;
    const counts = await one<{ recent: number; today: number }>(
      `SELECT count(*) FILTER (WHERE created_at > ?) AS recent, count(*) AS today
         FROM events WHERE user_id = ? AND type = 'chat' AND created_at >= ?`,
      [now - 60_000, user.id, dayStart(now)],
    );
    if ((counts?.recent ?? 0) >= 12) return res.status(429).json({ error: "slow_down", message: "조금만 천천히 이야기해 줘!" });
    // Cost ceiling: after this many AI replies in a day the pet keeps talking with its built-in replies.
    const allowModel = (counts?.today ?? 0) < AI_DAILY_LIMIT;

    const text = redactPII(body.text);
    const pet = await loadPet(user.id, now);
    const view = petView(pet, now);
    const risk = assessRisk(text);

    let reply: string;
    let petMood: Mood;
    let emotion: Emotion;
    let intensity: number;
    let finalRisk = risk;

    if (risk === "high") {
      // Never left to a model: a fixed, reviewed message with real helplines.
      reply = crisisReply(user.pet_name);
      petMood = "worried";
      emotion = "sad";
      intensity = 1;
    } else {
      const [history, diary] = await Promise.all([
        query<{ role: "user" | "assistant"; content: string }>(
          "SELECT role, content FROM messages WHERE user_id = ? AND content <> '[일기]' ORDER BY id DESC LIMIT 8",
          [user.id],
        ),
        one<{ content: string }>("SELECT content FROM diary WHERE user_id = ? ORDER BY id DESC LIMIT 1", [user.id]),
      ]);
      const hour = local(now).hour;
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
          timeOfDay: hour < 6 ? "새벽" : hour < 12 ? "아침" : hour < 18 ? "오후" : hour < 22 ? "저녁" : "밤",
          recentDiary: diary?.content.slice(0, 120),
        },
        history.reverse(),
        text,
        { allowModel },
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

    const next = react({ ...pet, intimacy: Math.min(100, pet.intimacy + 0.4) }, petMood, 10, now);
    await Promise.all([
      query(
        `INSERT INTO messages (user_id, role, content, emotion, risk, created_at)
         VALUES (?, 'user', ?, ?, ?, ?), (?, 'assistant', ?, NULL, 'none', ?)`,
        [user.id, text, emotion, finalRisk, now, user.id, reply, now + 1],
      ),
      savePet(next),
      logEvent(user.id, "chat", { emotion, intensity, risk: finalRisk, length: text.length }, now),
    ]);
    const reward = await grant(user.id, "chat", 3, 3, 0, now);
    res.json({
      reply,
      emotion: { key: emotion, label: EMOTION_LABEL[emotion], intensity },
      risk: finalRisk,
      helplines: finalRisk !== "none" ? HELPLINES : undefined,
      reward,
      ...(await state(user.id, now, next)),
    });
  }),
);

// ---------- diary ----------

const DiaryBody = z.object({
  content: z.string().trim().min(1, "내용을 적어주세요").max(1000),
  mood: z.enum(["joy", "calm", "sad", "anxious", "angry", "tired", "lonely"]),
});

const DIARY_LINES: Record<Emotion, string> = {
  joy: "오늘 좋은 일이 있었구나! 읽는 나도 행복해져 ✨",
  calm: "잔잔한 하루였네. 기록해 줘서 고마워.",
  sad: "속상한 마음 적어줘서 고마워. 오늘은 푹 쉬자.",
  anxious: "걱정되는 마음, 적고 나니 조금 가벼워졌길 바라.",
  angry: "화났던 마음도 잘 적었어. 정말 잘했어.",
  tired: "오늘 정말 수고했어. 따뜻하게 자자.",
  lonely: "나는 늘 여기 있어. 내일도 이야기해 줘.",
};

api.get(
  "/diary",
  h(async (req, res) => {
    const month =
      typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month) ? req.query.month : dayKey(Date.now()).slice(0, 7);
    const entries = await query(
      "SELECT id, day, content, mood, created_at FROM diary WHERE user_id = ? AND day LIKE ? ORDER BY created_at DESC",
      [req.user!.id, `${month}%`],
    );
    res.json({ month, entries });
  }),
);

api.post(
  "/diary",
  h(async (req, res) => {
    const body = parse(DiaryBody, req, res);
    if (!body) return;
    const user = req.user!;
    const now = Date.now();
    const content = redactPII(body.content);
    const risk = assessRisk(content);
    const row = await one<{ id: number }>(
      "INSERT INTO diary (user_id, day, content, mood, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id",
      [user.id, dayKey(now), content, body.mood, now],
    );
    await logEvent(user.id, "diary", { mood: body.mood, length: content.length, risk }, now);
    if (risk !== "none") {
      // Recorded as a signal for the guardian view. The diary text itself is never copied there.
      await query("INSERT INTO messages (user_id, role, content, emotion, risk, created_at) VALUES (?, 'user', '[일기]', ?, ?, ?)", [
        user.id,
        body.mood,
        risk,
        now,
      ]);
    }
    const reward = await grant(user.id, "diary", 1, 0, 1, now);
    res.status(201).json({
      id: row!.id,
      line: DIARY_LINES[body.mood],
      risk,
      helplines: risk !== "none" ? HELPLINES : undefined,
      reward,
      ...(await state(user.id, now)),
    });
  }),
);

api.delete(
  "/diary/:id",
  h(async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isInteger(id)) await query("DELETE FROM diary WHERE id = ? AND user_id = ?", [id, req.user!.id]);
    res.json({ ok: true });
  }),
);

// ---------- analysis ----------

const windowDays = (req: Request) => Math.min(30, Math.max(3, Math.trunc(Number(req.query.days ?? 7)) || 7));

api.get(
  "/analysis/behavior",
  h(async (req, res) => res.json(behavior(await loadWindow(req.user!.id, req.user!.created_at, windowDays(req))))),
);
api.get(
  "/analysis/report",
  h(async (req, res) => res.json(report(await loadWindow(req.user!.id, req.user!.created_at, windowDays(req))))),
);
api.get(
  "/analysis/routine",
  h(async (req, res) => res.json(routine(await loadWindow(req.user!.id, req.user!.created_at, 7)))),
);

// ---------- settings & privacy ----------

api.patch(
  "/settings",
  h(async (req, res) => {
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
    await query("UPDATE users SET pet_name = ?, nickname = ?, daily_limit_min = ? WHERE id = ?", [
      body.petName ?? user.pet_name,
      body.nickname ?? user.nickname,
      body.dailyLimitMin ?? user.daily_limit_min,
      user.id,
    ]);
    res.json(await state(user.id));
  }),
);

// Deleting the account removes the pet, events, chat, diary and usage with it (ON DELETE CASCADE).
api.delete(
  "/account",
  h(async (req, res) => {
    await query("DELETE FROM users WHERE id = ?", [req.user!.id]);
    res.json({ ok: true });
  }),
);
