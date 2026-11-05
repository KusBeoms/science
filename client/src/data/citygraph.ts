// 도시 보행 경로 그래프 (WORLD.md 5.2): 중앙 광장 · 사과 대로 · 상점가 (W1) + 암시장 · 우주항 · 정비소 · 과학관 · 주거 (W2). 군중(systems/crowd.ts)이 이 위를 걷는다.
// 보도 중심선은 data/city.ts 의 도로·광장 데이터에서 구하고, 걷는 도중 건물과의 충돌은 solidAt 으로 막는다.
// 좌표: x 동, z 남 (사과 대로는 정북 = −z).
import {CITY_PLAZAS, CITY_ROADS} from './city.js';
import {ROADS_W3} from './city-w3.js';

/** 구역 id (ZONE_SHARE 의 인덱스) */
export const Zone = {Plaza: 0, Avenue: 1, Shops: 2, Market: 3, Harbor: 4, Garage: 5, Science: 6, Resi: 7, NewTown: 8} as const;
/** 구역별 군중 목표 비율 (WORLD 5.1: 광장 10 · 북문 6 · 상점가 12 · 암시장 20 · 우주항 4 · 정비소 3 · 과학관 5 · 주거 6 = 66) */
export const ZONE_SHARE = [10, 6, 12, 20, 4, 3, 5, 6, 44] as const;

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

  buildW2(link);
  buildW3(link);
  // 막다른 노드(스타디움 쪽으로 잘린 보도 끝)는 이웃의 다음 이웃과도 이어 한 칸 건너뛰는 갈래를 만든다(통행은 같은 보도 위)
  nb.forEach((set, i) => {
    if (set.size >= 2) return;
    const n1 = [...set][0];
    for (const n2 of nb[n1]) if (n2 !== i) { set.add(n2); nb[n2].add(i); break; }
  });

  return {
    x: Float32Array.from(xs),
    z: Float32Array.from(zs),
    zone: Uint8Array.from(zone),
    idle: Uint8Array.from(idle),
    adj: nb.map(s => Uint16Array.from(s)),
  };
}

/** W2 구역 보도(경로) 그래프. 좌표는 data/city.ts 도로·건물 문 앞 기준 (문 앞 1.5u 이내가 보도 중심선) */
function buildW2(link: (z: number, pts: Pt[]) => void) {
  const R = CITY_PLAZAS[0].rect[2] - 9;
  // --- 암시장 골목: 바깥 고리(x −54/−126, z ±30) + 가운데 골목 양옆(z ±4.5) ---
  const M = Zone.Market;
  link(M, [[-R, 0], [-54, -4.5]]);
  link(M, [[-R, 0], [-54, 4.5]]);
  link(M, [[-R, -21], [-54, -30]]);
  link(M, [[-R, 21], [-54, 30]]);
  for (const x of [-54, -126]) link(M, [[x, -30], [x, -4.5], [x, 4.5], [x, 30]]);
  for (const z of [-30, 30]) link(M, [[-54, z], [-72, z, 1], [-90, z], [-108, z, 1], [-126, z]]);
  for (const z of [-4.5, 4.5]) link(M, [[-54, z], [-74, z, 1], [-98, z, 1], [-126, z]]);
  // --- 우주항: 항구 도로 양옆 보도 → 광장 둘레 + 가운데 줄 ---
  const H = Zone.Harbor;
  for (const s of [-1, 1]) {
    link(H, [[s * 21, R], [s * 9.5, R], [0, R]]);
    link(H, [[s * 9.5, R], [s * 9.5, 70], [s * 9.5, 95, 1], [s * 9.5, 116]]);
  }
  link(H, [[-36, 116], [-9.5, 116], [0, 116], [9.5, 116], [36, 116]]);
  link(H, [[0, 116], [0, 130, 1], [0, 146]]);
  link(H, [[-36, 146], [0, 146], [36, 146]]);
  for (const x of [-36, 36]) link(H, [[x, 116], [x, 131, 1], [x, 146]]);
  // --- 정비소: 도로 서쪽 보도 + 시험로 양옆 보도 + 북쪽·동쪽 고리 ---
  const G = Zone.Garage;
  link(G, [[R, -R], [55.5, -R], [55.5, -63.5], [55.5, -76.5], [55.5, -100, 1], [55.5, -145]]);
  link(G, [[55.5, -63.5], [75, -63.5, 1], [95, -63.5], [115, -63.5, 1], [140, -63.5]]);
  link(G, [[55.5, -76.5], [78, -76.5], [110, -76.5, 1], [140, -76.5]]);
  link(G, [[140, -63.5], [140, -76.5], [140, -110, 1], [140, -145]]);
  link(G, [[55.5, -145], [100, -145, 1], [140, -145]]);
  // --- 과학관: 도로 양옆 보도 + 돔 앞뜰 고리 ---
  const S = Zone.Science;
  link(S, [[R, R], [R, 55.5], [55.5, 55.5], [80, 55.5, 1], [110, 55.5], [144, 55.5]]);
  link(S, [[55.5, 55.5], [55.5, 68.5], [80, 68.5], [100, 68.5, 1], [120, 68.5], [144, 68.5]]);
  link(S, [[144, 55.5], [144, 68.5]]);
  link(S, [[100, 68.5], [100, 78]]);
  link(S, [[72, 78], [100, 78], [128, 78], [128, 106, 1], [128, 134], [100, 134, 1], [72, 134], [72, 106, 1], [72, 78]]);
  // --- 주거: 도로 양옆 보도 ---
  const Z = Zone.Resi;
  link(Z, [[-R, R], [-R, 93.5], [-52, 93.5]]);
  for (const z of [93.5, 106.5]) link(Z, [[-52, z], [-64, z, 1], [-82, z], [-100, z, 1], [-118, z], [-136, z]]);
  link(Z, [[-R, 93.5], [-R, 106.5], [-52, 106.5]]);
  link(Z, [[-136, 93.5], [-136, 106.5]]);
}

/** 신도심: 새 도로(ROADS_W3) 양쪽 보도를 따라 20u 간격 노드, 교차하는 도로의 보도끼리는 교차점에서 만나게 하고, 원도심 끝과 이어 붙인다 */
function buildW3(link: (z: number, pts: Pt[]) => void) {
  const Z = Zone.NewTown,
    cars = ROADS_W3.filter(r => r.car),
    lanes = cars.flatMap(r => {
      const vert = r.x0 === r.x1,
        o = r.w / 2 + r.sidewalk / 2,
        a0 = Math.min(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1),
        a1 = Math.max(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1);
      return [-1, 1].map(s => ({vert, c: (vert ? r.x0 : r.z0) + s * o, a0, a1}));
    });
  // 스타디움(관중석이 보도 위까지 덮는다)은 보행 경로에서 뺀다: 그 안의 보도 노드는 지우고, 잘린 끝은 맞은편 보도와 이어 막다른 곳을 없앤다
  const inStad = (x: number, z: number) => x >= 205 && z <= -205;
  const pt = (L: {vert: boolean; c: number}, a: number): [number, number] => (L.vert ? [L.c, a] : [a, L.c]);
  const sets = lanes.map(L => {
    const at = new Set<number>();
    for (let a = Math.ceil(L.a0 / 20) * 20; a <= L.a1; a += 20) at.add(a);
    at.add(L.a0);
    at.add(L.a1);
    for (const M of lanes) if (M.vert !== L.vert && M.c >= L.a0 && M.c <= L.a1 && L.c >= M.a0 && L.c <= M.a1) at.add(M.c);
    return at;
  });
  const cuts: [number, number][] = []; // [레인 인덱스, 잘린 끝 a]
  lanes.forEach((L, i) => {
    const sorted = [...sets[i]].sort((p, q) => p - q);
    sorted.forEach((a, k) => {
      if (inStad(...pt(L, a))) return;
      const nb = [sorted[k - 1], sorted[k + 1]].filter(v => v !== undefined && inStad(...pt(L, v!)));
      if (nb.length) cuts.push([i, a]);
    });
  });
  // 맞은편 보도(같은 도로, 반대쪽) 인덱스: lanes 는 도로마다 [-1, +1] 쌍
  for (const [i, a] of cuts) sets[i ^ 1].add(a);
  lanes.forEach((L, i) => {
    const pts = [...sets[i]]
      .sort((p, q) => p - q)
      .filter(a => !inStad(...pt(L, a)))
      .map((a, k): Pt => {
        const idle = k % 3 === 1,
          [x, z] = pt(L, a);
        return idle ? [x, z, 1] : [x, z];
      });
    if (pts.length > 1) link(Z, pts);
  });
  for (const [i, a] of cuts) link(Z, [pt(lanes[i], a), pt(lanes[i ^ 1], a)]);
  // 길 끝에서는 양쪽 보도를 이어 막다른 곳을 없앤다
  for (const r of cars) {
    const vert = r.x0 === r.x1,
      o = r.w / 2 + r.sidewalk / 2,
      c = vert ? r.x0 : r.z0;
    for (const a of [Math.min(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1), Math.max(vert ? r.z0 : r.x0, vert ? r.z1 : r.x1)]) {
      const ends: Pt[] = vert ? [[c - o, a], [c + o, a]] : [[a, c - o], [a, c + o]];
      if (!inStad(ends[0][0], ends[0][1]) && !inStad(ends[1][0], ends[1][1])) link(Z, ends);
    }
  }
  // 원도심 끝과 연결
  const LANE = 13.5;
  for (const s of [-1, 1]) link(Zone.Avenue, [[s * LANE, -144], [s * LANE, -150]]);
  link(Zone.Shops, [[143, -6.5], [150, -8.5]]);
  link(Zone.Shops, [[143, 6.5], [150, 8.5]]);
  link(Zone.Harbor, [[0, 146], [9.5, 148]]);
  link(Zone.Harbor, [[0, 146], [-9.5, 148]]);
  link(Zone.Market, [[-126, -4.5], [-138, -8.5]]);
  link(Zone.Market, [[-126, 4.5], [-138, 8.5]]);
}

export const CITY_GRAPH = build();
