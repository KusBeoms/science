// 필지(대지) 생성·검증 + 건물 대지 평탄화(pad).
// 대지 = 도로 한쪽에 접한 직사각형(전면 폭 w = 도로 방향 현, 깊이 d). 자동 필지는 구역 용도별 고정 피치의 격자(도로 시작점부터 누적거리 k*pitch)에 놓여,
// 제어점을 삽입해도 슬롯 번호(= ID)가 유지되고 다른 구역의 필지와 겹치지 않는다(대지는 전체가 한 구역 다각형 안에 들어야 한다).
// 거부 사유(코드): slope, altitude, outside-bounds, no-build, junction-reserve, road-overlap, lot-overlap, sight-axis. 구역 밖은 조용히 건너뛴다(통계만).
import type {BuildingStyle, ParcelSource, ZoneSource} from '../data/city-schema.js';
import {distPointSeg, pointInPolygon} from './geom.js';
import type {P2} from './geom.js';
import {obbOverlap, corners, toLocal, aabbOf} from './obb.js';
import type {Obb} from './obb.js';
import type {PlaceCtx} from './place-ctx.js';
import type {Lot, PadRec} from './place-types.js';
import {STYLE_CFG} from './place-cfg.js';
import {pointAt, sideEdges} from './roads.js';
import {siteReport} from './terrain.js';
import type {Terrain} from './terrain.js';

export const JUNCTION_RESERVE = 5;
export const LOT_FRONT_GAP = 0.3;
export interface LotRej { owner: string; code: string; msg: string }
const RAD = Math.PI / 180;

/** 대지 박스의 rot: 로컬 +x = u(전면 방향) → (cosθ, -sinθ) = (ux, uz) → θ = atan2(-uz, ux) */
export const rotOfU = (l: {ux: number; uz: number}): number => Math.atan2(-l.uz, l.ux) / RAD;
export const lotObb = (l: Lot): Obb => ({cx: l.cx, cz: l.cz, hw: l.w / 2, hd: l.d / 2, rot: rotOfU(l)});

export interface Frame { cx: number; cz: number; ux: number; uz: number; vx: number; vz: number; w: number; lat0: number; sMid: number }
export function lotFrame(ctx: PlaceCtx, ri: number, side: 'left' | 'right', s0: number, s1: number, depth: number): Frame | null {
  const r = ctx.roads[ri], right = side === 'right';
  const A = pointAt(r, s0), B = pointAt(r, s1), M = pointAt(r, (s0 + s1) / 2);
  let ux = B.x - A.x, uz = B.z - A.z;
  const w = Math.hypot(ux, uz);
  if (w < 1) return null;
  ux /= w; uz /= w;
  const vx = right ? -uz : uz, vz = right ? ux : -ux;
  const e = (p: ReturnType<typeof pointAt>) => sideEdges(p.sec, 0, right).e5;
  const cmx = (A.x + B.x) / 2, cmz = (A.z + B.z) / 2, sag = (M.x - cmx) * vx + (M.z - cmz) * vz;
  const lat0 = Math.max(e(A), e(B), sag + e(M)) + LOT_FRONT_GAP;
  return {cx: cmx + vx * (lat0 + depth / 2), cz: cmz + vz * (lat0 + depth / 2), ux, uz, vx, vz, w, lat0, sMid: (s0 + s1) / 2};
}
/** 대지 표본점: 중심·모서리·변 중점·전면 1/4 점 */
export function lotSamples(l: {cx: number; cz: number; ux: number; uz: number; vx: number; vz: number; w: number; d: number}, inset = 0): P2[] {
  const hw = l.w / 2 - inset, hd = l.d / 2 - inset, out: P2[] = [];
  for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) out.push([l.cx + l.ux * hw * a + l.vx * hd * b, l.cz + l.uz * hw * a + l.vz * hd * b]);
  for (const a of [-0.5, 0.5]) out.push([l.cx + l.ux * hw * a - l.vx * hd, l.cz + l.uz * hw * a - l.vz * hd]);
  return out;
}
const bboxOf = (p: P2[]): [number, number, number, number] => { const b: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]; for (const q of p) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); } return b; };

/** 대지 한 칸의 도로·교차로·경계·예외·겹침 검사. 통과하면 null, 아니면 {code,msg}. zone 이 주어지면 전체가 구역 안이어야 한다('outside-zone' 은 조용한 건너뛰기) */
export function checkLot(ctx: PlaceCtx, lot: Lot, zonePoly: P2[] | null, selfRoad = lot.ri): {code: string; msg: string} | null {
  const pts = lotSamples(lot);
  if (zonePoly && !pts.every(p => pointInPolygon(p[0], p[1], zonePoly))) return {code: 'outside-zone', msg: ''};
  if (!pts.every(p => ctx.inBounds(p[0], p[1]))) return {code: 'outside-bounds', msg: '대지가 도시 경계(bounds) 밖으로 나간다'};
  for (const e of ctx.src.exceptions) {
    if (e.kind !== 'noBuild') continue;
    const hit = pts.some(p => pointInPolygon(p[0], p[1], e.poly)) || e.poly.some(q => Math.abs((q[0] - lot.cx) * lot.ux + (q[1] - lot.cz) * lot.uz) < lot.w / 2 && Math.abs((q[0] - lot.cx) * lot.vx + (q[1] - lot.cz) * lot.vz) < lot.d / 2);
    if (hit) return {code: 'no-build', msg: `건축 금지 구역 ${e.id}${e.reason ? ' (' + e.reason + ')' : ''}와 겹친다`};
  }
  if (ctx.armHit(lot.ri, lot.sMid - lot.w / 2, lot.sMid + lot.w / 2, JUNCTION_RESERVE)) return {code: 'junction-reserve', msg: '교차로·횡단보도 예약 구간과 겹친다'};
  for (const p of pts) {
    if (ctx.inJunction(p[0], p[1]) >= 0) return {code: 'junction-reserve', msg: '교차로 금지 구역 안'};
    for (const h of ctx.hits(p[0], p[1], 0.2)) if (h.dist < h.e5 + (h.ri === selfRoad ? 0.05 : 0.3)) return {code: 'road-overlap', msg: `도로 ${ctx.roads[h.ri].id} 의 포장·보도 위에 걸친다`};
  }
  const o = lotObb(lot);
  for (const ob of ctx.obstacles(lot.cx, lot.cz, Math.hypot(lot.w, lot.d) / 2 + 1, -1e9, 1e9, ['lot', 'building'])) {
    if (ob.owner === lot.id) continue;
    if (ob.obb ? obbOverlap(o, ob.obb) : false) return {code: 'lot-overlap', msg: `${ob.owner} 와 겹친다`};
  }
  return null;
}

/** 구역 하나의 자동 필지. 슬롯 번호 k = floor(s0 / pitch) */
export function genLots(ctx: PlaceCtx, zone: ZoneSource, style: BuildingStyle): {lots: Lot[]; rej: LotRej[]; tried: number} {
  const cfg = STYLE_CFG[style], lots: Lot[] = [], rej: LotRej[] = [];
  let tried = 0;
  const zb = bboxOf(zone.poly as P2[]), reach = cfg.depth + ctx.maxHW + cfg.pitch;
  const zp = zone.poly as P2[];
  ctx.roads.forEach((r, ri) => {
    if (r.cls === 'expressway') return;
    const bb = ctx.roadBox[ri];
    if (bb[2] < zb[0] - reach || bb[0] > zb[2] + reach || bb[3] < zb[1] - reach || bb[1] > zb[3] + reach) return;
    const ks = new Set<number>();
    for (let i = 0; i < r.n; i += 4) if (r.x[i] > zb[0] - reach && r.x[i] < zb[2] + reach && r.z[i] > zb[1] - reach && r.z[i] < zb[3] + reach) ks.add(Math.floor(r.s[i] / cfg.pitch));
    for (const k of [...ks].sort((a, b) => a - b)) {
      const s0 = k * cfg.pitch, s1 = s0 + cfg.pitch;
      if (s1 > r.length + 0.01) continue;
      const seg = r.segs[r.segIdx[Math.min(r.n - 1, Math.round(((s0 + s1) / 2) / Math.max(1e-6, r.length) * (r.n - 1)))]];
      if (seg.kind !== 'ground' || seg.layer !== 0) continue;
      for (const side of ['left', 'right'] as const) {
        const f = lotFrame(ctx, ri, side, s0, s1, cfg.depth);
        if (!f) continue;
        const lot: Lot = {id: `p-${zone.id}-${r.id}-${side[0]}-${k}`, zone: zone.id, road: r.id, ri, side, t0: s0, t1: s1, depth: cfg.depth, cx: f.cx, cz: f.cz, ux: f.ux, uz: f.uz, vx: f.vx, vz: f.vz, w: f.w, d: cfg.depth, lat0: f.lat0, style, explicit: false, sMid: f.sMid};
        // 대지 중심이 구역 밖이면 이 구역의 후보가 아니다(조용히)
        if (!pointInPolygon(lot.cx, lot.cz, zp)) continue;
        tried++;
        const bad = checkLot(ctx, lot, zp);
        if (bad) { if (bad.code !== 'outside-zone') rej.push({owner: lot.id, code: bad.code, msg: bad.msg}); continue; }
        lots.push(lot);
      }
    }
  });
  return {lots, rej, tried};
}

/** 명시 ParcelSource → Lot (구역은 parcel.zone, 없으면 중심을 포함하는 첫 구역, 양식은 구역 양식 또는 house) */
export function lotFromParcel(ctx: PlaceCtx, p: ParcelSource, style: BuildingStyle): {lot?: Lot; rej?: LotRej} {
  const ri = ctx.byId.get(p.road);
  if (ri === undefined) return {rej: {owner: p.id, code: 'road-missing', msg: `필지의 도로 ${p.road} 가 없거나 거부되었다`}};
  const f = lotFrame(ctx, ri, p.side, p.t0, Math.min(p.t1, ctx.roads[ri].length), p.depth);
  if (!f) return {rej: {owner: p.id, code: 'zero-length', msg: '필지 전면이 너무 짧다'}};
  const lot: Lot = {id: p.id, zone: p.zone ?? '', road: p.road, ri, side: p.side, t0: p.t0, t1: p.t1, depth: p.depth, cx: f.cx, cz: f.cz, ux: f.ux, uz: f.uz, vx: f.vx, vz: f.vz, w: f.w, d: p.depth, lat0: f.lat0, style, explicit: true, sMid: f.sMid};
  const bad = checkLot(ctx, lot, null);
  return bad ? {rej: {owner: p.id, code: bad.code, msg: bad.msg}} : {lot};
}

/** 건물 발자국 대지 판정(경사·고도). 반환 null 이면 통과 */
export function siteCheck(ctx: PlaceCtx, o: Obb): {code: 'slope' | 'altitude'; msg: string; y: number} | {code: null; y: number} {
  const maxS = ctx.opts.maxSlope ?? 0.12, maxA = ctx.opts.maxAlt ?? 40;
  const rep = siteReport(ctx.terrain, o.cx, o.cz, o.hw * 2, o.hd * 2, o.rot, maxS, maxA);
  if (!rep.okAlt) return {code: 'altitude', msg: `발자국 최고 고도 ${rep.maxH.toFixed(1)}m 가 건축 상한 ${maxA}m 를 넘는다`, y: rep.centerH};
  if (!rep.okSlope) return {code: 'slope', msg: `대지 경사 ${(rep.planeSlope * 100).toFixed(1)}% (국지 최대 ${(rep.maxSlope * 100).toFixed(1)}%) 가 한도 ${(maxS * 100).toFixed(0)}% 를 넘는다`, y: rep.centerH};
  return {code: null, y: rep.centerH};
}

// ───────── 대지 평탄화 ─────────
export const PAD_SLOPE = 0.5;
export const PAD_MARGIN = 4.0;
/** 발자국 박스를 margin 만큼 키운 평지 + 바깥은 경사 PAD_SLOPE 포락선(깎기·쌓기). 도로 구역(road 비트 1)은 건드리지 않는다. clamp 이라 멱등 */
export function makePad(id: string, o: Obb, y: number): PadRec {
  return {id, cx: o.cx, cz: o.cz, hw: o.hw + PAD_MARGIN, hd: o.hd + PAD_MARGIN, rot: o.rot, y: Math.round(y * 20) / 20};
}
/** 패드들을 id 순서로 적용(결정적). 영향 칸 수를 돌려준다 */
export function applyPads(t: Terrain, pads: PadRec[]): number {
  let n = 0;
  const list = pads.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const p of list) {
    const R = Math.min(30, 6 / PAD_SLOPE), bb = aabbOf(p), x0 = bb[0] - R, z0 = bb[1] - R, x1 = bb[2] + R, z1 = bb[3] + R;
    const i0 = Math.max(0, Math.floor((x0 - t.x0) / t.cell)), i1 = Math.min(t.cols - 1, Math.ceil((x1 - t.x0) / t.cell));
    const j0 = Math.max(0, Math.floor((z0 - t.z0) / t.cell)), j1 = Math.min(t.rows - 1, Math.ceil((z1 - t.z0) / t.cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const idx = j * t.cols + i;
      if (t.road[idx] & 1) continue;
      const [lx, lz] = toLocal(p, t.x0 + i * t.cell, t.z0 + j * t.cell), dd = Math.hypot(Math.max(Math.abs(lx) - p.hw, 0), Math.max(Math.abs(lz) - p.hd, 0));
      if (dd <= 0) { t.h[idx] = p.y; t.road[idx] |= 2; n++; }
      else if (dd < R) { const env = dd * PAD_SLOPE, h = t.h[idx], c = Math.min(Math.max(h, p.y - env), p.y + env); if (c !== h) { t.h[idx] = c; n++; } }
    }
  }
  return n;
}
export { distPointSeg, corners };
