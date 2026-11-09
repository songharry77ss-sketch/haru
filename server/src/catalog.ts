export type Slot = "hat" | "face" | "neck";
export type Currency = "coins" | "gems";

export interface Item {
  id: string;
  name: string;
  kind: "outfit" | "theme" | "food";
  slot?: Slot;
  price: number;
  currency: Currency;
  description: string;
}

export const CHARACTERS = {
  bunny: { id: "bunny", name: "토끼", defaultName: "하루", blurb: "조용하지만 누구보다 잘 들어주는 친구" },
  otter: { id: "otter", name: "수달", defaultName: "모모", blurb: "장난기 많고 웃음이 많은 친구" },
  puppy: { id: "puppy", name: "강아지", defaultName: "콩이", blurb: "언제나 반갑게 꼬리치는 친구" },
  pinkbunny: { id: "pinkbunny", name: "분홍토끼", defaultName: "봄이", blurb: "다정하고 섬세한 친구" },
} as const;
export type CharacterId = keyof typeof CHARACTERS;

export const ITEMS: Item[] = [
  // Outfits
  { id: "ribbon", name: "분홍 리본", kind: "outfit", slot: "hat", price: 0, currency: "coins", description: "처음 만난 날 선물" },
  { id: "straw_hat", name: "밀짚모자", kind: "outfit", slot: "hat", price: 120, currency: "coins", description: "햇살 좋은 날 산책용" },
  { id: "beret", name: "베레모", kind: "outfit", slot: "hat", price: 150, currency: "coins", description: "그림 그리는 날의 모자" },
  { id: "flower_crown", name: "꽃 화관", kind: "outfit", slot: "hat", price: 200, currency: "coins", description: "봄 냄새가 나요" },
  { id: "crown", name: "작은 왕관", kind: "outfit", slot: "hat", price: 6, currency: "gems", description: "오늘의 주인공" },
  { id: "round_glasses", name: "동그란 안경", kind: "outfit", slot: "face", price: 100, currency: "coins", description: "책 읽을 때 딱" },
  { id: "star_glasses", name: "별 선글라스", kind: "outfit", slot: "face", price: 4, currency: "gems", description: "반짝반짝" },
  { id: "red_scarf", name: "빨간 목도리", kind: "outfit", slot: "neck", price: 120, currency: "coins", description: "포근하고 따뜻해요" },
  { id: "bow_tie", name: "나비넥타이", kind: "outfit", slot: "neck", price: 90, currency: "coins", description: "특별한 날엔 멋지게" },
  { id: "bell", name: "방울 목걸이", kind: "outfit", slot: "neck", price: 80, currency: "coins", description: "딸랑딸랑" },
  // Room themes
  { id: "theme_sunny", name: "아침 햇살", kind: "theme", price: 0, currency: "coins", description: "기본 방" },
  { id: "theme_sunset", name: "노을 지는 방", kind: "theme", price: 160, currency: "coins", description: "따뜻한 주황빛" },
  { id: "theme_night", name: "별이 빛나는 밤", kind: "theme", price: 220, currency: "coins", description: "포근한 밤하늘" },
  { id: "theme_blossom", name: "벚꽃 방", kind: "theme", price: 5, currency: "gems", description: "꽃잎이 흩날려요" },
];

export const FOODS = {
  kibble: { id: "kibble", name: "사료", fullness: 28, intimacy: 0.4, price: 0 },
  carrot: { id: "carrot", name: "당근", fullness: 16, intimacy: 0.8, price: 0 },
  meat: { id: "meat", name: "고기", fullness: 34, intimacy: 1.0, price: 15 },
  broccoli: { id: "broccoli", name: "브로콜리", fullness: 14, intimacy: 0.6, price: 0 },
} as const;
export type FoodId = keyof typeof FOODS;

export const itemById = (id: string) => ITEMS.find((i) => i.id === id);

export const STARTER_ITEMS = ["ribbon", "theme_sunny"];

export const RELATIONSHIP_LEVELS = [
  { min: 0, key: "shy", label: "낯가림" },
  { min: 20, key: "friend", label: "친구" },
  { min: 40, key: "close", label: "친한사이" },
  { min: 60, key: "bestie", label: "단짝" },
  { min: 80, key: "bff", label: "베프" },
] as const;

export function relationship(intimacy: number) {
  let idx = 0;
  RELATIONSHIP_LEVELS.forEach((l, i) => {
    if (intimacy >= l.min) idx = i;
  });
  const cur = RELATIONSHIP_LEVELS[idx];
  const next = RELATIONSHIP_LEVELS[idx + 1];
  return {
    index: idx,
    key: cur.key,
    label: cur.label,
    nextLabel: next?.label ?? null,
    progress: next ? (intimacy - cur.min) / (next.min - cur.min) : 1,
  };
}
