// city-render.spec 용 손으로 쓴 작은 CityCompiled 고정 데이터(시험 전용 생성기). citygen 빌더에 의존하지 않는다.
// 구성(원점 O 기준, x 동+ · z 남+): 십자 교차로(동서 R1, 남북 R2) + 북쪽으로 오르는 언덕길 R2N(최대 9.2m) + 그 위를 건너는 다리 B1(y=12, layer 1)
//   + 가로등·가로수·벤치·신호기·표지판·쓰레기통·볼라드·울타리·관목 + 회전한 건물 2채(집 30°, 사무소 −20°) + 회전 없는 고층 1채.
// 리본 단면(한쪽): 차도 0~5, 연석 5(0→0.15), 보도 5~8(+0.15). 도료·횡단보도·중앙분리대·갓길·데크도 각 1곳 이상 포함한다.
import type {BuildingSource} from '../../src/data/city-schema';
import type {Collider, CityCompiled, CompiledRoad, Placement, RibbonChunk, RoadSample} from '../../src/data/city-compiled';

type P3 = [number, number, number];
type Smp = {x: number; y: number; z: number};
const CS = 64;
const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

class Acc {
  map = new Map<string, RibbonChunk>();
  /** 사각형 하나(a,b,c,d 순서 무관): want 방향을 보도록 감는다(없으면 +y) */
  quad(surface: RibbonChunk['surface'], layer: number, a: P3, b: P3, c: P3, d: P3, want: P3 = [0, 1, 0]) {
    const n = cross(sub(b, a), sub(c, a)),
      flip = n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0,
      mx = (a[0] + b[0] + c[0] + d[0]) / 4,
      mz = (a[2] + b[2] + c[2] + d[2]) / 4,
      key = Math.floor(mx / CS) + ',' + Math.floor(mz / CS),
      k = `${key}|${layer}|${surface}`,
      ch = this.map.get(k) ?? (this.map.set(k, {key, layer, surface, positions: [], indices: []}).get(k)!),
      v = ch.positions.length / 3;
    ch.positions.push(...a, ...b, ...c, ...d);
    ch.indices.push(...(flip ? [v, v + 2, v + 1, v, v + 3, v + 2] : [v, v + 1, v + 2, v, v + 2, v + 3]));
  }
  list(): RibbonChunk[] {
    return [...this.map.values()];
  }
}
/** 중심선 표본을 따라 옆 오프셋 t0..t1(오른쪽 +, 접선 (dx,dz) 의 (−dz,dx) 쪽) 띠. skip 이면 격 구간 건너뜀(점선) */
function strip(acc: Acc, s: Smp[], t0: number, t1: number, dy: number, surface: RibbonChunk['surface'], layer = 0, dashed = false) {
  for (let i = 0; i + 1 < s.length; i++) {
    if (dashed && i % 2) continue;
    const dx = s[i + 1].x - s[i].x, dz = s[i + 1].z - s[i].z, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
    const P = (q: Smp, t: number): P3 => [q.x + nx * t, q.y + dy, q.z + nz * t];
    acc.quad(surface, layer, P(s[i], t0), P(s[i], t1), P(s[i + 1], t1), P(s[i + 1], t0));
  }
}
/** 연석 옆면: 오프셋 t 에서 y0→y1, 도로 중심 쪽을 향함 */
function curb(acc: Acc, s: Smp[], t: number, h: number) {
  for (let i = 0; i + 1 < s.length; i++) {
    const dx = s[i + 1].x - s[i].x, dz = s[i + 1].z - s[i].z, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
    const lo = (q: Smp): P3 => [q.x + nx * t, q.y, q.z + nz * t], hi = (q: Smp): P3 => [q.x + nx * t, q.y + h, q.z + nz * t];
    acc.quad('curb', 0, lo(s[i]), lo(s[i + 1]), hi(s[i + 1]), hi(s[i]), [-Math.sign(t) * nx, 0, -Math.sign(t) * nz]);
  }
}
const line = (n: number, f: (u: number) => Smp): Smp[] => Array.from({length: n + 1}, (_, i) => f(i / n));

export interface FixtureMeta {
  /** 지상 도로 총 길이(km) — 삼각형/km 계산용 */
  roadKm: number;
  /** 시험 지점 */
  origin: {x: number; z: number};
  hill: (z: number) => number;
  houseRot: number;
  officeRot: number;
}
export function makeFixture(ox: number, oz: number): {compiled: CityCompiled; buildings: BuildingSource[]; meta: FixtureMeta} {
  const acc = new Acc(),
    X = (x: number) => ox + x,
    Z = (z: number) => oz + z,
    hill = (z: number) => (z <= -5 ? Math.min(-z - 5, 115) * 0.08 : 0);
  const R1W = line(24, u => ({x: X(-100 + u * 95), y: 0, z: Z(0)})),
    R1E = line(24, u => ({x: X(5 + u * 95), y: 0, z: Z(0)})),
    R2S = line(24, u => ({x: X(0), y: 0, z: Z(5 + u * 95)})),
    R2N = line(30, u => ({x: X(0), y: hill(-5 - u * 115), z: Z(-5 - u * 115)})),
    BR = line(20, u => ({x: X(-40 + u * 80), y: 12, z: Z(-60)}));
  // 지상 도로: 차도·연석·보도·도료
  for (const s of [R1W, R1E, R2S, R2N]) {
    strip(acc, s, -5, 5, 0, 'asphalt');
    strip(acc, s, -8, -5, 0.15, 'sidewalk');
    strip(acc, s, 5, 8, 0.15, 'sidewalk');
    curb(acc, s, -5, 0.15);
    curb(acc, s, 5, 0.15);
    strip(acc, s, -0.1, 0.1, 0.02, 'marking', 0, true);
  }
  strip(acc, R1W, 8, 9.5, 0, 'shoulder');
  strip(acc, R2S, -0.6, 0.6, 0.15, 'median');
  // 교차로 포장면과 모서리 보도
  acc.quad('asphalt', 0, [X(-5), 0, Z(-5)], [X(-5), 0, Z(5)], [X(5), 0, Z(5)], [X(5), 0, Z(-5)]);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
    acc.quad('sidewalk', 0, [X(sx * 5), 0.15, Z(sz * 5)], [X(sx * 5), 0.15, Z(sz * 8)], [X(sx * 8), 0.15, Z(sz * 8)], [X(sx * 8), 0.15, Z(sz * 5)]);
  // 횡단보도(R1 동쪽 팔): 줄무늬 6개
  for (let i = 0; i < 6; i++) {
    const z0 = -4 + i * 1.6;
    acc.quad('crosswalk', 0, [X(8.5), 0.03, Z(z0)], [X(8.5), 0.03, Z(z0 + 0.8)], [X(11.5), 0.03, Z(z0 + 0.8)], [X(11.5), 0.03, Z(z0)]);
  }
  // 다리: 데크 ±7 + 그 위 차도 ±5 (layer 1)
  strip(acc, BR, -7, 7, 0, 'deck', 1);
  strip(acc, BR, -5, 5, 0.02, 'asphalt', 1);

  const road = (id: string, s: Smp[], layer: number, kind: 'ground' | 'bridge'): CompiledRoad => {
    let acc2 = 0;
    const samples: RoadSample[] = s.map((q, i) => {
      if (i) acc2 += Math.hypot(q.x - s[i - 1].x, q.z - s[i - 1].z);
      const n = s[Math.min(i + 1, s.length - 1)], p = s[Math.max(i - 1, 0)];
      return {s: acc2, x: q.x, y: q.y, z: q.z, yaw: Math.atan2(n.x - p.x, n.z - p.z), hwL: kind === 'bridge' ? 7 : 8, hwR: kind === 'bridge' ? 7 : 8, grade: (n.y - p.y) / Math.max(1e-6, Math.hypot(n.x - p.x, n.z - p.z))};
    });
    return {id, cls: 'arterial2', curve: 'line', length: acc2, samples, segments: [{id: id + '-s0', i0: 0, i1: samples.length - 1, layer, kind}]};
  };
  const roads = [road('R1W', R1W, 0, 'ground'), road('R1E', R1E, 0, 'ground'), road('R2S', R2S, 0, 'ground'), road('R2N', R2N, 0, 'ground'), road('B1', BR, 1, 'bridge')];
  const roadKm = roads.filter(r => r.id !== 'B1').reduce((a, r) => a + r.length, 0) / 1000;

  // 소품
  const pl: Placement[] = [];
  let n = 0;
  const put = (asset: string, kind: Placement['kind'], x: number, y: number, z: number, rot: number, owner: string, scale?: number) =>
    pl.push({id: `p${n++}`, asset, kind, x: X(x), y, z: Z(z), rot, owner, ...(scale ? {scale} : {})});
  for (let x = -90; x <= 90; x += 24) {
    if (Math.abs(x) < 14) continue;
    put('lamp.street', 'lamp', x, 0.15, -7.2, -90, 'R1'); // 북쪽 보도: 팔(+x 로컬)이 남쪽(+z)을 향하도록 −90°
    if (Math.abs(x + 12) >= 14 && Math.abs(x + 12) <= 95) put('lamp.street', 'lamp', x + 12, 0.15, 7.2, 90, 'R1'); // 남쪽 보도: 팔이 북쪽(−z)
  }
  for (let z = -20; z >= -115; z -= 24) for (const sx of [-1, 1]) put(sx > 0 ? 'tree.round' : 'tree.pine', 'tree', sx * 6.5, hill(z) + 0.15, z, 37 * (z % 7), 'R2');
  put('tree.weird', 'tree', -14, 0, 14, 0, 'plaza'); // 모르는 asset 이지만 kind 로 기본 에셋
  put('mystery', 'other', 14, 0, -14, 0, 'plaza'); // 모르는 asset·kind → 건너뜀(통계)
  put('bench.wood', 'bench', -7, 0.15, 11, 90, 'R2'); // 정면(+z 로컬)이 도로(+x)를 향하도록 90°
  put('bench.wood', 'bench', 7, hill(-11) + 0.15, -11, -90, 'R2'); // 정면이 −x
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) put('signal.pole', 'signal', sx * 7.3, 0.15, sz * 7.3, 0, 'J0');
  put('sign.road', 'sign', 6.5, 0.15, 30, 0, 'R2');
  put('bin.street', 'bin', -6.5, 0.15, 40, 0, 'R2');
  put('bollard.short', 'bollard', 6, 0.15, 60, 0, 'R2');
  put('bollard.short', 'bollard', 6, 0.15, 63, 0, 'R2');
  put('barrier.fence', 'other', 55, 0, -18, 15, 'R1');
  put('shrub.round', 'shrub', -20, 0, 14, 0, 'plaza');
  put('shrub.round', 'shrub', -22, 0, 16, 0, 'plaza');
  // 건물 3채(회전 2 + 고층 1)
  const bsrc = (id: string, x: number, z: number, w: number, d: number, rot: number, floors: number, style: BuildingSource['style']): BuildingSource => ({
    id, x: X(x), z: Z(z), w, d, rot, floors, style, interior: {mode: 'virtual', door: {x: 0, z: d / 2, w: 1, h: 2.1, facing: 's'}, floors, floorH: 3},
  });
  const buildings = [bsrc('bld-house', -30, -25, 10, 8, 30, 2, 'house'), bsrc('bld-office', 30, 28, 16, 12, -20, 3, 'office'), bsrc('bld-tower', -45, 45, 20, 20, 0, 12, 'highrise')];
  for (const b of buildings) pl.push({id: b.id, asset: 'building.' + b.style, kind: 'building', x: b.x, y: 0, z: b.z, rot: b.rot, owner: b.id});

  // 컴파일 충돌체: 집(회전 박스) · 첫 가로수 줄기 · 다리 난간(고가 층). 나머지는 렌더가 에셋 기본값으로 파생한다
  const colliders: Collider[] = [
    {owner: 'bld-house', shape: {t: 'obb', cx: X(-30), cz: Z(-25), hw: 5, hd: 4, rotDeg: 30}, y0: -2, y1: 9, required: true},
    {owner: 'R2', shape: {t: 'circle', cx: X(6.5), cz: Z(-20), r: 0.35}, y0: hill(-20), y1: hill(-20) + 3, required: true},
    {owner: 'B1', shape: {t: 'aabb', x0: X(-40), z0: Z(-67.1), x1: X(40), z1: Z(-66.9)}, y0: 12, y1: 13.1, required: true},
  ];
  const compiled: CityCompiled = {
    header: {compiledVersion: 1, schemaVersion: 1, cityRevision: 1, generatorVersion: 1, seed: 1, sourceHash: 'fixture', chunkSize: CS},
    bounds: [], terrain: {cell: 5, x0: 0, z0: 0, cols: 0, rows: 0, heightData: ''},
    roads, ribbons: acc.list(), placements: pl, colliders, graph: {nodes: [], edges: []}, parking: [], rejected: [{owner: 'fx', code: 'demo', msg: 'x'}],
  };
  return {compiled, buildings, meta: {roadKm, origin: {x: ox, z: oz}, hill, houseRot: 30, officeRot: -20}};
}
