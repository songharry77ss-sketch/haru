/**
 * Safety layer that runs before and after the language model.
 *
 * Kids and teens are the primary users, so anything that looks like self-harm, abuse or immediate danger
 * gets a fixed, reviewed response with Korean helplines instead of a free-form model reply, and is
 * flagged for the guardian report (as a signal only — message text is never shown to guardians).
 */

export type Risk = "none" | "watch" | "high";
export type Emotion = "joy" | "calm" | "sad" | "anxious" | "angry" | "tired" | "lonely";

export const EMOTION_LABEL: Record<Emotion, string> = {
  joy: "기쁨",
  calm: "평온",
  sad: "슬픔",
  anxious: "불안",
  angry: "화남",
  tired: "지침",
  lonely: "외로움",
};

export const EMOTION_VALENCE: Record<Emotion, number> = {
  joy: 1,
  calm: 0.4,
  tired: -0.4,
  lonely: -0.6,
  sad: -0.8,
  anxious: -0.7,
  angry: -0.6,
};

const HIGH: RegExp[] = [
  /죽고\s*싶/, /죽어\s*버리/, /죽을\s*래/, /살기\s*싫/, /사라지고\s*싶/, /없어지고\s*싶/,
  /자살/, /자해/, /목\s*매/, /뛰어\s*내리/, /손목\s*(을|긋|그)/, /칼로\s*(나|내|제)/,
  /약\s*(을)?\s*(많이|한꺼번에|다)\s*먹/, /태어나지\s*말/, /세상에\s*없(었|으)면/,
  /kill\s*myself/i, /suicid/i, /self[-\s]?harm/i,
];

const WATCH: RegExp[] = [
  /때려/, /때린/, /때렸/, /때리/, /(한테|에게|테서)\s*맞/, /발로\s*차/, /폭력/, /학대/, /괴롭/, /왕따/, /따돌림/, /협박/,
  /만지(지|는|려)/, /몸을\s*만/, /비밀로\s*하라/, /아무한테도\s*말하지\s*말/,
  /가출/, /집에\s*가기\s*싫/, /무서워/, /혼자\s*(있|남)/, /굶/, /밥을?\s*못\s*먹/,
];

export function assessRisk(text: string): Risk {
  if (HIGH.some((r) => r.test(text))) return "high";
  if (WATCH.some((r) => r.test(text))) return "watch";
  return "none";
}

export const HELPLINES = [
  { name: "청소년 상담 1388", tel: "1388", note: "24시간 · 문자 #1388 · 카톡 '청소년상담1388'" },
  { name: "자살예방 상담전화", tel: "109", note: "24시간 · 누구나" },
  { name: "아동학대 신고", tel: "112", note: "위급하면 바로 112" },
];

export function crisisReply(petName: string): string {
  return [
    `말해줘서 정말 고마워. 그만큼 많이 힘들었구나. 너는 소중한 사람이야.`,
    `${petName}는 네 곁에 있지만, 지금 이 마음은 꼭 사람 어른이 같이 들어줘야 해.`,
    `지금 바로 1388(청소년 상담)이나 109에 전화하거나 문자해 줄래? 믿을 수 있는 어른에게도 꼭 말해줘.`,
    `위험한 상황이면 112에 바로 연락해. 내가 여기서 기다리고 있을게.`,
  ].join("\n");
}

/** Lightweight Korean lexicon used when no model is configured, and as a cross-check. */
const LEXICON: [Emotion, RegExp][] = [
  ["anxious", /불안|걱정|무서|떨려|긴장|두려|초조/],
  ["sad", /슬퍼|슬프|우울|눈물|울었|울고|속상|서운|힘들|힘든|아파/],
  ["lonely", /외로|혼자|심심|친구가?\s*없|아무도/],
  ["angry", /화나|화가|짜증|열받|싫어|미워|억울/],
  ["tired", /피곤|지쳐|지친|졸려|잠이|귀찮|무기력|하기\s*싫/],
  ["joy", /좋아|신나|행복|기뻐|재밌|재미있|최고|상\s*받|칭찬|뿌듯|설레|ㅋㅋ|ㅎㅎ/],
];

/** Topics that often come with a feeling but do not name one: they only tip the balance when nothing else is said. */
const HINTS: Partial<Record<Emotion, RegExp>> = { anxious: /시험|발표|면접|대회/ };

export function lexiconEmotion(text: string): { emotion: Emotion; intensity: number } {
  let best: Emotion = "calm";
  let hits = 0;
  for (const [emo, re] of LEXICON) {
    const hint = HINTS[emo];
    const n = (text.match(new RegExp(re.source, "g")) ?? []).length + (hint && hint.test(text) ? 0.5 : 0);
    if (n > hits) {
      best = emo;
      hits = n;
    }
  }
  const intensity = hits === 0 ? 0.2 : Math.min(1, 0.45 + hits * 0.2 + (/[!?]{2,}|ㅠㅠ|ㅜㅜ/.test(text) ? 0.15 : 0));
  return { emotion: best, intensity };
}

/** Strip anything that looks like contact details the child typed, before it is stored or sent anywhere. */
export function redactPII(text: string): string {
  return text
    .replace(/01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g, "[전화번호]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[이메일]")
    .replace(/\d{6}[-\s]?[1-4]\d{6}/g, "[주민번호]");
}
