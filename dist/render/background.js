"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const clamp = G.clamp;
    const N = Gp._noise;
    function scrollSpeed() { return G.SPEED * 260; }
    const PAR_MILKY = 0.12;
    const PAR_GALAXY = 0.22;
    const PAR_NEBULA = 0.45;
    const WORLD_SEED = (Math.random() * 0x7fffffff) | 0;
    let camX = 0;
    const REFERENCE_AREA = 1280 * 720;
    const STAR_DENSITY = 260 / REFERENCE_AREA;
    function starCountFor(W, H) {
        return Math.max(30, Math.round(STAR_DENSITY * W * H));
    }
    const STAR_TINTS = [
        [0.46, '#e6edff'], [0.66, '#c9d8ff'], [0.80, '#fff4e2'], [0.92, '#ffe0b3'], [1.0, '#ffc59a'],
    ];
    function pickTint() {
        const r = Math.random();
        for (const [p, c] of STAR_TINTS)
            if (r <= p)
                return c;
        return '#e6edff';
    }
    function makeStar(W, H, x) {
        const layer = 0.3 + Math.random() * 1.0;
        const bright = Math.random() < 0.035;
        return {
            x: x == null ? Math.random() * W : x,
            y: Math.random() * H,
            r: bright ? 1.3 + Math.random() * 0.9 : 0.35 + Math.random() * 0.9 * layer,
            layer,
            baseAlpha: bright ? 0.9 : 0.3 + Math.random() * 0.6,
            color: pickTint(),
            twinkle: 0.6 + Math.random() * 2.2,
            phase: Math.random() * Math.PI * 2,
            spike: bright,
        };
    }
    let dustStars = [];
    Gp._renderInitStars = function () {
        this.stars = [];
        const count = starCountFor(this.W, this.H);
        for (let i = 0; i < count; i++)
            this.stars.push(makeStar(this.W, this.H));
        rebuildDustStars(this.W, this.H);
    };
    Gp._renderResyncStars = function (oldW, oldH) {
        if (oldW > 0 && oldH > 0) {
            for (const s of this.stars) {
                s.x = s.x / oldW * this.W;
                s.y = s.y / oldH * this.H;
            }
        }
        const target = starCountFor(this.W, this.H);
        if (this.stars.length < target) {
            for (let i = this.stars.length; i < target; i++)
                this.stars.push(makeStar(this.W, this.H));
        }
        else if (this.stars.length > target) {
            this.stars.length = target;
        }
        milky.valid = false;
        nebulaSprites.clear();
        rebuildDustStars(this.W, this.H);
        buildVignette(this.W, this.H);
    };
    Gp._renderStarBudget = function () {
        const step = Math.floor(G.state.distanceLy);
        const frac = G.clamp(1 - step * 22 / 260, 0, 1);
        return Math.max(1, Math.round(this.stars.length * frac));
    };
    Gp._renderBgDarkness = function () {
        return G.clamp(G.state.distanceLy / 12, 0, 1);
    };
    const MW_RES = 4;
    const milky = {
        valid: false,
        canvas: document.createElement('canvas'),
        ctx: null,
        img: null,
        cols: 0, rows: 0,
        col0: 0,
        H: 0,
    };
    milky.ctx = milky.canvas.getContext('2d');
    function bandCenter(wx, H) {
        return H * (0.5 + 0.62 * (N.fbm2(wx / 2600, 0.3, WORLD_SEED + 11, 3) - 0.5));
    }
    function bandHalfWidth(wx, H) {
        return H * (0.09 + 0.12 * N.fbm2(wx / 1500, 4.7, WORLD_SEED + 23, 2));
    }
    function writeMilkyColumn(bufCol, worldCol) {
        const img = milky.img, data = img.data, cols = milky.cols, rows = milky.rows, H = milky.H;
        const wx = worldCol * MW_RES;
        const c = bandCenter(wx, H), hw = bandHalfWidth(wx, H);
        const glow = 0.65 + 0.7 * N.fbm2(wx / 900, 9.1, WORLD_SEED + 37, 2);
        for (let row = 0; row < rows; row++) {
            const y = row * MW_RES;
            const d = (y - c) / hw;
            const d2 = d * d;
            const idx = (row * cols + bufCol) * 4;
            if (d2 > 30) {
                data[idx + 3] = 0;
                continue;
            }
            const core = Math.exp(-d2 * 0.9);
            const halo = Math.exp(-d2 * 0.22) * 0.16;
            const clouds = N.fbm2(wx / 240, y / 240, WORLD_SEED + 51, 5);
            let dens = core * (0.25 + 1.05 * clouds * clouds) + halo * (0.6 + clouds * 0.6);
            const dust = N.fbm2(wx / 130 + 31, y / 130, WORLD_SEED + 67, 4);
            const lane = clamp((dust - 0.5) * 4.2, 0, 1) * Math.exp(-d2 * 1.6);
            dens *= 1 - 0.85 * lane;
            dens *= glow;
            const warm = clamp(Math.exp(-d2 * 1.8) * (0.4 + clouds), 0, 1);
            data[idx] = 120 + (255 - 120) * warm;
            data[idx + 1] = 140 + (222 - 140) * warm;
            data[idx + 2] = 235 + (190 - 235) * warm;
            data[idx + 3] = clamp(dens * 120, 0, 150);
        }
    }
    function rebuildMilky(W, H, worldColStart) {
        milky.cols = Math.ceil(W / MW_RES) + 3;
        milky.rows = Math.ceil(H / MW_RES) + 1;
        milky.H = H;
        milky.canvas.width = milky.cols;
        milky.canvas.height = milky.rows;
        milky.img = milky.ctx.createImageData(milky.cols, milky.rows);
        milky.col0 = worldColStart;
        for (let c = 0; c < milky.cols; c++)
            writeMilkyColumn(c, worldColStart + c);
        milky.ctx.putImageData(milky.img, 0, 0);
        milky.valid = true;
    }
    function drawMilky(ctx, W, H, alpha) {
        const off = camX * PAR_MILKY;
        const worldCol = Math.floor(off / MW_RES);
        if (!milky.valid || milky.H !== H)
            rebuildMilky(W, H, worldCol);
        const shift = worldCol - milky.col0;
        if (shift > 0) {
            const { cols, rows } = milky;
            const data = milky.img.data;
            if (shift >= cols) {
                rebuildMilky(W, H, worldCol);
            }
            else {
                for (let r = 0; r < rows; r++) {
                    const base = r * cols * 4;
                    data.copyWithin(base, base + shift * 4, base + cols * 4);
                }
                milky.col0 = worldCol;
                for (let c = cols - shift; c < cols; c++)
                    writeMilkyColumn(c, worldCol + c);
                milky.ctx.putImageData(milky.img, 0, 0);
            }
        }
        const frac = off / MW_RES - worldCol;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(milky.canvas, -frac * MW_RES, 0, milky.cols * MW_RES, milky.rows * MW_RES);
        ctx.restore();
    }
    function rebuildDustStars(W, H) {
        dustStars = [];
        const n = Math.round(420 * (W * H) / REFERENCE_AREA);
        const off = camX * PAR_MILKY;
        for (let i = 0; i < n; i++)
            dustStars.push(makeDustStar(off + Math.random() * (W + 20), H));
    }
    function makeDustStar(wx, H) {
        const g = (Math.random() + Math.random() + Math.random() - 1.5) * 1.3;
        return { wx, y: bandCenter(wx, H) + g * bandHalfWidth(wx, H), r: 0.3 + Math.random() * 0.6, a: 0.25 + Math.random() * 0.5 };
    }
    function drawDustStars(ctx, W, H, alpha) {
        const off = camX * PAR_MILKY;
        ctx.fillStyle = '#eef2ff';
        for (let i = 0; i < dustStars.length; i++) {
            let s = dustStars[i];
            if (s.wx - off < -4) {
                s = dustStars[i] = makeDustStar(off + W + 2 + Math.random() * 20, H);
            }
            ctx.globalAlpha = s.a * alpha;
            const d = s.r * 2;
            ctx.fillRect(s.wx - off - s.r, s.y - s.r, d, d);
        }
        ctx.globalAlpha = 1;
    }
    const NEB_CHUNK = 620;
    const GAL_CHUNK = 780;
    const NEB_PALETTES = [
        [[255, 92, 128], [255, 160, 120]],
        [[70, 200, 210], [120, 150, 255]],
        [[110, 140, 255], [190, 170, 255]],
        [[255, 110, 170], [90, 190, 230]],
    ];
    function nebulaFor(chunk, H) {
        const r = N.rng(WORLD_SEED ^ Math.imul(chunk, 7919) ^ 0x51f15e);
        if (r() > 0.62)
            return null;
        const scale = Gp._renderViewScale || 1;
        return {
            wx: chunk * NEB_CHUNK + r() * NEB_CHUNK,
            y: H * (0.08 + r() * 0.84),
            size: (200 + r() * 360) * scale,
            seed: (r() * 1e9) | 0,
            palette: Math.floor(r() * NEB_PALETTES.length),
        };
    }
    function galaxyFor(chunk, H) {
        const r = N.rng(WORLD_SEED ^ Math.imul(chunk, 104729) ^ 0x6a1a77);
        if (r() > 0.4)
            return null;
        const scale = Gp._renderViewScale || 1;
        return {
            wx: chunk * GAL_CHUNK + r() * GAL_CHUNK,
            y: H * (0.06 + r() * 0.88),
            size: (16 + r() * 30) * scale,
            seed: (r() * 1e9) | 0,
            tilt: 0.25 + r() * 0.6,
            rot: r() * Math.PI,
            kind: r() < 0.75 ? 0 : 1,
        };
    }
    const nebulaSprites = new Map();
    const galaxySprites = new Map();
    function buildNebulaSprite(n) {
        const s = Math.max(8, Math.min(150, Math.round(n.size / 3)));
        const cv = document.createElement('canvas');
        cv.width = s;
        cv.height = s;
        const c = cv.getContext('2d');
        const img = c.createImageData(s, s);
        const [c1, c2] = NEB_PALETTES[n.palette];
        const r = N.rng(n.seed);
        const lobes = [];
        for (let i = 0; i < 4; i++)
            lobes.push([0.5 + (r() - 0.5) * 0.35, 0.5 + (r() - 0.5) * 0.35, 0.18 + r() * 0.2]);
        for (let y = 0; y < s; y++) {
            for (let x = 0; x < s; x++) {
                const u = x / s, v = y / s;
                let m = 0;
                for (const [lx, ly, lr] of lobes) {
                    const dx = (u - lx) / lr, dy = (v - ly) / lr;
                    m = Math.max(m, Math.exp(-(dx * dx + dy * dy) * 1.4));
                }
                const f = N.fbm2(u * 4.2, v * 4.2, n.seed, 5);
                const fil = N.fbm2(u * 9 + 3, v * 9, n.seed + 7, 3);
                const dens = clamp(m * (f * 1.6 - 0.35) + fil * m * 0.25, 0, 1);
                const t = clamp(f * 1.3 - 0.15, 0, 1);
                const i4 = (y * s + x) * 4;
                img.data[i4] = c1[0] + (c2[0] - c1[0]) * t;
                img.data[i4 + 1] = c1[1] + (c2[1] - c1[1]) * t;
                img.data[i4 + 2] = c1[2] + (c2[2] - c1[2]) * t;
                img.data[i4 + 3] = dens * dens * 150;
            }
        }
        c.putImageData(img, 0, 0);
        return cv;
    }
    function buildGalaxySprite(g) {
        const s = Math.max(12, Math.round(g.size));
        const cv = document.createElement('canvas');
        cv.width = s;
        cv.height = s;
        const c = cv.getContext('2d');
        const r = N.rng(g.seed);
        const cx = s / 2;
        c.globalCompositeOperation = 'lighter';
        if (g.kind === 0) {
            const arms = 2;
            for (let a = 0; a < arms; a++) {
                for (let i = 0; i < 420; i++) {
                    const t = r();
                    const theta = t * 4.2 + a * Math.PI;
                    const rad = cx * 0.08 * Math.exp(t * 2.3);
                    if (rad > cx * 0.95)
                        continue;
                    const jitter = (r() - 0.5) * cx * 0.12;
                    const px = cx + Math.cos(theta) * rad + jitter, py = cx + Math.sin(theta) * rad + jitter;
                    const blue = r() < 0.6;
                    c.fillStyle = blue ? 'rgba(170,190,255,0.07)' : 'rgba(255,220,200,0.05)';
                    c.beginPath();
                    c.arc(px, py, 0.6 + r() * 1.2, 0, Math.PI * 2);
                    c.fill();
                }
            }
        }
        const disk = c.createRadialGradient(cx, cx, 0, cx, cx, cx * 0.95);
        disk.addColorStop(0, 'rgba(200,210,255,0.22)');
        disk.addColorStop(1, 'rgba(200,210,255,0)');
        c.fillStyle = disk;
        c.beginPath();
        c.arc(cx, cx, cx, 0, Math.PI * 2);
        c.fill();
        const core = c.createRadialGradient(cx, cx, 0, cx, cx, cx * (g.kind === 0 ? 0.35 : 0.9));
        core.addColorStop(0, 'rgba(255,240,215,0.9)');
        core.addColorStop(0.3, 'rgba(255,220,180,0.35)');
        core.addColorStop(1, 'rgba(255,210,170,0)');
        c.fillStyle = core;
        c.beginPath();
        c.arc(cx, cx, cx, 0, Math.PI * 2);
        c.fill();
        return cv;
    }
    function drawNebulae(ctx, W, H, alpha) {
        const off = camX * PAR_NEBULA;
        const pad = 600 * (Gp._renderViewScale || 1);
        const first = Math.floor((off - pad) / NEB_CHUNK), last = Math.floor((off + W + pad) / NEB_CHUNK);
        for (const k of nebulaSprites.keys())
            if (k < first)
                nebulaSprites.delete(k);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.imageSmoothingEnabled = true;
        let built = false;
        for (let k = first; k <= last; k++) {
            const n = nebulaFor(k, H);
            if (!n)
                continue;
            let sp = nebulaSprites.get(k);
            if (sp === undefined) {
                if (built)
                    continue;
                sp = buildNebulaSprite(n);
                nebulaSprites.set(k, sp);
                built = true;
            }
            if (!sp)
                continue;
            const x = n.wx - off;
            if (x + n.size / 2 < 0 || x - n.size / 2 > W)
                continue;
            ctx.globalAlpha = alpha * 0.8;
            ctx.drawImage(sp, x - n.size / 2, n.y - n.size / 2, n.size, n.size);
        }
        ctx.restore();
    }
    function drawGalaxies(ctx, W, H, alpha) {
        const off = camX * PAR_GALAXY;
        const first = Math.floor((off - 200) / GAL_CHUNK), last = Math.floor((off + W + 200) / GAL_CHUNK);
        for (const k of galaxySprites.keys())
            if (k < first)
                galaxySprites.delete(k);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let k = first; k <= last; k++) {
            const g = galaxyFor(k, H);
            if (!g)
                continue;
            let sp = galaxySprites.get(k);
            if (sp === undefined) {
                sp = buildGalaxySprite(g);
                galaxySprites.set(k, sp);
            }
            if (!sp)
                continue;
            const x = g.wx - off;
            if (x + g.size < 0 || x - g.size > W)
                continue;
            ctx.save();
            ctx.translate(x, g.y);
            ctx.rotate(g.rot);
            ctx.scale(1, g.tilt);
            ctx.globalAlpha = alpha * 0.55;
            ctx.drawImage(sp, -g.size, -g.size, g.size * 2, g.size * 2);
            ctx.restore();
        }
        ctx.restore();
    }
    function drawStars(R, ctx, dt, scroll, budget, alpha) {
        const W = R.W, H = R.H;
        const t = performance.now() / 1000;
        const dx = scrollSpeed() * scroll * dt;
        for (let i = 0; i < R.stars.length; i++) {
            let s = R.stars[i];
            if (dx > 0) {
                s.x -= dx * s.layer;
                if (s.x < -6) {
                    s = R.stars[i] = makeStar(W, H, W + 6 + Math.random() * 30);
                }
            }
            if (i >= budget)
                continue;
            const tw = 0.72 + 0.28 * Math.sin(t * s.twinkle + s.phase);
            const a = s.baseAlpha * tw * alpha;
            ctx.globalAlpha = a;
            ctx.fillStyle = s.color;
            if (s.r < 0.9) {
                ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
            }
            else {
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
            }
            if (s.spike) {
                const L = s.r * (5 + 2.5 * tw);
                ctx.globalAlpha = a * 0.5;
                ctx.fillRect(s.x - L, s.y - 0.4, L * 2, 0.8);
                ctx.fillRect(s.x - 0.4, s.y - L, 0.8, L * 2);
                const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
                halo.addColorStop(0, s.color);
                halo.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.globalAlpha = a * 0.35;
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }
    const meteors = [];
    let meteorTimer = 3 + Math.random() * 5;
    function drawMeteors(ctx, W, H, dt, alpha) {
        meteorTimer -= dt;
        if (meteorTimer <= 0) {
            meteorTimer = 5 + Math.random() * 9;
            const ang = Math.PI * (0.72 + Math.random() * 0.12);
            const sp = 700 + Math.random() * 500;
            meteors.push({ x: W * (0.3 + Math.random() * 0.7), y: H * Math.random() * 0.5, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: 0, dur: 0.5 + Math.random() * 0.4 });
        }
        for (let i = meteors.length - 1; i >= 0; i--) {
            const m = meteors[i];
            m.t += dt;
            if (m.t >= m.dur) {
                meteors.splice(i, 1);
                continue;
            }
            m.x += m.vx * dt;
            m.y += m.vy * dt;
            const p = m.t / m.dur;
            const a = Math.sin(p * Math.PI) * alpha;
            const tail = 0.12;
            const tx = m.x - m.vx * tail, ty = m.y - m.vy * tail;
            const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
            g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`);
            g.addColorStop(1, 'rgba(160,190,255,0)');
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
        }
    }
    const vignette = document.createElement('canvas');
    function buildVignette(W, H) {
        vignette.width = Math.max(1, Math.round(W / 2));
        vignette.height = Math.max(1, Math.round(H / 2));
        const c = vignette.getContext('2d');
        const w = vignette.width, h = vignette.height;
        c.clearRect(0, 0, w, h);
        const g = c.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.hypot(w, h) * 0.62);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,6,0.62)');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        const top = c.createLinearGradient(0, 0, 0, h * 0.2);
        top.addColorStop(0, 'rgba(2,3,12,0.55)');
        top.addColorStop(1, 'rgba(2,3,12,0)');
        c.fillStyle = top;
        c.fillRect(0, 0, w, h * 0.2);
    }
    Gp._renderDrawBackground = function (dt, scroll, budget) {
        const ctx = this.ctx, W = this.W, H = this.H;
        const dark = this.bgDarkness();
        const lerp = (a, b, t) => a + (b - a) * t;
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, `rgb(${lerp(4, 1, dark)},${lerp(6, 2, dark)},${lerp(18, 6, dark)})`);
        bg.addColorStop(1, `rgb(${lerp(8, 2, dark)},${lerp(10, 3, dark)},${lerp(28, 9, dark)})`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        camX += scrollSpeed() * scroll * dt;
        const fadeAll = 1 - dark * 0.8;
        drawMilky(ctx, W, H, fadeAll);
        drawDustStars(ctx, W, H, fadeAll * 0.9);
        drawGalaxies(ctx, W, H, fadeAll);
        drawNebulae(ctx, W, H, fadeAll);
        drawStars(this, ctx, dt, scroll, budget, 1 - dark * 0.85);
        if (scroll > 0)
            drawMeteors(ctx, W, H, dt, fadeAll);
        ctx.drawImage(vignette, 0, 0, W, H);
    };
})();
