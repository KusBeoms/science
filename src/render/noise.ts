/* 결정론적(seed 기반) 난수·값 노이즈·fBm. 배경(은하수/성운)과 천체 텍스처가
   공유한다. 같은 seed + 같은 좌표는 언제나 같은 값을 내므로, 배경을 "월드 좌표"
   기준으로 생성하면 한 번 지나온 풍경이 다시 반복되지 않으면서도 청크 경계가
   끊김 없이 이어진다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  function hash3(x: number, y: number, z: number, seed: number): number {
    let h = (seed | 0) ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function fade(t: number) { return t * t * (3 - 2 * t); }

  function value3(x: number, y: number, z: number, seed: number): number {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
    const c000 = hash3(xi, yi, zi, seed), c100 = hash3(xi + 1, yi, zi, seed);
    const c010 = hash3(xi, yi + 1, zi, seed), c110 = hash3(xi + 1, yi + 1, zi, seed);
    const c001 = hash3(xi, yi, zi + 1, seed), c101 = hash3(xi + 1, yi, zi + 1, seed);
    const c011 = hash3(xi, yi + 1, zi + 1, seed), c111 = hash3(xi + 1, yi + 1, zi + 1, seed);
    const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
    const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  }

  // 0..1 범위 fractal Brownian motion
  function fbm3(x: number, y: number, z: number, seed: number, octaves: number): number {
    let sum = 0, amp = 0.5, norm = 0, f = 1;
    for (let i = 0; i < octaves; i++) {
      sum += value3(x * f, y * f, z * f, seed + i * 1013) * amp;
      norm += amp; amp *= 0.5; f *= 2.03;
    }
    return sum / norm;
  }

  function fbm2(x: number, y: number, seed: number, octaves: number): number {
    return fbm3(x, y, 0.5, seed, octaves);
  }

  // mulberry32 — seed 하나로 재현 가능한 난수열
  function rng(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  Gp._noise = { hash3, value3, fbm2, fbm3, rng };
})();
