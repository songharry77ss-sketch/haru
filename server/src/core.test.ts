import { test } from "node:test";
import assert from "node:assert/strict";
import { assessRisk, lexiconEmotion, redactPII } from "./safety.js";
import { relationship } from "./catalog.js";
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
