// 대륙 외곽선 (W6 CONTINENT): 도시·야생지의 땅 가장자리는 사각형이 아니라 사용자가 준 사진 2장의 윤곽(도시 = 4.png, 시골 = 5.png)을 그대로 따른다.
// 원본 = tools/outline-extract.mjs 가 PNG 에서 뽑아 RDP 로 단순화한 폴리곤(도시 125점, 야생지 114점). 좌우반전·회전 없음 — 이미지 위 = 북(−z), 오른쪽 = 동(+x).
// 정규화 좌표: 윤곽 bbox 의 긴 변 = 1, bbox 중심 = (0,0). placeOutline 이 월드 좌표로 크기·위치만 조정한다.
// 순수 데이터 + 기하. 굽기(core/heightmap.ts)·땅 판정(core/terrain.ts)·색·바다 판이 같이 쓴다.

export type Pt = readonly [number, number];
export interface Placement {
  /** 정규화 1.0 이 되는 월드 길이 (u) */
  scale: number;
  /** 정규화 (0,0) 이 놓이는 월드 좌표 */
  x: number;
  z: number;
}

/** 도시 외곽선 (정규화 ×10000, x,z 쌍) */
const CITY_RAW = [
  -416, -3858, -172, -3400, -126, -3132, 157, -2712, 340, -2506, 607, -2513, 837, -2353, 943, -2452,
  989, -2597, 1127, -2628, 1234, -2735, 1509, -2765, 1623, -2880, 1753, -2941, 1700, -2712, 1791, -2506,
  1944, -2330, 1944, -2101, 2036, -1925, 2066, -1696, 2158, -1505, 2173, -1291, 2456, -1245, 2716, -1390,
  3037, -1436, 3304, -1276, 3846, -1154, 4144, -1276, 4450, -1238, 4511, -1161, 4519, -1077, 4855, -672,
  4771, -497, 4809, -413, 4809, -183, 4840, -115, 5000, 23, 4702, 145, 4412, 38, 4206, 252,
  3663, 435, 3182, 741, 2983, 1184, 2968, 1375, 2800, 1467, 2632, 1780, 2639, 1979, 2731, 2131,
  2762, 2322, 2609, 2299, 2395, 2101, 2257, 2078, 2135, 1994, 1746, 1917, 1639, 2070, 1547, 2383,
  1463, 2521, 1524, 2689, 1532, 2888, 1402, 3201, 1341, 3293, 1218, 3361, 1035, 3377, 959, 3323,
  829, 3316, 653, 3316, 233, 3231, -271, 3231, -493, 3170, -699, 3209, -898, 3384, -1142, 3422,
  -1585, 3697, -2059, 3728, -2647, 3713, -3144, 3858, -3243, 3736, -3327, 3728, -3449, 3621, -3526, 3613,
  -3617, 3453, -3487, 3331, -3464, 3209, -3495, 2720, -3541, 2574, -3495, 2277, -3701, 2185, -4053, 1895,
  -4129, 1665, -4351, 1665, -4549, 1543, -5000, 1558, -4511, 1062, -4465, 863, -4473, 596, -4335, 390,
  -4129, 275, -3961, 107, -3992, -8, -3930, -290, -4106, -642, -3885, -894, -3846, -1230, -3571, -1383,
  -3464, -1536, -3235, -1734, -3182, -1849, -3189, -1994, -3075, -2254, -2777, -2536, -2479, -2628, -2326, -2559,
  -2158, -2552, -2059, -2712, -1814, -2888, -1639, -2895, -1486, -2949, -1425, -3071, -1310, -3163, -1203, -3170,
  -1112, -3316, -1005, -3338, -829, -3445, -577, -3514, -477, -3644,
];
/** 야생지 외곽선 (정규화 ×10000, x,z 쌍) */
const WILD_RAW = [
  -277, -4742, -108, -4601, -61, -4441, -99, -4075, 192, -3925, 343, -3775, 390, -3606, 587, -3408,
  831, -2892, 1000, -2648, 1197, -2404, 1441, -2263, 1423, -1944, 1610, -1624, 1704, -1296, 1798, -1164,
  1836, -920, 1930, -770, 1930, -629, 2352, -131, 2981, 338, 3319, 498, 3714, 507, 4070, 347,
  4840, 479, 4859, 667, 5000, 995, 4981, 1315, 4718, 1765, 4362, 1671, 3789, 1615, 3629, 1643,
  3310, 1793, 3808, 2667, 3770, 3014, 3779, 3737, 3873, 4009, 4211, 4291, 3732, 4300, 3169, 4507,
  3019, 4685, 2793, 4657, 2577, 4714, 2202, 4573, 1836, 4498, 1582, 4516, 1263, 4742, 962, 4376,
  803, 4225, 512, 4094, 146, 4075, 80, 4009, -146, 3962, -249, 3793, -371, 3718, -624, 3756,
  -803, 3953, -1047, 3981, -1254, 4169, -1451, 4094, -1507, 4066, -1638, 3840, -1854, 3765, -2042, 3577,
  -2014, 3324, -2155, 3089, -2211, 2892, -2380, 2723, -2474, 2685, -2606, 2657, -3188, 2920, -3366, 3061,
  -3460, 3258, -3648, 3324, -3892, 3333, -3854, 2817, -3911, 2714, -4052, 2610, -4108, 2488, -4108, 2357,
  -4296, 2207, -4493, 1934, -4559, 1700, -4484, 1380, -4577, 1117, -4700, 986, -4596, 864, -4531, 451,
  -4793, 216, -4822, 38, -4915, -113, -4906, -319, -4840, -488, -4887, -657, -5000, -817, -4493, -1005,
  -4202, -1315, -3958, -1728, -3545, -2000, -3554, -2085, -3451, -2310, -3197, -2507, -3122, -2695, -3103, -2789,
  -3178, -3042, -3066, -3324, -2577, -3531, -2484, -3812, -2268, -3991, -1967, -4019, -1685, -3944, -906, -4216,
  -690, -4404, -540, -4638,
];

const pairs = (a: number[]): Pt[] => {
  const o: Pt[] = [];
  for (let i = 0; i < a.length; i += 2) o.push([a[i] / 10000, a[i + 1] / 10000]);
  return o;
};
/** 정규화된 원본 윤곽 */
export const CITY_OUTLINE: Pt[] = pairs(CITY_RAW);
export const WILD_OUTLINE: Pt[] = pairs(WILD_RAW);

/** 월드 배치: 도시는 사각형(±335) 이 윤곽 안에 여유 60u 이상으로 들어가도록, 야생지는 호수·산·시골이 들어가도록 (docs/work-logs/W6_CONTINENT.md) */
/** W7: 산악(북쪽 봉우리·서쪽 능선·동쪽 반도)이 들어갈 공간을 위해 1620 → 1800. 시가지 사각형 모서리 여유 ≥ 80u, 남안은 x=74 에서 z=404 로 유지(다리 호환) */
export const CITY_PLACE: Placement = {scale: 1800, x: 160, z: -167};
export const WILD_PLACE: Placement = {scale: 1300, x: 110, z: 1345};
/** 야생지 내용(호수·산·교도소…)을 옛 좌표에서 남쪽으로 옮긴 거리 — 데이터 좌표가 `옛 z + WILD_DZ` 인 이유 */
export const WILD_DZ = 200;

export const placeOutline = (n: readonly Pt[], p: Placement): Pt[] => n.map(q => [q[0] * p.scale + p.x, q[1] * p.scale + p.z] as Pt);

/** 월드 좌표 윤곽: 안/밖 판정과 윤곽까지의 부호 있는 거리 (안쪽 +, 바깥 −) */
export class Outline {
  readonly poly: Pt[];
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  private readonly cell = 40;
  private readonly cx: number;
  private readonly cz: number;
  private readonly buckets = new Map<number, number[]>();
  constructor(poly: Pt[]) {
    this.poly = poly;
    this.x0 = Math.min(...poly.map(p => p[0]));
    this.x1 = Math.max(...poly.map(p => p[0]));
    this.z0 = Math.min(...poly.map(p => p[1]));
    this.z1 = Math.max(...poly.map(p => p[1]));
    this.cx = Math.ceil((this.x1 - this.x0) / this.cell) + 1;
    this.cz = Math.ceil((this.z1 - this.z0) / this.cell) + 1;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length];
      const i0 = Math.floor((Math.min(a[0], b[0]) - this.x0) / this.cell),
        i1 = Math.floor((Math.max(a[0], b[0]) - this.x0) / this.cell),
        j0 = Math.floor((Math.min(a[1], b[1]) - this.z0) / this.cell),
        j1 = Math.floor((Math.max(a[1], b[1]) - this.z0) / this.cell);
      for (let j = j0; j <= j1; j++)
        for (let k = i0; k <= i1; k++) {
          const key = j * this.cx + k;
          (this.buckets.get(key) || this.buckets.set(key, []).get(key)!).push(i);
        }
    }
  }
  /** bbox 밖이면 (여유 m) 곧바로 false — 빠른 거절 */
  near(x: number, z: number, m = 0) {
    return x >= this.x0 - m && x <= this.x1 + m && z >= this.z0 - m && z <= this.z1 + m;
  }
  /** 점이 윤곽 안인가 (짝-홀 규칙) */
  inside(x: number, z: number): boolean {
    if (!this.near(x, z)) return false;
    const p = this.poly;
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[i],
        b = p[j];
      if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  private segDist(x: number, z: number, i: number): number {
    const a = this.poly[i],
      b = this.poly[(i + 1) % this.poly.length],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
  }
  /** 윤곽선까지의 (안 +, 밖 −) 거리. bbox 에서 maxOut 넘게 떨어진 밖은 −(maxOut+1), 거리가 cap 을 넘으면 ±cap 으로 잘라 돌려준다 (굽기 속도) */
  dist(x: number, z: number, maxOut = 20, cap = 1e9): number {
    if (!this.near(x, z, maxOut)) return -(maxOut + 1);
    const ci = Math.floor((x - this.x0) / this.cell),
      cj = Math.floor((z - this.z0) / this.cell),
      maxR = Math.max(this.cx, this.cz) + 1;
    let best = 1e9;
    for (let r = 0; r <= maxR; r++) {
      for (let j = cj - r; j <= cj + r; j++)
        for (let k = ci - r; k <= ci + r; k++) {
          if (Math.max(Math.abs(j - cj), Math.abs(k - ci)) !== r || j < 0 || k < 0 || j >= this.cz || k >= this.cx) continue;
          const l = this.buckets.get(j * this.cx + k);
          if (l) for (const i of l) best = Math.min(best, this.segDist(x, z, i));
        }
      if (best <= r * this.cell || r * this.cell >= cap) break;
    }
    best = Math.min(best, cap);
    return this.inside(x, z) ? best : -best;
  }
}

export const CITY_POLY = new Outline(placeOutline(CITY_OUTLINE, CITY_PLACE));
export const WILD_POLY = new Outline(placeOutline(WILD_OUTLINE, WILD_PLACE));
export const pointInOutline = (o: Outline, x: number, z: number) => o.inside(x, z);
export const outlineDist = (o: Outline, x: number, z: number) => o.dist(x, z);

/** 야생지 북쪽 끝(가장 북쪽 꼭짓점) x 에 맞춘 도시–야생지 다리 양끝: 도시 남안(city)·야생지 북안(wild) 의 z. 사이는 바다 해협 */
function bridgeEnds() {
  let tip = WILD_POLY.poly[0];
  for (const p of WILD_POLY.poly) if (p[1] < tip[1]) tip = p;
  const x = Math.round(tip[0]);
  let cityZ = 0;
  for (let z = 335; z < 900; z += 1) if (CITY_POLY.inside(x, z)) cityZ = z;
  return {x, city: cityZ, wild: Math.round(tip[1])};
}
/** 다리(BRIDGE 에이전트가 2단계에서 만든다): x = 다리 중심선, city = 도시 남안 z, wild = 야생지 북안 z */
export const BRIDGE_ENDS = bridgeEnds();
