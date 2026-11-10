import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

// Runs the real API against an in-memory embedded Postgres. Set TEST_DATABASE_URL to run the same
// suite through the production driver against any Postgres server.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.AUTO_MIGRATE = "1";
} else {
  delete process.env.DATABASE_URL;
  process.env.DB_FILE = ":memory:";
}
delete process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_AUTH_TOKEN;

let server: Server;
let base = "";
let closeDb: () => Promise<void>;

before(async () => {
  const [{ app, errorHandler }, db] = await Promise.all([import("./app.js"), import("./db.js")]);
  await db.getDb();
  closeDb = db.closeDb;
  app.use(errorHandler);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(async () => {
  await new Promise((ok) => server.close(ok));
  await closeDb();
});

async function call(path: string, opts: { method?: string; body?: unknown; token?: string; origin?: string } = {}) {
  const res = await fetch(base + path, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: {
      ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.origin ? { origin: opts.origin } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, headers: res.headers, json: (await res.json().catch(() => ({}))) as any };
}

const signUp = async (nickname = "지우") =>
  (await call("/auth/register", { body: { nickname, ageGroup: "child", character: "bunny", petName: "하루" } })).json;

const gentle = { strokes: 4, taps: 0, avgSpeed: 0.8, peakRate: 2, durationMs: 3000 };
const rough = { strokes: 0, taps: 12, avgSpeed: 0.5, peakRate: 9, durationMs: 1500 };

test("health reports the database is reachable", async () => {
  const r = await call("/health");
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
});

test("sign-up creates the account, pet, starter items and check-in reward together", async () => {
  const r = await call("/auth/register", { body: { nickname: "지우", ageGroup: "child", character: "bunny", petName: "하루" } });
  assert.equal(r.status, 201);
  assert.ok(r.json.token.length > 20);
  assert.equal(r.json.user.coins, 130); // 100 to start + 30 for the first visit
  assert.deepEqual(r.json.inventory.sort(), ["ribbon", "theme_sunny"]);
  assert.deepEqual(r.json.pet.equipped, { hat: "ribbon" });
  assert.equal(r.json.pet.relationship.label, "낯가림");
  assert.match(r.json.user.recoveryCode, /^HARU-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
});

test("requests without a valid token are rejected", async () => {
  assert.equal((await call("/me")).status, 401);
  assert.equal((await call("/me", { token: "nope" })).status, 401);
  assert.equal((await call("/auth/register", { body: { nickname: "", character: "dragon", petName: "x" } })).status, 400);
});

test("gentle strokes raise intimacy and pay at most five times a day; rough taps hurt", async () => {
  const { token } = await signUp();
  let last: any;
  for (let i = 0; i < 7; i++) last = (await call("/pet/touch", { token, body: gentle })).json;
  assert.equal(last.rough, false);
  assert.equal(last.user.coins, 130 + 5 * 2);
  assert.ok(last.pet.intimacy > 12);
  assert.equal(last.quests.find((q: any) => q.kind === "pat").done, true);

  const hurt = (await call("/pet/touch", { token, body: rough })).json;
  assert.equal(hurt.rough, true);
  assert.equal(hurt.pet.mood, "hurt");
  assert.ok(hurt.pet.intimacy < last.pet.intimacy);
});

test("feeding fills the pet, charges for paid food and refuses when full", async () => {
  const { token, user } = await signUp();
  const fed = (await call("/pet/feed", { token, body: { food: "meat" } })).json;
  assert.equal(fed.pet.fullness, 100);
  assert.ok(fed.user.coins === user.coins - 15 || fed.user.coins === user.coins - 15 + 10); // +10 inside a meal window
  const full = (await call("/pet/feed", { token, body: { food: "carrot" } })).json;
  assert.equal(full.refused, true);
});

test("the shop charges once, never twice, and outfits toggle", async () => {
  const { token, user } = await signUp();
  const bought = await call("/shop/buy", { token, body: { itemId: "bell" } });
  assert.equal(bought.status, 200);
  assert.equal(bought.json.user.coins, user.coins - 80);
  assert.equal((await call("/shop/buy", { token, body: { itemId: "bell" } })).status, 409);
  assert.equal((await call("/shop/buy", { token, body: { itemId: "theme_night" } })).status, 402); // 220 coins, cannot afford
  assert.equal((await call("/pet/equip", { token, body: { itemId: "crown" } })).status, 403); // not owned

  const on = (await call("/pet/equip", { token, body: { itemId: "bell" } })).json;
  assert.equal(on.pet.equipped.neck, "bell");
  const off = (await call("/pet/equip", { token, body: { itemId: "bell" } })).json;
  assert.equal(off.pet.equipped.neck, undefined);
});

test("chat answers offline, hides contact details and escalates crisis language", async () => {
  const { token } = await signUp();
  const calm = (await call("/chat", { token, body: { text: "내일 시험이라 너무 불안해. 내 번호는 010-1234-5678" } })).json;
  assert.equal(calm.emotion.key, "anxious");
  assert.equal(calm.risk, "none");
  assert.ok(calm.reply.length > 0);

  const crisis = (await call("/chat", { token, body: { text: "그냥 죽고 싶어" } })).json;
  assert.equal(crisis.risk, "high");
  assert.match(crisis.reply, /1388/);
  assert.equal(crisis.helplines.length, 3);

  const history = (await call("/chat", { token })).json.messages;
  assert.equal(history.length, 4);
  assert.ok(!JSON.stringify(history).includes("1234-5678"));
  assert.ok(history[0].content.includes("[전화번호]"));
});

test("diary entries are saved, rewarded once a day and deletable", async () => {
  const { token, user } = await signUp();
  const first = await call("/diary", { token, body: { content: "오늘 하루와 산책했다.", mood: "joy" } });
  assert.equal(first.status, 201);
  assert.equal(first.json.user.gems, user.gems + 1);
  const second = (await call("/diary", { token, body: { content: "또 썼다", mood: "calm" } })).json;
  assert.equal(second.user.gems, user.gems + 1);
  assert.equal((await call("/diary", { token })).json.entries.length, 2);
  await call(`/diary/${first.json.id}`, { token, method: "DELETE" });
  assert.equal((await call("/diary", { token })).json.entries.length, 1);
});

test("analysis and the guardian view reflect behaviour without exposing any text", async () => {
  const { token, user } = await signUp("민서");
  for (let i = 0; i < 6; i++) await call("/pet/touch", { token, body: gentle });
  await call("/pet/touch", { token, body: rough });
  await call("/pet/touch", { token, body: gentle });
  await call("/pet/play", { token, body: { game: "carrot_catch", score: 30, durationMs: 30000 } });
  await call("/chat", { token, body: { text: "학교에서 애들이 나를 괴롭혀서 속상해" } });
  await call("/diary", { token, body: { content: "비밀 일기 내용입니다", mood: "sad" } });

  const behavior = (await call("/analysis/behavior", { token })).json;
  assert.equal(behavior.routine.byDay.length, 7);
  assert.equal(behavior.roughTouch.episodes, 1);
  assert.equal(behavior.roughTouch.recovery, 100);
  assert.equal(behavior.balance.axes.find((a: any) => a.key === "touch").count, 8);

  const report = (await call("/analysis/report", { token })).json;
  assert.equal(report.distribution.reduce((a: number, d: any) => a + d.percent, 0) > 97, true);
  assert.equal(report.variables.length, 6);

  const guardian = await call(`/guardian/${user.guardianCode}`);
  assert.equal(guardian.status, 200);
  assert.equal(guardian.json.nickname, "민서");
  assert.equal(guardian.json.alerts[0].level, "watch");
  const raw = JSON.stringify(guardian.json);
  assert.ok(!raw.includes("괴롭혀") && !raw.includes("비밀 일기"));
  assert.equal((await call("/guardian/ZZZZ-ZZZZ")).status, 404);
});

test("the daily limit puts the pet to rest, and a recovery code moves the account to a new device", async () => {
  const { token, user } = await signUp();
  await call("/settings", { token, method: "PATCH", body: { dailyLimitMin: 10 } });
  for (let i = 0; i < 5; i++) await call("/usage/heartbeat", { token, body: { seconds: 120 } });
  const blocked = await call("/pet/touch", { token, body: gentle });
  assert.equal(blocked.status, 423);
  assert.equal((await call("/me", { token })).json.usage.restMode, true);

  const restored = await call("/auth/restore", { body: { recoveryCode: user.recoveryCode.toLowerCase() } });
  assert.equal(restored.status, 200);
  assert.equal((await call("/me", { token })).status, 401); // the old device is signed out
  assert.equal((await call("/me", { token: restored.json.token })).status, 200);
});

test("deleting the account removes everything", async () => {
  const { token, user } = await signUp();
  await call("/chat", { token, body: { text: "안녕" } });
  assert.equal((await call("/account", { token, method: "DELETE" })).status, 200);
  assert.equal((await call("/me", { token })).status, 401);
  assert.equal((await call(`/guardian/${user.guardianCode}`)).status, 404);
});

test("the native apps may call the API cross-origin; other sites may not", async () => {
  const app = await call("/health", { origin: "capacitor://localhost" });
  assert.equal(app.headers.get("access-control-allow-origin"), "capacitor://localhost");
  const other = await call("/health", { origin: "https://evil.example" });
  assert.equal(other.headers.get("access-control-allow-origin"), null);
});
