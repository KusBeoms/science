// 온사이트 실내 배치 계획 (W8 INTERIOR) — 메시 없이 좌표만. 건물 발자국에서 내부 면적을 구하고, 기존 가구 목록(render/interior.ts furnish)을
// 실제 축척(×K)으로 줄여 내부 면적 안에 맞추며, 칸막이(템플릿)와 문 앞 통로를 지킨다.
// 좌표계: "가구 프레임" = 문이 +Z 벽 가운데인 방(기존 furnish 규약). 건물 로컬로 옮길 때는 문 있는 벽의 ry 만큼 돌린다(90° 단위).
// 규칙: 내부 영역 밖으로 나가는 가구는 버린다(발자국 밖으로 삐져나오는 일 없음), 문 앞 통로·칸막이와 겹치는 가구도 버린다. 버린 가구에 딸린 상호작용 지점도 버린다.
import {PURPOSE_INFO, type Purpose} from '../data/interiors.js';
import type {BuildingSource} from '../data/city-schema.js';
import {furnish, type Item, type Spot} from './interior.js';
import type {ShellPlan} from './citygen/shell-plan.js';
import {sideFrame} from './citygen/shell-plan.js';

/** 기존 가구는 층고 5.2u·키 2.3u 기준이라 실제 층고 3.0m 에 맞춰 줄인다 */
export const FURN_K = 0.6;
/** 벽 안쪽 마감판(liner) 두께 — 가구는 이만큼 더 떨어진다 */
export const LINER = 0.04;

export interface LocalBox {
  cx: number; cz: number; hx: number; hz: number;
  /** 마감 바닥(floorTop) 기준 상대 높이 */
  y0: number; y1: number;
}
export interface Rect { x0: number; z0: number; x1: number; z1: number }
export interface RoomPlan {
  purpose: Purpose;
  /** 문 있는 벽의 회전(가구 프레임 → 건물 로컬) */
  ry: number;
  /** 가구 프레임의 실제 크기(m) */
  vw: number; vd: number;
  /** 줄인 가구(가구 프레임) · 줄이기 전 가구(장식 빌더 입력) */
  items: Item[];
  virtualItems: Item[];
  partitions: Rect[];
  spots: Spot[];
  /** 충돌 상자(건물 로컬) — 가구 + 칸막이 */
  boxes: LocalBox[];
  /** 건물 로컬 지점 */
  localSpots: Spot[];
  /** 남긴 가구의 건물 로컬 AABB (시험: 내부 영역 안에 있는지) */
  itemRects: Rect[];
  /** 내부 유효 영역 반폭(건물 로컬, liner 제외) */
  hx: number; hz: number;
  dropped: number;
}
const PARTITION_BACK: Partial<Record<Purpose, number>> = {house: 0.42, apartment: 0.42, office: 0.34, lab: 0.34};
const overlap = (a: Rect, b: Rect, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
const rectOf = (i: Item): Rect => ({x0: i.x - i.w / 2, z0: i.z - i.d / 2, x1: i.x + i.w / 2, z1: i.z + i.d / 2});
const dist = (r: Rect, x: number, z: number) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));

/** 건물 용도: 소스 purpose 가 알려진 것이면 그것, 아니면 양식으로 */
export function purposeOfSource(src: BuildingSource): Purpose {
  if (src.purpose && Object.prototype.hasOwnProperty.call(PURPOSE_INFO, src.purpose)) return src.purpose as Purpose;
  switch (src.style) {
    case 'shop': return 'shop';
    case 'office': case 'civic': return 'office';
    case 'apartment': return 'apartment';
    default: return 'house';
  }
}
export function planRoom(p: ShellPlan, purpose: Purpose, seed: number): RoomPlan {
  const side = p.door.side,
    f = sideFrame(side, p.w, p.d, p.t),
    c = Math.round(Math.cos(f.ry)), s = Math.round(Math.sin(f.ry)),
    iw = p.w - 2 * p.t - 2 * LINER, id = p.d - 2 * p.t - 2 * LINER,
    along = side === 's' || side === 'n',
    vw = along ? iw : id, vd = along ? id : iw, // 가구 프레임 크기
    spotsV: Spot[] = [],
    itemsV = furnish(purpose, vw / FURN_K, vd / FURN_K, seed, spotsV),
    K = FURN_K,
    hxF = vw / 2 + 0.01, hzF = vd / 2 + 0.01;
  const toLocal = (X: number, Z: number) => ({x: X * c + Z * s, z: -X * s + Z * c});
  const scaled: Item[] = itemsV.map(i => ({...i, x: i.x * K, z: i.z * K, w: i.w * K, d: i.d * K, h: i.h * K, y: i.y !== undefined ? i.y * K : undefined}));
  // 칸막이: 뒤쪽 방을 나누고 문간(폭 1.0)을 하나 둔다
  const partitions: Rect[] = [],
    back = PARTITION_BACK[purpose];
  if (back && vw >= 4.2 && vd >= 5.2) {
    const zp = -vd / 2 + vd * back, gap0 = -vw * 0.25 - 0.5, th = 0.05;
    partitions.push({x0: -vw / 2, z0: zp - th, x1: gap0, z1: zp + th}, {x0: gap0 + 1.0, z0: zp - th, x1: vw / 2, z1: zp + th});
  }
  // 문 앞 통로: 문 폭 + 양옆 0.5, 깊이 1.8
  const clear: Rect = {x0: p.door.u - p.door.w / 2 - 0.5, x1: p.door.u + p.door.w / 2 + 0.5, z0: vd / 2 - 1.8, z1: vd / 2};
  const kept: Item[] = [], gone: Rect[] = [];
  let dropped = 0;
  for (const i of scaled) {
    const r = rectOf(i);
    const inside = r.x0 >= -hxF && r.x1 <= hxF && r.z0 >= -hzF && r.z1 <= vd / 2 + 0.01;
    const bad = !inside || (i.y ?? 0) < 1.2 && overlap(r, clear) || partitions.some(q => overlap(r, q, 0.25));
    if (bad) { dropped++; gone.push(r); } else kept.push(i);
  }
  const keptRects = kept.map(rectOf);
  const spots = spotsV.map(sp => ({...sp, x: sp.x * K, z: sp.z * K})).filter(sp => {
    if (Math.abs(sp.x) > hxF - 0.3 || Math.abs(sp.z) > hzF - 0.3) return false;
    const dg = Math.min(Infinity, ...gone.map(r => dist(r, sp.x, sp.z))), dk = Math.min(Infinity, ...keptRects.map(r => dist(r, sp.x, sp.z)));
    return dk <= dg || dg > 1.4; // 가장 가까운 가구가 버려진 것이면 지점도 버린다
  });
  // 건물 로컬로
  const boxes: LocalBox[] = [], itemRects: Rect[] = [];
  const addBox = (r: Rect, y0: number, y1: number) => {
    const a = toLocal(r.x0, r.z0), b = toLocal(r.x1, r.z1);
    boxes.push({cx: (a.x + b.x) / 2, cz: (a.z + b.z) / 2, hx: Math.abs(a.x - b.x) / 2, hz: Math.abs(a.z - b.z) / 2, y0, y1});
  };
  kept.forEach((i, k) => {
    const a = toLocal(keptRects[k].x0, keptRects[k].z0), b = toLocal(keptRects[k].x1, keptRects[k].z1);
    itemRects.push({x0: Math.min(a.x, b.x), z0: Math.min(a.z, b.z), x1: Math.max(a.x, b.x), z1: Math.max(a.z, b.z)});
    if (i.solid) addBox(keptRects[k], -0.2, p.ceil);
  });
  partitions.forEach(q => addBox(q, -0.2, p.ceil));
  const localSpots = spots.map(sp => ({...sp, ...toLocal(sp.x, sp.z)}));
  return {
    purpose, ry: f.ry, vw, vd, items: kept, virtualItems: itemsV, partitions, spots, boxes, localSpots, itemRects,
    hx: (p.w - 2 * p.t) / 2, hz: (p.d - 2 * p.t) / 2, dropped,
  };
}
