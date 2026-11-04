// 구매 sink(이동 수단·장비·건물·집), 해금 게이트, 시뮬레이터 목표값 — 아직 게임 코드가 쓰지 않는 값은
// client/tools/econ-sim.mjs 와 이후 작업(C3 해금 조건, 이동 수단·장비·건물 상점)이 읽는다. 기준 문서: docs/ECONOMY.md

/** 이동 수단 가격: 점프팩, 호버보드, 소형 우주선, 워프 드라이브, 중력 글라이더 */
export const VEHICLE_PRICE = [1500, 12000, 60000, 250000, 400000];
/** 이동 수단 업그레이드 단계 비용 = 수단 가격 × 이 값 (속도·연료·적재 3트랙 공통) */
export const VEHICLE_UPG = [0.03, 0.06, 0.11];
/** 장비 등급 가격 = base × GEAR_STEP^(등급−1): 방호복, 방한복, 방열복, 헬멧 */
export const GEAR_BASE = {protect: 2000, cold: 4000, heat: 20000, helmet: 30000},
  GEAR_STEP = 3;
/** 기지 건물 레벨 가격 = base × BUILD_STEP^(레벨−1): 관측소, 연구소, 금고, 격납고 */
export const BUILD_BASE = {observe: 4000, lab: 8000, vault: 12000, hangar: 20000},
  BUILD_STEP = 3;
/** 엔딩 후 집: 텐트, 오두막, 우주 주택, 성 */
export const HOUSE_PRICE = [800000, 3000000, 9000000, 15000000];

/** 해금 게이트: 구역 진입 조건 도감 수(키 = 진입할 구역 번호 1~12), 신발 Lv */
export const GATE_DEX: Record<number, number> = {2: 6, 5: 20, 8: 35, 11: 60},
  GATE_SPD: Record<number, number> = {3: 3, 9: 15};
/** 시험 실패 뒤 재도전 대기 초 */
export const EXAM_RETRY_SEC = 90;
/** 시험 문이 열리는 최소 체류 = 이 비율 × 구역 목표 체류 (효율 플레이어가 너무 빨리 끝나는 것을 막는 안전망) */
export const ZONE_MIN_STAY_FRAC = 0.6;

/** 구역별 목표 체류 분 / 구역 끝 누적 시각 초 / 누적 수입 / 누적 필수 지출 */
export const ZONE_DWELL_MIN = [45, 45, 60, 60, 45, 60, 45, 45, 60, 60, 60, 45];
export const TARGET_CUM_SEC = [2700, 5400, 9000, 12600, 15300, 18900, 21600, 24300, 27900, 31500, 35100, 37800];
export const TARGET_CUM_INCOME = [
  9248, 22808, 59324, 113093, 195687, 356906, 605681, 961412, 1627451, 2880002, 4697322, 6643501,
];
export const TARGET_CUM_SPEND = [
  5031, 15865, 36288, 85927, 152736, 326372, 517299, 808623, 1372933, 2095896, 3684984, 4911524,
];
