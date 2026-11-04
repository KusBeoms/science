// 도시 보행 경로 그래프 (WORLD.md 5.2, W1 범위: 중앙 광장 · 사과 대로 · 상점가). 군중(systems/crowd.ts)이 이 위를 걷는다.
// 보도 중심선은 data/city.ts 의 도로·광장 데이터에서 구하고, 걷는 도중 건물과의 충돌은 solidAt 으로 막는다.
// 좌표: x 동, z 남 (사과 대로는 정북 = −z).
import {CITY_PLAZAS, CITY_ROADS} from './city.js';

/** 구역 id (ZONE_SHARE 의 인덱스) */
export const Zone = {Plaza: 0, Avenue: 1, Shops: 2} as const;
/** 구역별 군중 목표 비율 (WORLD 5.1 도시 구역별 목표의 광장 10 · 북문 6 · 상점가 12) */
export const ZONE_SHARE = [10, 6, 12] as const;

export interface CityGraph {
  x: Float32Array;
  z: Float32Array;
  zone: Uint8Array;
  /** 1 이면 멈춰 서서 구경하는 지점 (벤치 · 상점 앞) */
  idle: Uint8Array;
  /** 양방향 이웃 노드 */
  adj: Uint16Array[];
}

/** [x, z] 또는 [x, z, 1] (idle 지점) */
type Pt = readonly [number, number] | readonly [number, number, 1];

function build(): CityGraph {
  const xs: number[] = [],
    zs: number[] = [],
    zone: number[] = [],
    idle: number[] = [],
    nb: Set<number>[] = [],
    ids = new Map<string, number>();
  const node = (p: Pt, z: number) => {
    const k = p[0] + ',' + p[1];
    let i = ids.get(k);
    if (i === undefined) {
      i = xs.length;
      ids.set(k, i);
      xs.push(p[0]);
      zs.push(p[1]);
      zone.push(z);
      idle.push(0);
      nb.push(new Set());
    }
    if (p[2]) idle[i] = 1;
    return i;
  };
  /** 점들을 차례로 잇는다 */
  const link = (z: number, pts: Pt[]) => {
    const at = pts.map(p => node(p, z));
    for (let i = 1; i < at.length; i++) {
      nb[at[i - 1]].add(at[i]);
      nb[at[i]].add(at[i - 1]);
    }
  };
  const lane = (id: string) => {
    const r = CITY_ROADS.find(o => o.id === id)!;
    return r.w / 2 + r.sidewalk / 2; // 보도 띠의 가운데
  };
  const R = CITY_PLAZAS[0].rect[2] - 9, // 광장 보도 고리: 중앙 광장 가장자리에서 9u 안쪽 (기지 부지 ±22 밖)
    LANE = lane('apple'),
    ST = lane('promenade');

  // 중앙 광장 보도 고리. 북변 가운데는 오러리 분수(0,−45)가 막고 있어 비운다 (대로 보도 두 줄이 양쪽으로 들어온다)
  link(Zone.Plaza, [[-R, -R], [-26, -R, 1], [-LANE, -R]]);
  link(Zone.Plaza, [[LANE, -R], [26, -R, 1], [R, -R]]);
  link(Zone.Plaza, [[R, -R], [R, -21], [R, -ST], [R, 0], [R, ST], [R, 21], [R, R]]);
  link(Zone.Plaza, [[R, R], [21, R], [0, R, 1], [-21, R], [-R, R]]);
  link(Zone.Plaza, [[-R, R], [-R, 21], [-R, 0, 1], [-R, -21], [-R, -R]]);

  // 사과 대로: 양쪽 보도 (분수 L2 는 (0,−40) 이라 북변 가운데를 비운다) + 건널목 3곳
  for (const s of [-1, 1]) {
    link(Zone.Avenue, [[s * LANE, -R], [s * LANE, -62], [s * LANE, -85, 1], [s * LANE, -110], [s * LANE, -135, 1], [s * LANE, -144]]);
  }
  for (const z of [-62, -110, -144]) link(Zone.Avenue, [[-LANE, z], [0, z], [LANE, z]]);

  // 상점가: 동쪽 도로(z=0) 양쪽 보도 + 건널목, 가게 앞 idle
  for (const s of [-1, 1]) {
    link(Zone.Shops, [[R, s * ST], [58, s * ST], [75, s * ST, 1], [95, s * ST], [115, s * ST, 1], [132, s * ST], [143, s * ST]]);
  }
  for (const x of [58, 95, 143]) link(Zone.Shops, [[x, -ST], [x, 0], [x, ST]]);

  return {
    x: Float32Array.from(xs),
    z: Float32Array.from(zs),
    zone: Uint8Array.from(zone),
    idle: Uint8Array.from(idle),
    adj: nb.map(s => Uint16Array.from(s)),
  };
}

export const CITY_GRAPH = build();
