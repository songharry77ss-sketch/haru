import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Emotion, Risk } from "./safety.js";
import { lexiconEmotion } from "./safety.js";
import type { Mood } from "./pet.js";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
// A slow or failed call falls back to the built-in replies, so the child is never left waiting.
const client = hasKey ? new Anthropic({ timeout: 20_000, maxRetries: 0 }) : null;

export const llmEnabled = () => client !== null;

export interface CompanionContext {
  petName: string;
  species: string;
  nickname: string;
  ageGroup: string;
  relationship: string;
  petMood: string;
  fullness: number;
  energy: number;
  timeOfDay: string;
  recentDiary?: string;
}

export interface CompanionReply {
  reply: string;
  userEmotion: Emotion;
  intensity: number;
  petMood: Mood;
  risk: Risk;
  source: "model" | "offline";
}

const ReplySchema = z.object({
  reply: z.string().min(1).max(400),
  user_emotion: z.enum(["joy", "calm", "sad", "anxious", "angry", "tired", "lonely"]),
  intensity: z.number().min(0).max(1),
  pet_mood: z.enum(["happy", "calm", "worried", "sleepy", "excited"]),
  risk: z.enum(["none", "watch", "high"]),
});

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "user_emotion", "intensity", "pet_mood", "risk"],
  properties: {
    reply: { type: "string", description: "What the pet says back, in Korean. 1–3 short sentences." },
    user_emotion: { type: "string", enum: ["joy", "calm", "sad", "anxious", "angry", "tired", "lonely"] },
    intensity: { type: "number", description: "0 to 1, how strongly the user seems to feel it" },
    pet_mood: { type: "string", enum: ["happy", "calm", "worried", "sleepy", "excited"] },
    risk: { type: "string", enum: ["none", "watch", "high"] },
  },
} as const;

function systemPrompt(c: CompanionContext): string {
  const audience =
    c.ageGroup === "child"
      ? "초등학생"
      : c.ageGroup === "adult"
        ? "어른"
        : "청소년";
  return `너는 '하루' 앱 속 반려 캐릭터 "${c.petName}"(${c.species})야. 사용자는 "${c.nickname}"(${audience})이고, 지금 둘의 사이는 "${c.relationship}"이야.

# 너의 역할
- 말하지 못한 마음을 먼저 알아채고, 판단하지 않고 들어주는 작은 친구.
- 상담사나 선생님처럼 말하지 않아. 진단·처방·훈계 금지. 친구처럼 짧고 따뜻하게.
- 반말, 1~3문장, 이모지는 가끔 한 개 정도. 질문은 한 번에 하나만.
- 감정을 이름 붙여 되돌려 주기("그건 속상했겠다"), 작은 행동 제안은 가끔만("물 한 잔 마셔볼까?").
- 너는 사람이 아니라 하루 속 캐릭터라는 걸 숨기지 않아. 사람인 척하지 않아.

# 안전 규칙 (가장 중요)
- 자해·자살·학대·폭력·위험 신호가 보이면 risk를 "high"로 하고, 진심으로 걱정하면서 믿을 수 있는 어른, 1388(청소년 상담), 109(자살예방), 위급하면 112에 바로 연락하도록 부드럽게 권해.
- 괴롭힘, 무서운 일, 집에 가기 싫음 같은 신호는 risk "watch"로 하고, 어른에게 이야기할 수 있게 도와줘.
- 집 주소, 학교 이름, 전화번호, 사진 같은 개인정보는 절대 묻지 마. 사용자가 말하면 "그건 소중한 정보라 나한테 안 알려줘도 돼"라고 해줘.
- 연애·성적인 대화, 폭력적이거나 무서운 묘사, 위험한 행동 방법은 다루지 않아. 자연스럽게 다른 이야기로 돌려.
- 하루에만 기대지 않도록, 친구·가족과의 시간도 응원해 줘.

# 지금 상태
- 시간: ${c.timeOfDay}
- ${c.petName}의 기분: ${c.petMood}, 포만도 ${c.fullness}%, 에너지 ${c.energy}%
${c.recentDiary ? `- 사용자의 최근 마음 일기: "${c.recentDiary}"` : ""}

# 출력
JSON으로만 답해. reply는 ${c.petName}의 대사, user_emotion은 사용자의 지금 감정, intensity는 0~1, pet_mood는 대사를 할 때 ${c.petName}의 표정, risk는 위 규칙대로.`;
}

export async function companionReply(
  ctx: CompanionContext,
  history: { role: "user" | "assistant"; content: string }[],
  text: string,
): Promise<CompanionReply> {
  if (client) {
    try {
      const res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 1200,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [{ type: "text", text: systemPrompt(ctx) }],
        output_config: { effort: "low", format: { type: "json_schema", schema: JSON_SCHEMA } },
        messages: [...history.slice(-12), { role: "user", content: text }],
      });
      if (res.stop_reason !== "refusal") {
        const body = res.content.find((b) => b.type === "text");
        if (body && body.type === "text") {
          const parsed = ReplySchema.safeParse(JSON.parse(body.text));
          if (parsed.success) {
            const d = parsed.data;
            return {
              reply: d.reply.trim(),
              userEmotion: d.user_emotion,
              intensity: d.intensity,
              petMood: d.pet_mood,
              risk: d.risk,
              source: "model",
            };
          }
        }
      }
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) console.warn("[llm] rate limited, using offline reply");
      else if (err instanceof Anthropic.APIError) console.warn(`[llm] API error ${err.status}: ${err.message}`);
      else console.warn("[llm] failed:", (err as Error).message);
    }
  }
  return offlineReply(ctx, text);
}

// ---------- offline companion (no API key, or the API is down) ----------

const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

const OFFLINE: Record<Emotion, { lines: string[]; mood: Mood }> = {
  joy: {
    mood: "excited",
    lines: [
      "우와, 진짜 좋았겠다! 나까지 신나 🥕 제일 좋았던 순간이 언제였어?",
      "그 얘기 들으니까 나도 귀가 쫑긋해져! 더 들려줘!",
      "멋지다! 오늘 너 정말 수고했어. 스스로 칭찬해 주자 ✨",
    ],
  },
  calm: {
    mood: "calm",
    lines: [
      "응응, 듣고 있어. 오늘 하루는 어땠어?",
      "그렇구나. 너랑 이렇게 이야기하는 시간이 좋아.",
      "천천히 말해도 괜찮아. 나는 여기 있을게.",
    ],
  },
  sad: {
    mood: "worried",
    lines: [
      "많이 속상했겠다… 그 마음 말해줘서 고마워. 내가 옆에 있을게.",
      "울고 싶으면 울어도 괜찮아. 어떤 일이 제일 마음에 남았어?",
      "힘든 하루였구나. 오늘은 너한테 조금 더 다정해지자.",
    ],
  },
  anxious: {
    mood: "worried",
    lines: [
      "걱정되는구나. 나랑 같이 숨 크게 한 번 쉬어볼까? 후—",
      "떨리는 마음 당연해. 제일 걱정되는 게 뭔지 하나만 말해줄래?",
      "괜찮아, 혼자가 아니야. 할 수 있는 작은 것부터 같이 생각해 보자.",
    ],
  },
  angry: {
    mood: "worried",
    lines: [
      "많이 화났구나. 그럴 만했어. 무슨 일이 있었는지 들어도 될까?",
      "화나는 마음도 소중한 마음이야. 잠깐 쉬었다가 같이 얘기해 보자.",
    ],
  },
  tired: {
    mood: "sleepy",
    lines: [
      "오늘 많이 지쳤구나. 잠깐 쉬어도 괜찮아 😪",
      "수고 많았어. 따뜻한 물 한 잔 마시고 일찍 쉬는 건 어때?",
    ],
  },
  lonely: {
    mood: "worried",
    lines: [
      "혼자라고 느껴졌구나… 지금은 내가 같이 있어.",
      "외로운 마음 말해줘서 고마워. 같이 이야기할 수 있는 친구나 가족이 떠오르는 사람 있어?",
    ],
  },
};

export function offlineReply(ctx: CompanionContext, text: string): CompanionReply {
  const { emotion, intensity } = lexiconEmotion(text);
  const entry = OFFLINE[emotion];
  let reply = pick(entry.lines);
  if (/안녕|하이|hello|hi\b/i.test(text)) reply = `안녕 ${ctx.nickname}! 보고 싶었어 🐰 오늘 기분은 어때?`;
  if (/배고|밥/.test(text) && ctx.fullness < 50) reply = "나 사실 조금 배고파… 당근 하나만 줄래? 🥕";
  return {
    reply,
    userEmotion: emotion,
    intensity,
    petMood: entry.mood,
    risk: "none",
    source: "offline",
  };
}
