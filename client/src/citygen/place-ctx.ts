// 배치 단계 공용 문맥: 해석된 도로·교차로·지형 위에 공간 색인(도로 점유, 교차로 금지 구역, 장애물)을 얹는다.
// 도로 점유 조회는 모든 소품·필지·나무·주차가 같은 함수를 지나게 해서 "도로 위에는 아무것도 없음" 규칙을 한 곳에서 지킨다.
import type {CitySource} from '../data/city-schema.js';
import {SpatialHash, offsetPolygon, pointInPolygon} from './geom.js';
import type {P2} from './geom.js';
import type {JunctionGeom} from './junction-geom.js';
import {SEC, pointAt, sideEdges} from './roads.js';
import type {Edges, RoadGeo} from './roads.js';
import {sampleBilinear} from './terrain.js';
import type {Terrain} from './terrain.js';
import {aabbOf, circleHitsObb} from './obb.js';
import type {Obb} from './obb.js';
import type {Interval, PlaceOpts} from './place-types.js';

export const STRIDE = 4;
/** 연석 면 바깥으로 두는 최소 여유(m): 포장 끝(e3)+이 값까지가 차도·연석 영역 */
export const CURB_CLEAR = 0.25;
/** 교차로 보도 모서리 띠까지 덮는 금지 구역 확장(m) */
export const JUNCTION_KEEP = 5.5;
/** 횡단보도가 트림 밖으로 차지하는 거리(m): 0.5 + 폭 3.0 + 여유 */
export const CROSSWALK_EXT = 3.6;

export interface Hit {
  ri: number; s: number; lat: number; dist: number; e3: number; e4: number; e5: number; layer: number; y: number;
}
export interface Obstacle {
  owner: string; kind: 'building' | 'parking' | 'lot' | 'prop';
  obb?: Obb; cx?: number; cz?: number; r?: number; y0: number; y1: number;
}
export interface ArmIv { ri: number; j: number; dir: 1 | -1; sNode: number; trim: number; s0: number; s1: number; crosswalk: boolean }

export class PlaceCtx {
  readonly byId = new Map<string, number>();
  readonly keep: (P2[] | null)[] = [];
  readonly arms = new Map<number, ArmIv[]>();
  readonly bounds: P2[];
  readonly box: [number, number, number, number];
  readonly maxHW: number;
  private idx = new SpatialHash<number>(24);
  private jIdx = new SpatialHash<number>(32);
  private obs = new SpatialHash<number>(16);
  private obsList: Obstacle[] = [];
  readonly roadBox: [number, number, number, number][] = [];
  readonly layerOf: (ri: number, i: number) => number;
  constructor(readonly src: CitySource, readonly roads: RoadGeo[], readonly juncs: JunctionGeom[], readonly terrain: Terrain, readonly opts: PlaceOpts) {
    this.bounds = src.bounds.map(p => [p[0], p[1]] as P2);
    this.box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of this.bounds) { this.box[0] = Math.min(this.box[0], p[0]); this.box[1] = Math.min(this.box[1], p[1]); this.box[2] = Math.max(this.box[2], p[0]); this.box[3] = Math.max(this.box[3], p[1]); }
    this.layerOf = (ri, i) => roads[ri].segs[roads[ri].segIdx[i]].layer;
    let mhw = 0;
    roads.forEach((r, ri) => {
      this.byId.set(r.id, ri);
      const bb: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
      for (let i = 0; i < r.n - 1; i += STRIDE) {
        const j = Math.min(i + STRIDE, r.n - 1);
        this.idx.insert(Math.min(r.x[i], r.x[j]), Math.min(r.z[i], r.z[j]), Math.max(r.x[i], r.x[j]), Math.max(r.z[i], r.z[j]), ri * 32768 + i / STRIDE);
        bb[0] = Math.min(bb[0], r.x[i], r.x[j]); bb[1] = Math.min(bb[1], r.z[i], r.z[j]); bb[2] = Math.max(bb[2], r.x[i], r.x[j]); bb[3] = Math.max(bb[3], r.z[i], r.z[j]);
        const e = sideEdges(r.sec, i * SEC.N, true), f = sideEdges(r.sec, i * SEC.N, false);
        mhw = Math.max(mhw, e.e5, f.e5);
      }
      this.roadBox.push(bb);
    });
    this.maxHW = mhw;
    juncs.forEach((j, k) => {
      let kp: P2[] | null = null;
      if (j.polygon.length >= 3) { const o = offsetPolygon(j.polygon, JUNCTION_KEEP); kp = o.length >= 3 ? o : j.polygon; }
      this.keep.push(kp);
      if (kp) { let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (const p of kp) { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); } this.jIdx.insert(x0, z0, x1, z1, k); }
      for (const a of j.arms) {
        const ri = this.byId.get(a.roadId);
        if (ri === undefined) continue;
        const cw = j.crosswalks.length > 0, ext = cw ? CROSSWALK_EXT : 0;
        const iv: ArmIv = {ri, j: k, dir: a.dir, sNode: a.sNode, trim: a.trim, s0: a.dir === 1 ? a.sNode : a.sNode - a.trim - ext, s1: a.dir === 1 ? a.sNode + a.trim + ext : a.sNode, crosswalk: cw};
        const l = this.arms.get(ri); if (l) l.push(iv); else this.arms.set(ri, [iv]);
      }
    });
    for (const l of this.arms.values()) l.sort((a, b) => a.s0 - b.s0 || a.j - b.j);
  }

  groundY(x: number, z: number): number { return sampleBilinear(this.terrain, x, z); }
  inBounds(x: number, z: number): boolean { return x >= this.box[0] && x <= this.box[2] && z >= this.box[1] && z <= this.box[3] && pointInPolygon(x, z, this.bounds); }
  edgesAt(ri: number, i: number, right: boolean): Edges { return sideEdges(this.roads[ri].sec, i * SEC.N, right); }

  /** 점 (x,z) 에서 반경 rad 안에 포장 외곽(e5)이 걸리는 도로 조각들(도로마다 가장 가까운 하나) */
  hits(x: number, z: number, rad = 0): Hit[] {
    const R = rad + this.maxHW + 2, best = new Map<number, Hit>(), seen = new Set<number>();
    for (const code of this.idx.query(x - R, z - R, x + R, z + R)) {
      if (seen.has(code)) continue;
      seen.add(code);
      const ri = Math.floor(code / 32768), i = (code % 32768) * STRIDE, r = this.roads[ri], j = Math.min(i + STRIDE, r.n - 1);
      const dx = r.x[j] - r.x[i], dz = r.z[j] - r.z[i], l2 = dx * dx + dz * dz;
      if (l2 < 1e-12) continue;
      const f = Math.min(1, Math.max(0, ((x - r.x[i]) * dx + (z - r.z[i]) * dz) / l2)), px = r.x[i] + dx * f, pz = r.z[i] + dz * f;
      const d = Math.hypot(x - px, z - pz);
      const cur = best.get(ri);
      if (cur && cur.dist <= d) continue;
      const l = Math.sqrt(l2), lat = ((x - px) * -dz + (z - pz) * dx) / l;
      const k = f < 0.5 ? i : j, e = sideEdges(r.sec, k * SEC.N, lat >= 0);
      if (d - rad >= e.e5) continue;
      best.set(ri, {ri, s: r.s[i] + f * (r.s[j] - r.s[i]), lat: lat >= 0 ? d : -d, dist: d, e3: e.e3, e4: e.e4, e5: e.e5, layer: this.layerOf(ri, k), y: r.y[i] + (r.y[j] - r.y[i]) * f});
    }
    return [...best.values()].sort((a, b) => a.ri - b.ri);
  }
  /** 반경 rad 의 원이 같은 층 차도·연석(포장 끝 + 연석 여유)에 닿는가 */
  onPavement(x: number, z: number, rad: number, layer = 0): Hit | null {
    for (const h of this.hits(x, z, rad)) if (h.layer === layer && h.dist - rad < h.e3 + CURB_CLEAR) return h;
    return null;
  }
  /** 높이 층 검사: 지면의 점 (x,z,y) 위로 높이 h 안에 다른 층의 상판이 있는가 */
  underDeck(x: number, z: number, y: number, h: number, layer = 0): boolean {
    for (const t of this.hits(x, z, 0)) if (t.layer !== layer && t.y > y - 0.2 && t.y - y < h + 0.6) return true;
    return false;
  }
  /** 교차로 금지 구역(포장+보도 모서리 여유)에 든 교차로 인덱스, 없으면 -1 */
  inJunction(x: number, z: number, extra = 0): number {
    for (const k of new Set(this.jIdx.query(x - extra, z - extra, x + extra, z + extra))) {
      const p = this.keep[k];
      if (p && pointInPolygon(x, z, p)) return k;
    }
    return -1;
  }
  junctionNear(x: number, z: number, r: number): number {
    for (const k of new Set(this.jIdx.query(x - r, z - r, x + r, z + r))) {
      const p = this.keep[k];
      if (!p) continue;
      for (const q of p) if (Math.hypot(q[0] - x, q[1] - z) < r) return k;
      if (pointInPolygon(x, z, p)) return k;
    }
    return -1;
  }

  // ── 장애물 레지스트리 ──
  addObstacle(o: Obstacle): void {
    const n = this.obsList.push(o) - 1;
    if (o.obb) { const b = aabbOf(o.obb); this.obs.insert(b[0], b[1], b[2], b[3], n); }
    else this.obs.insert(o.cx! - o.r!, o.cz! - o.r!, o.cx! + o.r!, o.cz! + o.r!, n);
  }
  removeOwner(owner: string): void {
    // 지연 삭제: 목록에서 owner 를 비운다(색인은 그대로 두고 조회 때 거른다)
    for (const o of this.obsList) if (o.owner === owner) o.owner = '';
  }
  /** 반경 r 원과 겹치는 장애물(높이 범위가 겹치는 것만). kinds 로 거른다 */
  obstacles(x: number, z: number, r: number, y0 = -1e9, y1 = 1e9, kinds?: Obstacle['kind'][]): Obstacle[] {
    const out: Obstacle[] = [];
    for (const n of new Set(this.obs.query(x - r, z - r, x + r, z + r))) {
      const o = this.obsList[n];
      if (!o.owner || (kinds && !kinds.includes(o.kind)) || o.y1 < y0 || o.y0 > y1) continue;
      if (o.obb ? circleHitsObb(o.obb, x, z, r) : Math.hypot(x - o.cx!, z - o.cz!) < r + o.r!) out.push(o);
    }
    return out;
  }
  /** 도로 s 구간 [s0,s1] 가 금지 구간들과 겹치는가 */
  armHit(ri: number, s0: number, s1: number, pad = 0): ArmIv | null {
    for (const a of this.arms.get(ri) ?? []) if (a.s1 + pad > s0 && a.s0 - pad < s1) return a;
    return null;
  }
  /** 도로 위 한 점의 위치: s, 가로 거리 lat(+오른쪽) → x,y,z + 접선 */
  at(ri: number, s: number, lat: number): {x: number; y: number; z: number; tx: number; tz: number} {
    const p = pointAt(this.roads[ri], s);
    return {x: p.x - p.tz * lat, y: p.y, z: p.z + p.tx * lat, tx: p.tx, tz: p.tz};
  }
}
export type { Interval };
