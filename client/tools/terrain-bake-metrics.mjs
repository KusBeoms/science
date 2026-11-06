// 전후 수치 비교: 기울기·변경 칸 수·언덕 음영 차·거칠기. 모두 땅 칸 기준(칸 차분 5u).
export function slopeField(h, land, nx, nz, step) {
  const s = new Float64Array(nx * nz);
  for (let j = 1; j < nz - 1; j++)
    for (let i = 1; i < nx - 1; i++) {
      const o = j * nx + i;
      if (!land[o] || !land[o - 1] || !land[o + 1] || !land[o - nx] || !land[o + nx]) continue;
      s[o] = Math.hypot((h[o + 1] - h[o - 1]) / (2 * step), (h[o + nx] - h[o - nx]) / (2 * step));
    }
  return s;
}
/** 언덕 음영 0..1 (광원 북서·고도 45°, z 는 남쪽이 +) */
export function hillshade(h, nx, nz, step, zScale = 1) {
  const L = [-0.5, 0.7071, -0.5], out = new Float32Array(nx * nz).fill(0.7);
  for (let j = 1; j < nz - 1; j++)
    for (let i = 1; i < nx - 1; i++) {
      const o = j * nx + i, gx = ((h[o + 1] - h[o - 1]) * zScale) / (2 * step), gz = ((h[o + nx] - h[o - nx]) * zScale) / (2 * step),
        len = Math.hypot(gx, 1, gz);
      out[o] = Math.max(0, Math.min(1, (-gx * L[0] + L[1] - gz * L[2]) / len));
    }
  return out;
}
const pct = (a, q) => { const b = Float64Array.from(a).sort(); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; };
/** before/after: Float64Array(u) 두 장 */
export function compare(f, before, after) {
  const {nx, nz, land, step} = f, sb = slopeField(before, land, nx, nz, step), sa = slopeField(after, land, nx, nz, step),
    hb = hillshade(before, nx, nz, step), ha = hillshade(after, nx, nz, step);
  const idx = [];
  for (let o = 0; o < nx * nz; o++) if (land[o]) idx.push(o);
  let changed = 0, changed5 = 0, mx = 0, sum = 0, dsh = 0, rb = 0, ra = 0, rn = 0, argMax = 0;
  for (const o of idx) {
    const d = Math.abs(after[o] - before[o]);
    if (d >= 0.005) changed++;
    if (d >= 0.5) changed5++;
    if (d > mx) { mx = d; argMax = o; }
    sum += d;
    dsh += Math.abs(ha[o] - hb[o]);
    if (sb[o] > 0 || sa[o] > 0) {
      // 거칠기 = 라플라시안 절댓값 평균(계단·주름 지표)
      rb += Math.abs(before[o - 1] + before[o + 1] + before[o - nx] + before[o + nx] - 4 * before[o]);
      ra += Math.abs(after[o - 1] + after[o + 1] + after[o - nx] + after[o + nx] - 4 * after[o]);
      rn++;
    }
  }
  const sl = a => { const v = idx.map(o => a[o]).filter(x => x > 0); return {max: Math.max(...v), p99: pct(v, 0.99), p95: pct(v, 0.95), mean: v.reduce((s, x) => s + x, 0) / v.length}; };
  const over = (a, t) => idx.reduce((s, o) => s + (a[o] > t ? 1 : 0), 0);
  return {
    landCells: idx.length, changedCells: changed, changedOver0_5u: changed5, maxDev: mx, maxDevAt: [f.ox + (argMax % nx) * step, f.oz + Math.floor(argMax / nx) * step],
    meanDev: sum / idx.length, slopeBefore: sl(sb), slopeAfter: sl(sa), cellsSlopeOver1: [over(sb, 1), over(sa, 1)], cellsSlopeOver0_6: [over(sb, 0.6), over(sa, 0.6)], cellsSlopeOver1_5: [over(sb, 1.5), over(sa, 1.5)], cellsSlopeOver2: [over(sb, 2), over(sa, 2)],
    peak: [Math.max(...idx.map(o => before[o])), Math.max(...idx.map(o => after[o]))],
    hillshadeMeanAbsDiff: dsh / idx.length, laplacianMeanBefore: rb / rn, laplacianMeanAfter: ra / rn,
  };
}
