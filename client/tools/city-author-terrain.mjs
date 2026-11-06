// city-author 지형·경계: 지형 편집(편집 목록 생성), 편집 적용 미리보기, 건축 가능 경계(bounds) 도출.
// 모든 수치는 city-author-data.mjs 의 매개변수. 결과는 결정적이다.
import {chaikin, contour, distPoly, inPoly, polyLen, rdp, resample, area} from './city-author-lib.mjs';

/** 해발 m 격자 접근기 */
export const gridOf = (t) => ({
  h: (i, j) => t.h[Math.max(0, Math.min(t.rows - 1, j)) * t.cols + Math.max(0, Math.min(t.cols - 1, i))],
  at: (x, z) => ({i: Math.round((x - t.x0) / t.cell), j: Math.round((z - t.z0) / t.cell)}),
  xz: (i, j) => [t.x0 + i * t.cell, t.z0 + j * t.cell],
});
export function heightAt(t, x, z) { const g = gridOf(t), {i, j} = g.at(x, z); return g.h(i, j); }

/** 땅 안쪽(해안에서 margin m 이상) 마스크 */
export function insideMask(ctx, t, margin) {
  const m = new Uint8Array(t.cols * t.rows), poly = ctx.O.CITY_POLY.poly;
  for (let j = 0; j < t.rows; j++) for (let i = 0; i < t.cols; i++) {
    const x = t.x0 + i * t.cell, z = t.z0 + j * t.cell;
    m[j * t.cols + i] = ctx.O.CITY_POLY.inside(x, z) && distPoly([x, z], poly) >= margin ? 1 : 0;
  }
  return m;
}

/** 붓 한 줄을 여러 겹으로 쌓아 완만한 경사를 만든다. 겹마다 반경이 달라 높이가 거리에 따라 줄어든다.
 *  height m 를 겹 수 K=ceil(height) 로 나눠 1m(또는 마지막 잔여) 씩 올리고 반경은 rMin → rMax 로 늘린다 */
export function moundStrokes(id, pts, height, rMin, rMax) {
  const K = Math.max(1, Math.ceil(height)), out = [];
  for (let k = 0; k < K; k++) {
    const st = k === K - 1 ? height - (K - 1) : 1;
    out.push({kind: 'brush', id: `${id}-${String(k).padStart(2, '0')}`, mode: 'raise', r: Math.round((rMin + ((rMax - rMin) * k) / Math.max(1, K - 1)) * 10) / 10, strength: Math.round(st * 100) / 100, pts});
  }
  return out;
}

/** 결정적 저주파 물결: 파장(λ m)·진폭(m) 목록의 사인 합. 사슬마다 위상이 다르다(phase) */
const wobbleAt = (s, list, phase) => list.reduce((a, w, k) => a + w.amp * Math.sin((2 * Math.PI * s) / w.lambda + phase * (k + 1) * 1.7 + k * 2.1), 0);

/** 산자락 앞치마: 저지대와 산벽이 만나는 등고선(기준 높이 toe) 중 내륙 구간을 따라 완만한 경사 띠를 쌓는다.
 *  등고선을 저지대 쪽으로 inset + 물결(wobble)만큼 밀어, 건축 경계가 직선이 아닌 만과 곶 모양이 되게 한다 */
export function apronEdits(ctx, t, P) {
  const g = gridOf(t), inl = insideMask(ctx, t, P.coastMargin);
  const chains = contour(t.cols, t.rows, (i, j) => (inl[j * t.cols + i] && !P.skip(g.xz(i, j)) ? Math.min(g.h(i, j), P.toe * 3) : -1), P.toe, (i, j) => g.xz(i, j));
  const edits = [];
  chains.filter(c => polyLen(c) > P.minLen).forEach((c, n) => {
    let pts = resample(rdp(c, 3), 12);
    const out = [];
    let s = 0;
    pts.forEach((p, i) => {
      if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1];
      const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      let nx = -tz, nz = tx;
      const lo = q => { const {i: ii, j: jj} = g.at(q[0], q[1]); return g.h(ii, jj); };
      if (lo([p[0] + nx * 8, p[1] + nz * 8]) > lo([p[0] - nx * 8, p[1] - nz * 8])) { nx = -nx; nz = -nz; }
      const d = Math.max(0, P.inset + wobbleAt(s, P.wobble, n + 1));
      out.push([p[0] + nx * d, p[1] + nz * d]);
    });
    pts = chaikin(out, false, 1).map(q => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]);
    pts = rdp(pts, P.rdp);
    if (pts.length > 480) pts = resample(pts, polyLen(pts) / 480);
    edits.push(...moundStrokes(`apron${n}`, pts, P.height, P.rMin, P.rMax));
  });
  return edits;
}

/** 지형에 편집 적용(미리보기·검증·경계 계산용) */
export function bakeTerrain(ctx, edits) {
  const t = ctx.T.makeTerrain(ctx.grid, ctx.baseCm);
  ctx.T.applyPreEdits(t, edits);
  return t;
}

/** 건축 가능 경계: 해안 여유·고도·경사 조건을 만족하는 칸의 가장 큰 연결 덩어리 외곽 → 부드럽게 단순화한 단순 다각형 */
export function deriveBounds(ctx, t, P) {
  const {cols, rows} = t, inl = insideMask(ctx, t, P.coastMargin), sl = ctx.T.slopeMap(t);
  let ok = new Uint8Array(cols * rows);
  for (let k = 0; k < ok.length; k++) ok[k] = inl[k] && t.h[k] <= P.maxAlt && sl[k] <= P.maxSlope ? 1 : 0;
  // 닫기(구멍·좁은 홈 메움) → 열기(가는 돌기 제거): 원판 구조 요소(반경 칸 수)
  const morph = (m, r, grow) => {
    const o = new Uint8Array(m.length), rr = r * r + 0.5;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let hit = grow ? 0 : 1;
      for (let dj = -r; dj <= r && (grow ? !hit : hit); dj++) for (let di = -r; di <= r; di++) {
        if (di * di + dj * dj > rr) continue;
        const ii = i + di, jj = j + dj, v = ii < 0 || jj < 0 || ii >= cols || jj >= rows ? 0 : m[jj * cols + ii];
        if (grow ? v : !v) { hit = grow ? 1 : 0; break; }
      }
      o[j * cols + i] = hit;
    }
    return o;
  };
  ok = morph(morph(ok, P.closeR, true), P.closeR, false);
  ok = morph(morph(ok, P.openR, false), P.openR, true);
  // 시작 칸(P.seed) 이 속한 연결 덩어리
  const lab = new Int32Array(ok.length).fill(-1), st = [];
  const sc = Math.round((P.seed[0] - t.x0) / t.cell), sr = Math.round((P.seed[1] - t.z0) / t.cell);
  st.push(sr * cols + sc); lab[sr * cols + sc] = 1;
  while (st.length) {
    const k = st.pop(), i = k % cols, j = (k - i) / cols;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      const q = nj * cols + ni;
      if (ok[q] && lab[q] < 0) { lab[q] = 1; st.push(q); }
    }
  }
  // 구멍 메우기: 바깥에서 도달 불가한 0 칸을 1 로
  const out = new Uint8Array(ok.length).fill(2), q2 = [];
  for (let i = 0; i < cols; i++) for (const j of [0, rows - 1]) if (lab[j * cols + i] < 0) { out[j * cols + i] = 0; q2.push(j * cols + i); }
  for (let j = 0; j < rows; j++) for (const i of [0, cols - 1]) if (lab[j * cols + i] < 0 && out[j * cols + i] === 2) { out[j * cols + i] = 0; q2.push(j * cols + i); }
  while (q2.length) {
    const k = q2.pop(), i = k % cols, j = (k - i) / cols;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      const q = nj * cols + ni;
      if (lab[q] < 0 && out[q] === 2) { out[q] = 0; q2.push(q); }
    }
  }
  const f = (i, j) => (lab[j * cols + i] >= 0 || out[j * cols + i] === 2 ? 1 : 0);
  const chains = contour(cols, rows, f, 0.5, (i, j) => [t.x0 + i * t.cell, t.z0 + j * t.cell]);
  chains.sort((a, b) => polyLen(b) - polyLen(a));
  let ring = chains[0];
  if (dist2(ring[0], ring[ring.length - 1]) < 1e-3) ring = ring.slice(0, -1);
  ring = chaikin(ring, true, 2);
  // RDP 는 열린 꺾은선용 — 가장 먼 두 점에서 둘로 나눠 각각 단순화
  let a = 0, b = 0, best = -1;
  for (let i = 0; i < ring.length; i += 3) for (let j = i + 1; j < ring.length; j += 3) { const d = dist2(ring[i], ring[j]); if (d > best) { best = d; a = i; b = j; } }
  const s1 = ring.slice(a, b + 1), s2 = [...ring.slice(b), ...ring.slice(0, a + 1)];
  let poly = [...rdp(s1, P.rdp).slice(0, -1), ...rdp(s2, P.rdp).slice(0, -1)].map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
  if (area(poly) < 0) poly.reverse();
  return poly;
}
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
export {inPoly};
