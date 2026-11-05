// 대륙 지형 데이터 (docs/design/WORLD.md 2장·7.2): 구역별 능선·기복·랜드마크, 도시 북서 언덕. 순수 데이터라 굽기(core/heightmap.ts)와 렌더가 같이 쓴다.
// 구역 id 는 data/sectors.ts 의 id 와 같다 (= 바이옴 id).

/** 도시 허브 반변 (한 변 300, 중심 (0,0)) */
export const CITY_HALF = 335;
/** 구버전 도시(±150, '원도심') 의 반변 — 기존 건물·도로 데이터는 이 안에 그대로 있다 */
export const OLD_HALF = 150;
/** 도시를 넓히며 구역들을 바깥으로 민 거리 */
export const PUSH = 185;
/** 도시 땅은 사각형이 아니라 data/outline.ts 의 CITY_POLY(도심 사진 윤곽). 사각형 ±CITY_HALF 안은 건물·도로, 그 바깥 윤곽까지는 산·숲·해변이다 */
/** 해수면 높이. 도시 남쪽 해변은 이 아래로 완만하게 가라앉는다 */
export const SEA_Y = -4.6;
/** 문 개구 폭 (게이트 아치 크기 — render/gates.ts) */
export const PASS_W = 40;
/** [x0, z0, x1, z1] 사각형 */
export type Rect = [number, number, number, number];

/** 구역 사이 통로는 W6 에서 없어졌다 — 모든 행성 바이옴은 바다 위 독립된 섬이고 이동은 포탈뿐. 호환용 빈 배열 */
export const PASSES: Rect[] = [];

/** 랜드마크 종류 (render/landmarks.ts 가 12가지를 만든다) */
export type LandmarkKind =
  | 'dome' | 'arch' | 'storm' | 'ring' | 'spire' | 'sun'
  | 'obelisk' | 'falls' | 'pillar' | 'crystal' | 'disk' | 'mount';

/** 구역 하나의 지형 정의 */
export interface SectorMap {
  /** 둘레 능선: 높이 h, 폭 w (구역 사각형 안쪽 띠). w 는 포탈 패드 안쪽 거리(PAD_IN) 보다 작아야 한다 */
  ridge: {h: number; w: number};
  /** 분지 기복: 진폭 amp(u) · 주파수 freq · 시드 · ridged(0..1, 클수록 능선 줄기가 뚜렷) */
  relief: {amp: number; freq: number; seed: number; ridged: number};
  /** 둥근 언덕(h>0)/분화구(h<0) n 개: 반지름·높이 범위, 시드로 위치를 정한다 */
  bumps: {n: number; r: [number, number]; h: [number, number]; seed: number};
  /** 색 줄무늬 폭 (높이 정규화 단위, 0 이면 없음) */
  stripe: number;
  /** 큰 구경거리 1개: 구역 중심 기준 위치, 높이, 충돌 반지름 */
  landmark: {kind: LandmarkKind; dx: number; dz: number; h: number; r: number};
}

const R = (h: number, w = 18) => ({h, w});
const B = (n: number, r: [number, number], h: [number, number], seed: number) => ({n, r, h, seed});
export const TERRAIN: Record<string, SectorMap> = {
  solar: {
    ridge: R(13), relief: {amp: 1.6, freq: 0.04, seed: 11, ridged: 0.15}, bumps: B(7, [14, 26], [-4, -2.5], 101), stripe: 0,
    landmark: {kind: 'dome', dx: -40, dz: -46, h: 16, r: 9},
  },
  belt: {
    ridge: R(16), relief: {amp: 3.4, freq: 0.03, seed: 23, ridged: 0.6}, bumps: B(5, [10, 16], [3, 5], 102), stripe: 0.05,
    landmark: {kind: 'arch', dx: 46, dz: 10, h: 34, r: 10},
  },
  jovian: {
    ridge: R(15), relief: {amp: 1.2, freq: 0.03, seed: 37, ridged: 0.1}, bumps: B(4, [20, 30], [2, 3], 103), stripe: 0.12,
    landmark: {kind: 'storm', dx: 30, dz: 50, h: 42, r: 7},
  },
  giants: {
    ridge: R(15), relief: {amp: 1.6, freq: 0.035, seed: 41, ridged: 0.2}, bumps: B(5, [16, 24], [2.5, 4], 104), stripe: 0,
    landmark: {kind: 'ring', dx: -35, dz: 52, h: 14, r: 22},
  },
  kuiper: {
    ridge: R(14), relief: {amp: 2.2, freq: 0.035, seed: 53, ridged: 0.35}, bumps: B(6, [12, 20], [-3, -2], 105), stripe: 0,
    landmark: {kind: 'spire', dx: 36, dz: 48, h: 40, r: 7},
  },
  reddwarf: {
    ridge: R(15), relief: {amp: 2.4, freq: 0.03, seed: 67, ridged: 0.25}, bumps: B(4, [16, 24], [2, 4], 106), stripe: 0.04,
    landmark: {kind: 'sun', dx: -48, dz: 0, h: 44, r: 6},
  },
  exo: {
    ridge: R(14), relief: {amp: 3.2, freq: 0.025, seed: 71, ridged: 0.1}, bumps: B(6, [16, 26], [3, 5], 107), stripe: 0.03,
    landmark: {kind: 'obelisk', dx: -40, dz: 20, h: 32, r: 8},
  },
  hotjup: {
    ridge: R(16), relief: {amp: 3, freq: 0.03, seed: 83, ridged: 0.5}, bumps: B(5, [10, 18], [2, 4], 108), stripe: 0.06,
    landmark: {kind: 'falls', dx: 40, dz: -42, h: 32, r: 10},
  },
  nebula: {
    ridge: R(16), relief: {amp: 2.5, freq: 0.03, seed: 97, ridged: 0.3}, bumps: B(5, [14, 22], [2, 4], 109), stripe: 0,
    landmark: {kind: 'pillar', dx: -40, dz: -46, h: 38, r: 8},
  },
  supernova: {
    ridge: R(18), relief: {amp: 3, freq: 0.03, seed: 109, ridged: 0.7}, bumps: B(9, [6, 11], [3, 6], 110), stripe: 0,
    landmark: {kind: 'crystal', dx: 45, dz: -50, h: 40, r: 10},
  },
  gargantua: {
    ridge: R(15), relief: {amp: 0.8, freq: 0.03, seed: 113, ridged: 0.1}, bumps: B(3, [20, 30], [1.5, 2.5], 111), stripe: 0,
    landmark: {kind: 'disk', dx: -30, dz: -60, h: 34, r: 22},
  },
  alpha: {
    ridge: R(18), relief: {amp: 4.5, freq: 0.02, seed: 127, ridged: 0.2}, bumps: B(7, [18, 30], [4, 7], 112), stripe: 0.02,
    landmark: {kind: 'mount', dx: 40, dz: 0, h: 48, r: 14},
  },
};

/** 도시 북서 언덕 (WORLD 3.1): 중심, 평탄한 정상 반지름, 기슭 반지름, 높이 */
export const CITY_HILL = {x: -105, z: -105, flat: 34, foot: 56, h: 12};

/** 포탈 패드가 문에서 안쪽으로 떨어진 거리: 둘레 능선(폭 ≤ 22) 안쪽의 평지에 놓는다 */
export const PAD_IN = 26;
