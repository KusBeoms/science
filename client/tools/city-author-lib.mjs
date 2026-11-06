// city-author 공용 도우미: 컴파일된 게임 모듈 로딩(상수 일치 보장), 벡터·다각형·등고선 기하.
// 사전 조건: `cd client && npx tsc` (public/js 가 있어야 한다). 순수·결정적 — 난수 없음.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const PUB = path.join(here, '..', 'public');
const imp = rel => import(pathToFileURL(path.join(PUB, 'js', rel)).href);

/** 게임 상수·빌더 모듈을 한 번에 불러온다 */
export async function loadCtx() {
  const [O, BR, MR, SC, PL, G, T, C, SCH, GM] = await Promise.all([
    imp('data/outline.js'), imp('data/bridge.js'), imp('data/mountain-road.js'), imp('data/soccer.js'), imp('core/plaza.js'),
    imp('citygen/geom.js'), imp('citygen/terrain.js'), imp('data/city-terrain-codec.js'), imp('data/city-schema.js'), imp('citygen/build.js'),
  ]);
  const file = JSON.parse(fs.readFileSync(path.join(PUB, 'data', 'city-terrain.json'), 'utf8'));
  const dec = C.decodeTerrain(file);
  const grid = {cell: dec.step, x0: dec.origin.x, z0: dec.origin.z, cols: dec.nx, rows: dec.nz, encoding: 'delta-cm-b64', ref: 'data/city-terrain.json'};
  return {O, BR, MR, SC, PL, G, T, C, SCH, GM, grid, baseCm: dec.cm, land: dec.land};
}

// ───────── 벡터 ─────────
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const len = a => Math.hypot(a[0], a[1]);
export const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** 오른쪽 법선(진행 방향 기준, x동+ z남+) */
export const nR = a => [-a[1], a[0]];
export const dirDeg = deg => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
export const polar = (c, r, deg) => [c[0] + r * Math.cos((deg * Math.PI) / 180), c[1] + r * Math.sin((deg * Math.PI) / 180)];
export const rnd1 = v => Math.round(v * 10) / 10;
export const rpt = p => [rnd1(p[0]), rnd1(p[1])];

// ───────── 선분·다각형 ─────────
export function segHit(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-12) return null;
  const qx = c[0] - a[0], qz = c[1] - a[1], t = (qx * sz - qz * sx) / den, u = (qx * rz - qz * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return {t, u, p: [a[0] + rx * t, a[1] + rz * t]};
}
export function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
export function distSeg(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
}
export function distPoly(p, poly, closed = true) {
  let m = Infinity;
  const n = closed ? poly.length : poly.length - 1;
  for (let i = 0; i < n; i++) m = Math.min(m, distSeg(p, poly[i], poly[(i + 1) % poly.length]));
  return m;
}
export const polyLen = (pts, closed = false) => { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]); return closed ? s + dist(pts[pts.length - 1], pts[0]) : s; };
export function area(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const q = poly[(i + 1) % poly.length]; s += poly[i][0] * q[1] - q[0] * poly[i][1]; } return s / 2; }
export function centroid(poly) { const n = poly.length; return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n]; }
/** 직선(점 o, 방향 d)이 다각형 안에 놓이는 구간들: [{t0,t1}] */
export function clipLineToPoly(o, d, poly) {
  const ts = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ez = b[1] - a[1], den = d[0] * ez - d[1] * ex;
    if (Math.abs(den) < 1e-12) continue;
    const qx = a[0] - o[0], qz = a[1] - o[1], t = (qx * ez - qz * ex) / den, u = (qx * d[1] - qz * d[0]) / den;
    if (u >= 0 && u < 1) ts.push(t);
  }
  ts.sort((x, y) => x - y);
  const out = [];
  for (let i = 0; i + 1 < ts.length; i += 2) if (ts[i + 1] - ts[i] > 1e-6) out.push({t0: ts[i], t1: ts[i + 1]});
  return out;
}
/** 꺾은선과 다각형 경계의 첫 교점(꺾은선 시작에서 가까운 순): {i,t,p} */
export function firstPolyHit(pts, poly) {
  for (let i = 0; i + 1 < pts.length; i++) {
    let best = null;
    for (let k = 0; k < poly.length; k++) {
      const h = segHit(pts[i], pts[i + 1], poly[k], poly[(k + 1) % poly.length]);
      if (h && (!best || h.t < best.t)) best = {i, t: h.t, p: h.p};
    }
    if (best) return best;
  }
  return null;
}
/** 꺾은선을 다각형 안쪽으로만 남긴다(시작점이 안). 경계를 넘는 첫 지점에서 shrink(m)만큼 안쪽에서 자른다 */
export function trimToPoly(pts, poly, shrink = 2) {
  const out = [pts[0]];
  for (let i = 0; i + 1 < pts.length; i++) {
    if (inPoly(pts[i + 1], poly)) { out.push(pts[i + 1]); continue; }
    const hit = firstPolyHit([pts[i], pts[i + 1]], poly);
    if (hit) {
      const d = sub(pts[i + 1], pts[i]), l = len(d), p = hit.p, back = Math.min(shrink, l * hit.t);
      out.push(sub(p, mul(norm(d), back)));
    }
    break;
  }
  return out;
}
/** 점에서 방향 d 로 쏜 반직선이 꺾은선 목록과 만나는 가장 가까운 교점(거리 maxD 이내): {p, dist} */
export function rayHit(o, d, polylines, maxD) {
  const far = add(o, mul(d, maxD));
  let best = null;
  for (const pl of polylines) for (let i = 0; i + 1 < pl.length; i++) {
    const h = segHit(o, far, pl[i], pl[i + 1]);
    if (h && (!best || h.t < best.t)) best = {p: h.p, dist: h.t * maxD};
  }
  return best;
}
export function chaikin(pts, closed, iters = 2) {
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const q = [];
    const n = p.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = p[i], b = p[(i + 1) % n];
      if (!closed && i === 0) q.push(a);
      q.push(lerp2(a, b, 0.25), lerp2(a, b, 0.75));
      if (!closed && i === n - 2) q.push(b);
    }
    p = q;
  }
  return p;
}
/** Ramer–Douglas–Peucker (열린 꺾은선) */
export function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = distSeg(pts[i], pts[0], pts[pts.length - 1]); if (d > dmax) { dmax = d; idx = i; } }
  if (dmax <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}
/** 점 목록을 호장 간격 step 으로 재표본 */
export function resample(pts, step) {
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1];
    const b = pts[i];
    let l = dist(a, b);
    while (acc + l >= step) { const t = (step - acc) / l; a = lerp2(a, b, t); out.push(a); l = dist(a, b); acc = 0; }
    acc += l;
  }
  return out;
}
/** 격자 위 등고선(marching squares) → 닫힌/열린 꺾은선 목록. f(i,j) 가 level 이상이면 안쪽 */
export function contour(cols, rows, f, level, toWorld) {
  const segs = [];
  const val = (i, j) => f(i, j) - level;
  const edgePt = (i0, j0, i1, j1) => { const a = val(i0, j0), b = val(i1, j1), t = a / (a - b); return toWorld(i0 + (i1 - i0) * t, j0 + (j1 - j0) * t); };
  for (let j = 0; j + 1 < rows; j++) for (let i = 0; i + 1 < cols; i++) {
    const v = [val(i, j), val(i + 1, j), val(i + 1, j + 1), val(i, j + 1)];
    let c = 0;
    for (let k = 0; k < 4; k++) if (v[k] >= 0) c |= 1 << k;
    if (c === 0 || c === 15) continue;
    const e = [[i, j, i + 1, j], [i + 1, j, i + 1, j + 1], [i, j + 1, i + 1, j + 1], [i, j, i, j + 1]]; // 위, 오른쪽, 아래, 왼쪽
    const P = k => edgePt(...e[k]);
    const T = {1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]]};
    if (c === 5) segs.push([P(3), P(0)], [P(1), P(2)]);
    else if (c === 10) segs.push([P(0), P(1)], [P(2), P(3)]);
    else for (const [a, b] of T[c]) segs.push([P(a), P(b)]);
  }
  // 선분 연결
  const key = p => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const map = new Map();
  segs.forEach((s, k) => { for (const p of s) { const kk = key(p); (map.get(kk) || map.set(kk, []).get(kk)).push(k); } });
  const used = new Uint8Array(segs.length), out = [];
  for (let k = 0; k < segs.length; k++) {
    if (used[k]) continue;
    used[k] = 1;
    const ch = [segs[k][0], segs[k][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const tail = dir ? ch[ch.length - 1] : ch[0], nx = (map.get(key(tail)) || []).find(q => !used[q]);
        if (nx === undefined) break;
        used[nx] = 1;
        const s = segs[nx], other = key(s[0]) === key(tail) ? s[1] : s[0];
        if (dir) ch.push(other); else ch.unshift(other);
      }
    }
    out.push(ch);
  }
  return out;
}
export const writeJson = (file, obj) => { fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, JSON.stringify(obj)); };
