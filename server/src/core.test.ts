import { test } from "node:test";
import assert from "node:assert/strict";
import { assessRisk, lexiconEmotion, redactPII } from "./safety.js";
import { relationship } from "./catalog.js";
import { EXPRESSIONS, offlineReply, toBubbles } from "./llm.js";
import { mealFor } from "./time.js";

const kst = (hhmm: string) => Date.parse(`2026-11-09T${hhmm}:00+09:00`);

test("crisis language is always high risk", () => {
  for (const t of ["진짜 죽고 싶어", "자해했어", "그냥 사라지고 싶다", "I want to kill myself"]) {
    assert.equal(assessRisk(t), "high", t);
  }
});

test("bullying and abuse cues are flagged for attention", () => {
  assert.equal(assessRisk("반 애들이 나를 괴롭혀"), "watch");
  assert.equal(assessRisk("아빠가 때렸어"), "watch");
  assert.equal(assessRisk("오늘 급식 맛있었어"), "none");
  assert.equal(assessRisk("형한테 맞았어"), "watch");
  assert.equal(assessRisk("수학 문제 정답 맞았어!"), "none");
});

test("contact details are masked before storage", () => {
  const out = redactPII("내 번호는 010-1234-5678 이고 메일은 kid@example.com 이야");
  assert.ok(!out.includes("1234"));
  assert.ok(out.includes("[전화번호]") && out.includes("[이메일]"));
});

test("offline emotion lexicon picks the dominant feeling", () => {
  assert.equal(lexiconEmotion("내일 시험이라 너무 불안하고 떨려").emotion, "anxious");
  assert.equal(lexiconEmotion("상 받아서 너무 행복해!").emotion, "joy");
  assert.equal(lexiconEmotion("음").emotion, "calm");
  // A topic word alone hints at worry, but a stated feeling wins over it.
  assert.equal(lexiconEmotion("내일 발표가 있어").emotion, "anxious");
  assert.equal(lexiconEmotion("오늘 수학 시험 봤는데 생각보다 잘 봐서 기분 좋아!").emotion, "joy");
});

test("answers are split into short speech bubbles", () => {
  assert.deepEqual(toBubbles("응응, 듣고 있어."), ["응응, 듣고 있어."]);
  assert.deepEqual(toBubbles("우와, 진짜 좋았겠다! 나까지 신나 🥕 제일 좋았던 순간이 언제였어?"), [
    "우와, 진짜 좋았겠다!",
    "나까지 신나 🥕 제일 좋았던 순간이 언제였어?",
  ]);
  assert.equal(toBubbles("첫 줄\n둘째 줄\n\n셋째 줄\n넷째 줄").length, 4);
  assert.deepEqual(toBubbles("  "), []);
});

test("the built-in companion varies its lines and never suggests anything risky", () => {
  const ctx = { petName: "하루", species: "토끼", nickname: "솔", ageGroup: "teen", relationship: "친구", petMood: "편안함", fullness: 70, energy: 80, timeOfDay: "오후" };
  // Good news about a test is good news, not worry.
  assert.equal(offlineReply(ctx, "오늘 시험 잘 봤어").userEmotion, "joy");
  // Each friend asks for its own snack when hungry.
  assert.match(offlineReply({ ...ctx, species: "수달", fullness: 20 }, "배고파?").reply, /생선/);
  assert.match(offlineReply({ ...ctx, species: "강아지", fullness: 20 }, "밥 먹었어?").reply, /간식/);
  assert.match(offlineReply({ ...ctx, fullness: 20 }, "배고파?").reply, /당근/);
  const first = offlineReply(ctx, "오늘 너무 속상했어");
  assert.equal(first.userEmotion, "sad");
  assert.ok(first.bubbles.length >= 1 && first.reply === first.bubbles.join("\n"));
  assert.ok((EXPRESSIONS as readonly string[]).includes(first.expression));
  for (let i = 0; i < 20; i++) {
    const again = offlineReply(ctx, "오늘 너무 속상했어", [{ role: "assistant", content: first.reply }]);
    assert.notEqual(again.reply, first.reply);
    for (const s of again.suggestions) assert.equal(assessRisk(s), "none");
  }
});

test("relationship levels follow intimacy", () => {
  assert.equal(relationship(5).label, "낯가림");
  assert.equal(relationship(20).label, "친구");
  assert.equal(relationship(61).label, "단짝");
  assert.equal(relationship(100).label, "베프");
});

test("meal windows use Korea time", () => {
  assert.deepEqual(mealFor(kst("08:20")), { slot: "breakfast", delayMin: 20 });
  assert.deepEqual(mealFor(kst("07:30")), { slot: "breakfast", delayMin: 0 });
  assert.equal(mealFor(kst("12:00"))?.slot, "lunch");
  assert.equal(mealFor(kst("16:00")), null);
});
