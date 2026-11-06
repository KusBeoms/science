// 도시 섬 높이 다듬기 (순수·결정적). 땅 칸끼리만 섞고(바다·낭떠러지 칸은 건드리지 않는다), 보존 가중치 pw 만큼 원본을 되돌려 놓는다.
//  1) 쌍방(bilateral) 가우시안: 5u 격자 계단 얼룩과 능선 마루의 날카로운 주름 제거 — 높이 차가 큰 진짜 벽(rangeSigma 이상)은 섞지 않는다
//  2) 열 침식(thermal): 안식각(talus)을 넘는 비탈을 아래로 흘려 곧은 벽·가파른 능선을 누그러뜨린다 (질량 보존, 야코비 방식)
//  3) 가중 합성: 결과 = pw*원본 + (1-pw)*다듬은 값, 마지막에 cm 반올림
export const DEFAULTS = {
  sigma: 1.4, // 가우시안 반경(칸)
  radius: 3, // 커널 반경(칸)
  rangeSigma: 9, // 쌍방 높이 허용(u): 이보다 큰 단차는 덜 섞인다
  passes: 2,
  talus: 0.62, // 안식각 기울기(상승/수평)
  thermalRate: 0.4,
  thermalIter: 10,
  maxDev: 12, // 칸당 최대 변화(u) 안전 상한
};

export function smoothTerrain(f, P = {}) {
  const Q = {...DEFAULTS, ...P}, {nx, nz, h: h0, land, pw} = f, n = nx * nz, step = f.step || 5;
  let cur = Float64Array.from(h0);
  // 1) 쌍방 가우시안 (땅 칸만 참여)
  const R = Q.radius, ker = [];
  for (let dj = -R; dj <= R; dj++)
    for (let di = -R; di <= R; di++) ker.push([di, dj, Math.exp(-(di * di + dj * dj) / (2 * Q.sigma * Q.sigma))]);
  for (let pass = 0; pass < Q.passes; pass++) {
    const nxt = Float64Array.from(cur);
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const o = j * nx + i;
        if (!land[o] || pw[o] >= 1) continue;
        let s = 0, ws = 0;
        const c = cur[o];
        for (const [di, dj, g] of ker) {
          const a = i + di, b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
          const q = b * nx + a;
          if (!land[q]) continue;
          const d = (cur[q] - c) / Q.rangeSigma, w = g * Math.exp(-d * d / 2);
          s += w * cur[q];
          ws += w;
        }
        nxt[o] = s / ws;
      }
    cur = nxt;
  }
  // 2) 열 침식
  const nb = [[1, 0, 1], [0, 1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2]];
  for (let it = 0; it < Q.thermalIter; it++) {
    const dl = new Float64Array(n);
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const o = j * nx + i;
        if (!land[o]) continue;
        for (const [di, dj, dist] of nb) {
          const a = i + di, b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
          const q = b * nx + a;
          if (!land[q]) continue;
          const diff = cur[o] - cur[q], lim = Q.talus * step * dist, ex = Math.abs(diff) - lim;
          if (ex <= 0) continue;
          const wt = Math.min(1 - pw[o], 1 - pw[q]); // 한쪽이 보존이면 흐르지 않는다
          if (wt <= 0) continue;
          const t = Q.thermalRate * ex * 0.5 * wt * (diff > 0 ? 1 : -1);
          dl[o] -= t;
          dl[q] += t;
        }
      }
    for (let o = 0; o < n; o++) cur[o] += dl[o];
  }
  // 3) 가중 합성 + 안전 상한 + cm 반올림
  const out = new Int32Array(n);
  let clamped = 0;
  for (let o = 0; o < n; o++) {
    let v = land[o] ? h0[o] * pw[o] + cur[o] * (1 - pw[o]) : h0[o];
    const d = v - h0[o];
    if (Math.abs(d) > Q.maxDev) { v = h0[o] + Math.sign(d) * Q.maxDev; clamped++; }
    out[o] = Math.round(v * 100);
  }
  return {cm: out, clamped, params: Q};
}
