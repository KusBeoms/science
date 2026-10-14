"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    function hash3(x, y, z, seed) {
        let h = (seed | 0) ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }
    function fade(t) { return t * t * (3 - 2 * t); }
    function value3(x, y, z, seed) {
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
    function fbm3(x, y, z, seed, octaves) {
        let sum = 0, amp = 0.5, norm = 0, f = 1;
        for (let i = 0; i < octaves; i++) {
            sum += value3(x * f, y * f, z * f, seed + i * 1013) * amp;
            norm += amp;
            amp *= 0.5;
            f *= 2.03;
        }
        return sum / norm;
    }
    function fbm2(x, y, seed, octaves) {
        return fbm3(x, y, 0.5, seed, octaves);
    }
    function rng(seed) {
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
