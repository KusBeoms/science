// 경제·진행 속도 수치를 한 곳에 모은다 (값은 현행 그대로 — 재설계 시 이 파일만 고친다)

/** 등급(0~5)별 둥지 출현 가중치 — 희귀할수록 작다 */
export const RW = [50, 28, 14, 6, 1.6, 0.4];
/** 등급별 강착(성장) 시간 초 */
export const GROW = [8, 15, 30, 60, 120, 240];
/** 행성 가격 배율 (DB 가격 × PRICE_MUL) */
export const PRICE_MUL = 1;
/** 행성 하나의 초당 수익 = 가격 / INC_DIV */
export const INC_DIV = 25;
/** 문제를 맞혀 얻은 행성의 수익·판매가 배율 */
export const STUDY_MUL = 1.5;
/** 판매가 = 가격 × SELL_RATE × 배율 */
export const SELL_RATE = 0.5;
/** 도감 첫 등록 보상 = 가격 / DEX_REWARD_DIV */
export const DEX_REWARD_DIV = 10;
/** 돌연변이 확률: [거대, 고온] (누적 판정) */
export const MUT_CHANCE = [0.03, 0.12];
/** 초당 총수익 = (기본 + 행성 수익 합) × (1 + 도감 보너스 × 도감 수) */
export const BASE_INC = 1,
  DEX_BONUS = 0.02;
export const incomeOf = (planetSum: number, dex: number) => (BASE_INC + planetSum) * (1 + DEX_BONUS * dex);
/** 상점 비용 곡선: 신발 Lv l → l+1, 기지 칸 n → n+1 */
export const spdCost = (l: number) => Math.floor(80 * 1.8 ** l),
  slotCost = (n: number) => 1000 * 2 ** (n - 6);
