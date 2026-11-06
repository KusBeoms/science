// Collider[] → core/terrain.ts 소유자 API(replaceSolids). 소유자 ID 는 `${ns}${collider.owner}` — dispose 가 이 접두의 모든 소유자를 제거한다.
// 각도 규약: Collider.obb.rotDeg 와 Placement.rot 는 BuildingSource.rot 와 같다(three rotation.y, +z 가 +x 로 도는 쪽). core/solids.ts 는 수학 각이라 등록 때 부호를 뒤집는다.
// 원(circle): solids 에 원이 없어 반경 r 에 내접하는 정사각형 2개(0°, 45°)의 합 = 정팔각형(외접 1.082r, 항상 원보다 크거나 같다)으로 근사한다.
// 층: y 범위가 데크(다리·램프) 위에 있으면 up(고가 전용, y 없는 질의는 무시), 아니면 지상 층(lo = y0−0.6, hi = y1).
import {deckHeights} from '../../core/deck.js';
import {removeSolidsByOwner, replaceSolids, type SolidSpec} from '../../core/solids.js';
import type {Collider, ColliderShape} from '../../data/city-compiled.js';
import {REQUIRED_KINDS} from './assets.js';
import type {ResolvedPlacement} from './placements.js';
import type {BuiltBuilding} from './buildings.js';

export interface ColliderStats {
  /** 입력(컴파일 데이터) 충돌체 수 */
  input: number;
  aabb: number;
  obb: number;
  circle: number;
  /** core/solids 에 실제 등록한 충돌체 수(원은 2개) */
  solids: number;
  /** required=true 인 충돌체 수(파생 포함) */
  required: number;
  /** 컴파일 데이터에 없어 에셋 기본값으로 만든 필수 충돌 */
  derivedProps: number;
  derivedBuildings: number;
  /** 고가(up) 층으로 등록한 수 */
  elevated: number;
  /** 형식이 잘못돼 건너뛴 수 */
  bad: number;
  owners: number;
}
export interface ColliderReg {
  stats: ColliderStats;
  owners: string[];
  /** 한 소유자의 충돌체를 통째로 교체(새것 먼저 등록 → 옛것 제거, 원자적) */
  replaceOwner(owner: string, list: readonly Collider[]): void;
  dispose(): void;
}

const finite = (...v: number[]) => v.every(Number.isFinite);
function valid(c: Collider): boolean {
  const s = c?.shape as ColliderShape | undefined;
  if (!s || typeof c.owner !== 'string' || !finite(c.y0, c.y1)) return false;
  if (s.t === 'aabb') return finite(s.x0, s.z0, s.x1, s.z1) && s.x1 >= s.x0 && s.z1 >= s.z0;
  if (s.t === 'obb') return finite(s.cx, s.cz, s.hw, s.hd, s.rotDeg) && s.hw >= 0 && s.hd >= 0;
  if (s.t === 'circle') return finite(s.cx, s.cz, s.r) && s.r > 0;
  return false;
}
const centerOf = (s: ColliderShape): [number, number] => (s.t === 'aabb' ? [(s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2] : [s.cx, s.cz]);

/** 충돌체 한 건 → core/solids 입력(들) */
function toSpecs(c: Collider): {specs: SolidSpec[]; up: boolean} {
  const s = c.shape,
    [cx, cz] = centerOf(s),
    up = deckHeights(cx, cz).some(h => c.y0 >= h - 1.5),
    lay = up ? {lo: c.y0 - 0.2, hi: c.y1, up: true} : {lo: c.y0 - 0.6, hi: c.y1};
  if (s.t === 'aabb') return {specs: [{x0: s.x0, z0: s.z0, x1: s.x1, z1: s.z1, ...lay}], up};
  if (s.t === 'obb') return {specs: [{cx: s.cx, cz: s.cz, hx: s.hw, hz: s.hd, rotDeg: -s.rotDeg, ...lay}], up};
  return {specs: [{cx: s.cx, cz: s.cz, hx: s.r, hz: s.r, rotDeg: 0, ...lay}, {cx: s.cx, cz: s.cz, hx: s.r, hz: s.r, rotDeg: 45, ...lay}], up};
}

/** 컴파일 충돌체가 덮지 않은 필수 소품·건물에 에셋 기본 충돌을 만든다. 반환 목록 = 컴파일 목록 + 파생 */
export function planColliders(
  compiled: readonly Collider[],
  props: readonly ResolvedPlacement[],
  buildings: readonly BuiltBuilding[],
  derive = true,
): {list: Collider[]; derivedProps: number; derivedBuildings: number} {
  const list = [...compiled];
  if (!derive) return {list, derivedProps: 0, derivedBuildings: 0};
  // 8m 칸 해시: 칸 → 그 칸을 지나는 컴파일 충돌체의 감싸는 상자
  const CELL = 8, grid = new Map<string, number[][]>();
  for (const c of compiled) {
    if (!valid(c)) continue;
    const s = c.shape;
    const b = s.t === 'aabb' ? [s.x0, s.z0, s.x1, s.z1] : s.t === 'circle' ? [s.cx - s.r, s.cz - s.r, s.cx + s.r, s.cz + s.r] : (() => {
      const a = (s.rotDeg * Math.PI) / 180, ex = Math.abs(Math.cos(a)) * s.hw + Math.abs(Math.sin(a)) * s.hd, ez = Math.abs(Math.sin(a)) * s.hw + Math.abs(Math.cos(a)) * s.hd;
      return [s.cx - ex, s.cz - ez, s.cx + ex, s.cz + ez];
    })();
    for (let i = Math.floor(b[0] / CELL); i <= Math.floor(b[2] / CELL); i++)
      for (let j = Math.floor(b[1] / CELL); j <= Math.floor(b[3] / CELL); j++) {
        const k = i + ',' + j;
        (grid.get(k) || grid.set(k, []).get(k)!).push([...b, c.y0, c.y1]);
      }
  }
  const covered = (x: number, z: number, y: number) =>
    (grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL)) ?? []).some(b => x >= b[0] - 0.05 && x <= b[2] + 0.05 && z >= b[1] - 0.05 && z <= b[3] + 0.05 && y >= b[4] - 1.5 && y <= b[5]);
  let derivedProps = 0, derivedBuildings = 0;
  for (const {p, def} of props) {
    if (!def.collide || !REQUIRED_KINDS.has(def.kind) || covered(p.x, p.z, p.y + 0.3)) continue;
    const k = def.collide, s = p.scale ?? 1;
    list.push({
      owner: p.owner,
      shape: k.t === 'circle' ? {t: 'circle', cx: p.x, cz: p.z, r: k.r * s} : {t: 'obb', cx: p.x, cz: p.z, hw: k.hw * s, hd: k.hd * s, rotDeg: p.rot},
      y0: p.y, y1: p.y + k.h * s, required: true,
    });
    derivedProps++;
  }
  for (const b of buildings) {
    if (covered(b.x, b.z, b.y + 0.3)) continue;
    list.push({owner: b.owner, shape: {t: 'obb', cx: b.x, cz: b.z, hw: b.w / 2, hd: b.d / 2, rotDeg: b.rot}, y0: b.y - 4, y1: b.y + b.height, required: true});
    derivedBuildings++;
  }
  return {list, derivedProps, derivedBuildings};
}

/** 목록을 소유자별로 묶어 replaceSolids. 데크가 먼저 등록돼 있어야 up 판정이 맞다 */
export function registerColliders(list: readonly Collider[], ns: string, extra?: {derivedProps?: number; derivedBuildings?: number; input?: number}): ColliderReg {
  const stats: ColliderStats = {input: extra?.input ?? list.length, aabb: 0, obb: 0, circle: 0, solids: 0, required: 0, derivedProps: extra?.derivedProps ?? 0, derivedBuildings: extra?.derivedBuildings ?? 0, elevated: 0, bad: 0, owners: 0};
  const owners = new Set<string>();
  const count = (list: readonly Collider[]): Map<string, SolidSpec[]> => {
    const m = new Map<string, SolidSpec[]>();
    for (const c of list) {
      if (!valid(c)) {
        stats.bad++;
        continue;
      }
      const {specs, up} = toSpecs(c);
      stats[c.shape.t]++;
      stats.solids += specs.length;
      if (c.required) stats.required++;
      if (up) stats.elevated++;
      (m.get(ns + c.owner) || m.set(ns + c.owner, []).get(ns + c.owner)!).push(...specs);
    }
    return m;
  };
  count(list).forEach((specs, o) => {
    replaceSolids(o, specs);
    owners.add(o);
  });
  stats.owners = owners.size;
  return {
    stats,
    get owners() {
      return [...owners];
    },
    replaceOwner(owner, l) {
      const o = ns + owner;
      const m = count(l.map(c => ({...c, owner})));
      replaceSolids(o, m.get(o) ?? []);
      owners.add(o);
      stats.owners = owners.size;
    },
    dispose() {
      owners.forEach(o => removeSolidsByOwner(o));
      owners.clear();
    },
  };
}
