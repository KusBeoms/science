// 색 팔레트 토큰. 월드의 모든 색은 여기 이름 상수에서만 가져온다(임의 hex 금지)

/** 중립 12 */
export const NEUTRAL = {
  ink: 0x14161f, coal: 0x262a36, slate: 0x3b4152, steel: 0x5a6275,
  stone: 0x808899, ash: 0xa4abb8, fog: 0xc6ccd6, cloud: 0xe4e8ef,
  white: 0xffffff, bone: 0xd9d0bd, clay: 0x8a6a52, wood: 0x6b4a32,
} as const;

/** 도시 8 */
export const CITY = {
  brick: 0xa4503c, plaster: 0xe8dcc4, tileRed: 0xc2453a, tileBlue: 0x3f6fa8,
  glass: 0x7fb8d8, asphalt: 0x30343f, paving: 0x9a9fa8, awning: 0xe0a53a,
} as const;

/** 강조 12 */
export const ACCENT = {
  red: 0xe5483f, orange: 0xf08a3a, amber: 0xf5b73a, yellow: 0xf3e04a,
  lime: 0xa6d84a, green: 0x4cb860, teal: 0x2fb5a0, cyan: 0x45c8e8,
  blue: 0x4a82e8, violet: 0x8b62dc, magenta: 0xcc4ac0, pink: 0xf08cb4,
} as const;

export const PAL = {...NEUTRAL, ...CITY, ...ACCENT} as const;
export type PalName = keyof typeof PAL;

/** 구역 바이옴 id (= 섹터 id, 도시는 전역 팔레트를 쓰므로 제외) */
export type Biome =
  | 'solar' | 'belt' | 'jovian' | 'giants' | 'kuiper' | 'reddwarf'
  | 'exo' | 'hotjup' | 'nebula' | 'supernova' | 'gargantua' | 'alpha';

/** 바이옴 6색: [깊은 곳, 낮은 곳, 중간, 높은 곳, 바위, 발광 포인트] */
export const BIOME: Record<Biome, readonly [number, number, number, number, number, number]> = {
  solar: [0x4a4640, 0x6e6a62, 0x8c877c, 0xaaa597, 0x5a5650, 0xe8c070],
  belt: [0x6a4528, 0x935f34, 0xb87c40, 0xd9a05a, 0x4e3422, 0xffb04a],
  jovian: [0xb87a46, 0xd9a46a, 0xefd0a0, 0xf6e6c6, 0x8c5a38, 0xff7a3a],
  giants: [0x6a9ac4, 0x9cc4e0, 0xcae4f2, 0xeef8fc, 0x587898, 0x7ae8ff],
  kuiper: [0x1c2448, 0x2c3866, 0x40508a, 0x6678aa, 0x161c38, 0x9ab4ff],
  reddwarf: [0x5a1c20, 0x84302e, 0xb04a38, 0xd8744c, 0x3c1618, 0xff9a4a],
  exo: [0x2c6a3a, 0x48923f, 0x7cb848, 0x9a62c8, 0x5a3a7a, 0xe8d65a],
  hotjup: [0x3a1812, 0x682a18, 0xa04420, 0xd86a2a, 0x261410, 0xffd23a],
  nebula: [0x2c1c4a, 0x47306e, 0x65489a, 0x8c6cc2, 0x1e1432, 0xe08cff],
  supernova: [0x2a3a58, 0x4a6488, 0x7a9cc0, 0xb4d4ec, 0x1e2840, 0x9aeaff],
  gargantua: [0x07080e, 0x12141f, 0x1f2232, 0x34384e, 0x0a0b12, 0xff8a2a],
  alpha: [0x0e3a3a, 0x1a6a58, 0x2fa078, 0x6ad89a, 0x0a2a30, 0x5affd0],
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** 0xRRGGBB → [r,g,b] (0..1). r128 기본 출력은 선형이라 변환 없이 쓴다 */
export const rgb = (c: number): [number, number, number] => [(c >> 16) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];

/** 두 색을 RGB 보간 */
export function mix(a: number, b: number, t: number): number {
  const k = clamp01(t),
    ch = (s: number) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** 바이옴 지형색: 높이 h(0..1)로 깊은곳→높은곳 4단 보간, 경사 slope(0..1)가 클수록 바위색 */
export function ramp(biome: Biome, h: number, slope: number): number {
  const b = BIOME[biome],
    p = clamp01(h) * 3,
    i = Math.min(2, Math.floor(p)),
    base = mix(b[i], b[i + 1], p - i);
  return mix(base, b[4], (slope - 0.35) / 0.4);
}

/** 낮밤 틴트: 하늘/안개/반구광 하늘·땅/태양 색과 세기 */
export interface Tint {
  sky: number;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  sun: number;
  hemiK: number;
  sunK: number;
}
export const TINT: Record<'day' | 'dusk' | 'night' | 'dawn', Tint> = {
  day: {sky: 0x8cc8f0, fog: 0xbcdcf0, hemiSky: 0xdcecff, hemiGround: 0x7a8a6a, sun: 0xfff2d8, hemiK: 0.95, sunK: 0.85},
  dusk: {sky: 0xe88a5a, fog: 0xd8a080, hemiSky: 0xffc8a0, hemiGround: 0x5a4a58, sun: 0xff9a5a, hemiK: 0.75, sunK: 0.7},
  night: {sky: 0x070a18, fog: 0x0c1128, hemiSky: 0x6078c0, hemiGround: 0x181c30, sun: 0x8aa0ff, hemiK: 0.55, sunK: 0.25},
  dawn: {sky: 0xf0b0a0, fog: 0xe0b8b0, hemiSky: 0xffd8d0, hemiGround: 0x586070, sun: 0xffc8a0, hemiK: 0.8, sunK: 0.6},
};

export function mixTint(a: Tint, b: Tint, t: number): Tint {
  const o = {...a} as Tint;
  (Object.keys(a) as (keyof Tint)[]).forEach(k => {
    o[k] = k === 'hemiK' || k === 'sunK' ? a[k] + (b[k] - a[k]) * clamp01(t) : mix(a[k], b[k], t);
  });
  return o;
}
