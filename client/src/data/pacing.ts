// 경제·진행 속도 수치를 한 곳에 모은다 (재설계 값: docs/ECONOMY.md, 검증: client/tools/econ-sim.mjs)
// 구매 sink(이동 수단·장비·건물·집)와 시뮬레이터 목표값은 pacing-sinks.ts.

/** 등급(0~5)별 둥지 출현 가중치 — 희귀할수록 작다 */
export const RW = [50, 28, 14, 6, 1.6, 0.4];
/** 등급별 강착(성장) 시간 초 */
export const GROW = [8, 15, 30, 60, 120, 240];
/** 등급별 가격 배율 */
export const TIER_MUL = [1, 2, 4, 8, 16, 32];
/** 구역(0~11)별 가격 배율. 구역 풀의 등급 구성(S5·S6·S9 는 높은 등급이 없다)을 보정해 수입이 매끄럽게 오르도록 정했다 */
export const ZONE_MUL = [13, 12, 11, 14, 50, 45, 50, 62, 80, 104, 136, 176];
/** 행성 가격 전체 조정 손잡이 */
export const PRICE_MUL = 1;
/** 행성 가격 = 구역 배율 × 등급 배율. DB 행의 가격 열은 쓰지 않는다 */
export const priceOf = (zone: number, tier: number) => Math.round(ZONE_MUL[zone] * TIER_MUL[tier] * PRICE_MUL);
/** 행성 하나의 초당 수익 = 가격 / INC_DIV (손익분기 = SELL_RATE × INC_DIV 초) */
export const INC_DIV = 600;
/** 문제를 맞혀 얻은 행성의 수익·판매가 배율 */
export const STUDY_MUL = 1.5;
/** 판매가 = 가격 × SELL_RATE × 배율 */
export const SELL_RATE = 0.5;
/** 도감 첫 등록 보상 = 가격 / DEX_REWARD_DIV */
export const DEX_REWARD_DIV = 3;
/** 돌연변이 확률: [거대, 고온] (누적 판정) */
export const MUT_CHANCE = [0.03, 0.12];
/** 초당 총수익 = (기본 + 행성 수익 합) × (1 + 도감 보너스 × 도감 수) */
export const BASE_INC = 1.5,
  DEX_BONUS = 0.02;
export const incomeOf = (planetSum: number, dex: number) => (BASE_INC + planetSum) * (1 + DEX_BONUS * dex);

/** 잡혔을 때 잃는 현금 상한 (비율 손실만 두면 후반에 이동 수단 저축을 통째로 잃는다) */
export const CAUGHT_LOSS_MAX = 20000;

/** 이동 속도 = SPD_BASE + SPD_PER_LV × 신발 Lv + 스프링 보너스 (systems/move.ts 가 이 상수를 쓴다) */
export const SPD_BASE = 14,
  SPD_PER_LV = 0.75;
/** 상점 비용 곡선: 신발 Lv l → l+1 (l=0..29), 기지 칸 n → n+1 (n=6..29), 스프링 i번째 (i=1..24) */
export const spdCost = (l: number) => Math.round(80 * 1.285 ** l),
  slotCost = (n: number) => Math.round(300 * 1.315 ** (n - 6)),
  SPRING_PRICE = (i: number) => Math.round(200 * 1.34 ** (i - 1));
/** 가방 단계별 가격 (운반 수 2~7개) */
export const BAG_PRICE = [300, 2000, 10000, 40000, 120000, 300000];
/** 꾸미기(기지·캐릭터) 표시 가격 배율 — 표의 기준 가격에 곱한다 */
export const COSMETIC_MUL = 4;
