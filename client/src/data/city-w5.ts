// 도시 5차(W5 FUN): 구역별 정체성 — 구획 좌표와 놀이기구 동선(순수 데이터·수식). 렌더(render/city/fun*.ts)와 상호작용(game/fun*.ts)이 같은 식을 써서 눈에 보이는 것과 타는 것이 어긋나지 않는다.
// 구획(RESERVED)은 data/city-w3.ts 에 줄을 추가해 건물 생성기가 비켜 가게 했다. 공원·테마파크는 처음부터 예약돼 있었다.
export type Rect = readonly [number, number, number, number];
export interface Pose {
  x: number;
  y: number;
  z: number;
  ry: number;
}
/** 전체 놀이 시계(초): render/city/fun.ts 의 시스템이 올린다. 놀이기구 모양과 탑승 위치가 같은 시계를 본다 */
export const funClock = {t: 0};
/** 탑승 중인 기구가 자기 모양을 대신 움직이게 하는 덮어쓰기(coaster = 궤도 위치 u, yacht = 자세). 게임 쪽이 쓰고 렌더 쪽이 읽는다 */
export const rideOvr: {coaster: number | null; yacht: Pose | null} = {coaster: null, yacht: null};

export const PARCELS: Record<string, Rect> = {
  park: [-332, -332, -214, -208],
  theme: [-332, -108, -214, 78],
  beachW: [-190, 306, -24, 334],
  port: [24, 306, 190, 334],
  culture: [210, 108, 266, 186],
  leisure: [210, 210, 266, 266],
  resi: [-268, 286, -210, 334],
};
export const inR = (x: number, z: number, r: Rect, m = 0) => x >= r[0] - m && x < r[2] + m && z >= r[1] - m && z < r[3] + m;

// ───────────── 중앙 공원 (북서)
export const POND = {x: -275, z: -268, r: 22};
/** 자전거 길 반지름 범위 (연못 둘레) */
export const BIKE = {r0: 27.5, r1: 31.5, rm: 29.5};
/** 오리: 연못 안을 도는 4마리 (반지름·속도·위상) */
export const DUCKS = [
  {r: 13, w: 0.35, p: 0}, {r: 15, w: -0.28, p: 2.1}, {r: 9, w: 0.5, p: 4.0}, {r: 17, w: 0.22, p: 5.2},
];
export const duckPos = (i: number, t: number) => {
  const d = DUCKS[i], a = d.p + d.w * t;
  return {x: POND.x + Math.cos(a) * d.r, z: POND.z + Math.sin(a) * d.r, ry: Math.atan2(-Math.sin(a) * d.w, Math.cos(a) * d.w) };
};
/** 자전거 대여소 출발점(연못 동쪽 길) 기준 한 바퀴 */
export const bikePose = (s: number): Pose => {
  const a = (s * 8) / BIKE.rm; // 초속 8u
  const x = POND.x + Math.cos(a) * BIKE.rm, z = POND.z + Math.sin(a) * BIKE.rm;
  return {x, y: 0.5, z, ry: Math.atan2(-Math.sin(a), Math.cos(a))};
};
export const BIKE_LAP = (2 * Math.PI * BIKE.rm) / 8;

// ───────────── 테마파크 (서)
export const CAROUSEL = {x: -245, z: -62, r: 8.5, horse: 5.6, n: 8};
const rotY = (lx: number, lz: number, th: number): [number, number] => [lx * Math.cos(th) + lz * Math.sin(th), -lx * Math.sin(th) + lz * Math.cos(th)];
export const carouselAngle = (t: number) => t * 0.7;
export const carouselPose = (t: number): Pose => {
  const th = carouselAngle(t), [dx, dz] = rotY(CAROUSEL.horse, 0, th);
  return {x: CAROUSEL.x + dx, y: 1.7, z: CAROUSEL.z + dz, ry: th};
};
/** 롤러코스터: 타원 궤도 + 언덕 3개. u 0..1 */
export const COASTER = {x: -304, z: -72, rx: 19, rz: 26, lap: 22};
export const coasterAt = (u: number): Pose => {
  const a = u * Math.PI * 2;
  const f = (aa: number) => ({x: COASTER.x + Math.cos(aa) * COASTER.rx, y: 7 - 5 * Math.cos(3 * aa), z: COASTER.z + Math.sin(aa) * COASTER.rz});
  const p = f(a), q = f(a + 0.02);
  return {...p, ry: Math.atan2(q.x - p.x, q.z - p.z)};
};
/** 범퍼카 경기장 */
export const BUMPER: Rect = [-246, 15, -222, 52];
export const BUMPER_N = 5;
export const bumperPose = (i: number, t: number): Pose => {
  const cx = (BUMPER[0] + BUMPER[2]) / 2, cz = (BUMPER[1] + BUMPER[3]) / 2, ax = 9.2, az = 15;
  const w1 = 0.7 + i * 0.13, w2 = 0.55 + i * 0.17, p = i * 1.7;
  const x = cx + ax * Math.sin(w1 * t + p), z = cz + az * Math.sin(w2 * t + p * 1.3);
  return {x, y: 0.35, z, ry: Math.atan2(ax * w1 * Math.cos(w1 * t + p), az * w2 * Math.cos(w2 * t + p * 1.3))};
};
export const FERRIS = {x: -274, y: 26, z: -16, r: 22};
/** 테마파크 입구: 서쪽 대로(west-ave z=0)가 공원을 가로지르므로 대로를 사이에 두고 선다 */
export const THEME_GATE = {x: -219, z: 0};

// ───────────── 주거 놀이터 (남서)
export const SWING = {x: -252, z: 290, h: 5, L: 4.2};
export const swingPose = (t: number, k: number): Pose => {
  const a = 0.75 * Math.sin(t * 1.9 + k * 1.2);
  return {x: SWING.x + (k ? 2.4 : -2.4), y: SWING.h - Math.cos(a) * SWING.L + 0.55, z: SWING.z + Math.sin(a) * SWING.L, ry: 0};
};
/** 미끄럼틀: 위에서 아래(+z)로 s(0..1) */
export const SLIDE = {x: -241, z: 292, h: 4.2, len: 9};
export const slidePose = (s: number): Pose => ({x: SLIDE.x, y: SLIDE.h * (1 - s) + 0.4, z: SLIDE.z + SLIDE.len * s, ry: 0});

// ───────────── 항구 (남)
/** 요트: 계류 지점에서 출발해 앞바다를 한 바퀴 돌고 돌아온다 */
export const YACHT = {moorX: 98, moorZ: 356, r: 9, lap: 22};
export const yachtPose = (s: number): Pose => {
  const a = -Math.PI / 2 + (s / YACHT.lap) * Math.PI * 2;
  return {
    x: YACHT.moorX + Math.cos(a) * YACHT.r,
    y: -4.6 + 1.0 + Math.sin(s * 2) * 0.1,
    z: YACHT.moorZ + YACHT.r + Math.sin(a) * YACHT.r,
    ry: Math.atan2(-Math.sin(a), Math.cos(a)),
  };
};
