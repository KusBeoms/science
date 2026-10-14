"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const clamp = G.clamp;
    const ctx = Gp._renderCtx;
    const STAR_TIERS = [
        { spectral: 'M', max: 0.45, color: [255, 178, 102], granules: 2, granuleSpeed: 0.40, spots: 2, spotOpacity: 0.40, flareEvery: [5, 9], flareSize: 0.50, wind: 0, windSpeed: 0, oblate: 0, pulse: 1.0 },
        { spectral: 'K', max: 0.8, color: [255, 206, 140], granules: 3, granuleSpeed: 0.55, spots: 1, spotOpacity: 0.28, flareEvery: [9, 14], flareSize: 0.55, wind: 0, windSpeed: 0, oblate: 0, pulse: 1.0 },
        { spectral: 'G', max: 1.04, color: [255, 238, 204], granules: 5, granuleSpeed: 0.75, spots: 1, spotOpacity: 0.18, flareEvery: [14, 22], flareSize: 0.60, wind: 6, windSpeed: 18, oblate: 0, pulse: 1.0 },
        { spectral: 'F', max: 1.4, color: [255, 248, 235], granules: 6, granuleSpeed: 0.90, spots: 0, spotOpacity: 0, flareEvery: [18, 26], flareSize: 0.65, wind: 10, windSpeed: 24, oblate: 0.02, pulse: 1.05 },
        { spectral: 'A', max: 2.1, color: [226, 232, 255], granules: 6, granuleSpeed: 1.05, spots: 0, spotOpacity: 0, flareEvery: [16, 24], flareSize: 0.75, wind: 16, windSpeed: 32, oblate: 0.06, pulse: 1.10 },
        { spectral: 'B', max: 16, color: [190, 206, 255], granules: 7, granuleSpeed: 1.30, spots: 0, spotOpacity: 0, flareEvery: [10, 16], flareSize: 0.90, wind: 28, windSpeed: 48, oblate: 0.11, pulse: 1.30 },
        { spectral: 'O', max: 100, color: [160, 182, 255], granules: 8, granuleSpeed: 1.60, spots: 0, spotOpacity: 0, flareEvery: [5, 9], flareSize: 1.10, wind: 42, windSpeed: 70, oblate: 0.17, pulse: 1.60 },
    ];
    const surfaces = {};
    function makeSurface() {
        const granules = [];
        for (let i = 0; i < 8; i++)
            granules.push({
                angle: Math.random() * Math.PI * 2, rOff: 0.25 + Math.random() * 0.35,
                sizeSeed: 0.6 + Math.random() * 0.8, speedSeed: 0.6 + Math.random() * 0.8, phase: Math.random() * 10,
            });
        const spots = [];
        for (let i = 0; i < 2; i++)
            spots.push({ angle: Math.random() * Math.PI * 2, sizeSeed: 0.6 + Math.random() * 0.8 });
        return {
            granules, spots, visibleGranules: 0, visibleSpots: 0, visibleWind: 0,
            visibleOblate: 0, visiblePulse: 1,
            wind: [], flareTimer: 2 + Math.random() * 4, flares: [],
        };
    }
    Gp._renderMassColor = function (m) {
        const mm = Number.isFinite(m) ? clamp(m, 0.08, 100) : 0.08;
        const nodes = [[0.08, [255, 120, 80]]];
        for (const t of STAR_TIERS)
            nodes.push([t.max, t.color]);
        let i = 0;
        while (i < nodes.length - 2 && mm > nodes[i + 1][0])
            i++;
        const [m0, c0] = nodes[i], [m1, c1] = nodes[i + 1];
        const f = (mm - m0) / ((m1 - m0) || 1);
        const r = Math.round(c0[0] + (c1[0] - c0[0]) * f);
        const g = Math.round(c0[1] + (c1[1] - c0[1]) * f);
        const b = Math.round(c0[2] + (c1[2] - c0[2]) * f);
        return `rgb(${r},${g},${b})`;
    };
    Gp._renderStarClass = function (m) {
        const mm = Number.isFinite(m) ? clamp(m, 0.08, 100) : 0.08;
        for (const t of STAR_TIERS)
            if (mm <= t.max)
                return t;
        return STAR_TIERS[STAR_TIERS.length - 1];
    };
    Gp._renderStarRadius = function (volume) {
        return (14 + Math.max(volume, 6) * 0.55) * (Gp._renderViewScale || 1);
    };
    Gp._renderGetSurface = function (id) {
        if (!surfaces[id])
            surfaces[id] = makeSurface();
        return surfaces[id];
    };
    Gp._renderResetSurfaces = function () {
        for (const k in surfaces)
            delete surfaces[k];
        Gp._renderResetBodyTextures();
        setTimeout(Gp._renderWarmBodyTextures, 30);
    };
    const PROTO_COLOR = [201, 161, 112];
    function rgbOf(col) {
        const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(col);
        return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
    }
    function mixRgb(a, b, t) {
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
    function rgba(c, a) {
        return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    }
    const GRAN = (function () {
        const S = 256, CELLS = 26;
        const cv = document.createElement('canvas');
        cv.width = S;
        cv.height = S;
        const c = cv.getContext('2d');
        const img = c.createImageData(S, S);
        const pts = [];
        for (let j = 0; j < CELLS; j++)
            for (let i = 0; i < CELLS; i++)
                pts.push([i + Math.random(), j + Math.random()]);
        for (let y = 0; y < S; y++) {
            for (let x = 0; x < S; x++) {
                const fx = x / S * CELLS, fy = y / S * CELLS;
                const ci = Math.floor(fx), cj = Math.floor(fy);
                let f1 = 9, f2 = 9;
                for (let dj = -1; dj <= 1; dj++)
                    for (let di = -1; di <= 1; di++) {
                        const ii = (ci + di + CELLS) % CELLS, jj = (cj + dj + CELLS) % CELLS;
                        const p = pts[jj * CELLS + ii];
                        const px = p[0] + (ci + di - ii), py = p[1] + (cj + dj - jj);
                        const d = Math.hypot(fx - px, fy - py);
                        if (d < f1) {
                            f2 = f1;
                            f1 = d;
                        }
                        else if (d < f2)
                            f2 = d;
                    }
                const edge = clamp((f2 - f1) * 1.6, 0, 1);
                const v = 150 + 105 * Math.pow(edge, 0.9) * (1 - f1 * 0.4);
                const o = (y * S + x) * 4;
                img.data[o] = v;
                img.data[o + 1] = v * 0.97;
                img.data[o + 2] = v * 0.93;
                img.data[o + 3] = 255;
            }
        }
        c.putImageData(img, 0, 0);
        return cv;
    })();
    Gp._renderDrawStarBody = function (x, y, mass, volume, fuelFrac, angle, id, dt, ignitionBlend) {
        id = id || 'anonymous';
        dt = (dt == null) ? 0.016 : dt;
        const blend = ignitionBlend == null ? 1 : clamp(ignitionBlend, 0, 1);
        const tier = Gp._renderStarClass(mass);
        const surf = Gp._renderGetSurface(id);
        const r = Gp._renderStarRadius(volume) * (G.PROTO_BODY_SCALE + (1 - G.PROTO_BODY_SCALE) * blend);
        const ease = 1 - Math.exp(-3 * dt);
        surf.visibleOblate += (tier.oblate - surf.visibleOblate) * ease;
        surf.visiblePulse += (tier.pulse - surf.visiblePulse) * ease;
        surf.visibleGranules += (tier.granules - surf.visibleGranules) * ease;
        surf.visibleSpots += (tier.spots - surf.visibleSpots) * ease;
        const instab = fuelFrac < 0.2 ? 1 - fuelFrac / 0.2 : 0;
        const now = performance.now() / 1000;
        const pulse = 1 + Math.sin(now * 8.3) * 0.06 * instab * surf.visiblePulse;
        const rp = r * pulse;
        const squashY = 1 - surf.visibleOblate;
        const base = mixRgb(PROTO_COLOR, rgbOf(Gp._renderMassColor(mass)), blend);
        const white = [255, 255, 255];
        const core = mixRgb(base, white, 0.62);
        const limb = [base[0] * 0.74, base[1] * 0.72, base[2] * 0.72];
        if (blend < 1)
            Gp._renderDrawTexturedSphere(ctx, 'gasGiant', x, y, rp, angle * 0.3, 0.08, 1);
        ctx.save();
        ctx.translate(x, y);
        ctx.globalCompositeOperation = 'lighter';
        const glowR = rp * (3.2 + surf.visiblePulse * 0.4);
        const glow = ctx.createRadialGradient(0, 0, rp * 0.85, 0, 0, glowR);
        glow.addColorStop(0, rgba(base, 0.55 * blend));
        glow.addColorStop(0.18, rgba(base, 0.2 * blend));
        glow.addColorStop(0.5, rgba(base, 0.05 * blend));
        glow.addColorStop(1, rgba(base, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, glowR, 0, Math.PI * 2);
        ctx.fill();
        const streamers = 6;
        const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        sg.addColorStop(0, rgba(core, 0.16 * blend));
        sg.addColorStop(0.5, rgba(base, 0.05 * blend));
        sg.addColorStop(1, rgba(base, 0));
        ctx.fillStyle = sg;
        for (let i = 0; i < streamers; i++) {
            const a = i * (Math.PI * 2 / streamers) + now * 0.03 + Math.sin(i * 12.9) * 0.4;
            const len = rp * (2.1 + 0.4 * Math.sin(now * 0.4 + i * 3.1) + surf.visiblePulse * 0.3);
            ctx.save();
            ctx.rotate(a);
            ctx.scale(len, rp * (0.55 + 0.15 * Math.sin(i * 7.7)));
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.rotate(angle);
        ctx.scale(1, squashY);
        ctx.globalAlpha = blend;
        const ph = ctx.createRadialGradient(0, 0, 0, 0, 0, rp);
        ph.addColorStop(0, rgba(core, 1));
        ph.addColorStop(0.55, rgba(mixRgb(base, white, 0.28), 1));
        ph.addColorStop(0.86, rgba(base, 1));
        ph.addColorStop(1, rgba(limb, 1));
        ctx.fillStyle = ph;
        ctx.beginPath();
        ctx.arc(0, 0, rp, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, rp, 0, Math.PI * 2);
        ctx.clip();
        const gFrac = clamp(surf.visibleGranules / 8, 0, 1);
        const cell = rp * (3.6 - gFrac * 1.2);
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = (0.26 + 0.14 * gFrac) * blend;
        ctx.save();
        ctx.rotate(now * 0.05 * tier.granuleSpeed);
        ctx.drawImage(GRAN, -cell / 2, -cell / 2, cell, cell);
        ctx.restore();
        ctx.globalAlpha = (0.14 + 0.08 * gFrac) * blend;
        ctx.save();
        ctx.rotate(-now * 0.035 * tier.granuleSpeed + 1.3);
        ctx.drawImage(GRAN, -cell * 0.6, -cell * 0.6, cell * 1.2, cell * 1.2);
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        const sCount = Math.ceil(surf.visibleSpots);
        for (let i = 0; i < sCount; i++) {
            const sp = surf.spots[i];
            sp.angle += dt * 0.05;
            const sx = Math.cos(sp.angle) * rp * 0.55, sy = Math.sin(sp.angle) * rp * 0.55;
            const boundaryAlpha = (i < sCount - 1) ? 1 : clamp(surf.visibleSpots - (sCount - 1), 0, 1);
            const op = clamp(tier.spotOpacity * 2.2, 0, 1) * boundaryAlpha * blend;
            const sr = rp * 0.17 * sp.sizeSeed;
            const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
            sg.addColorStop(0, `rgba(40,14,2,${0.9 * op})`);
            sg.addColorStop(0.42, `rgba(70,28,6,${0.75 * op})`);
            sg.addColorStop(0.62, `rgba(120,60,20,${0.35 * op})`);
            sg.addColorStop(1, 'rgba(120,60,20,0)');
            ctx.globalAlpha = 1;
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        surf.visibleWind += (tier.wind - surf.visibleWind) * (1 - Math.exp(-2 * dt));
        const windCount = Math.ceil(surf.visibleWind);
        const maxDist = rp * 4.5;
        ctx.fillStyle = rgba(core, 1);
        for (let i = 0; i < windCount; i++) {
            const p = surf.wind[i] || (surf.wind[i] = {
                a: Math.random() * Math.PI * 2, dist: Math.random() * maxDist,
                speed: 0.7 + Math.random() * 0.6, size: 0.6 + Math.random() * 0.8,
            });
            p.dist += tier.windSpeed * p.speed * dt * (1 + instab * 0.5);
            p.dist %= maxDist;
            const fade = clamp(1 - p.dist / maxDist, 0, 1);
            const boundaryAlpha = (i < windCount - 1) ? 1 : clamp(surf.visibleWind - (windCount - 1), 0, 1);
            ctx.globalAlpha = 0.45 * fade * boundaryAlpha * blend;
            const d0 = rp + p.dist, d1 = d0 + 4 + p.size * 3;
            ctx.strokeStyle = rgba(core, 1);
            ctx.lineWidth = 0.6 + p.size * 0.6;
            ctx.beginPath();
            ctx.moveTo(Math.cos(p.a) * d0, Math.sin(p.a) * d0);
            ctx.lineTo(Math.cos(p.a) * d1, Math.sin(p.a) * d1);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        surf.flareTimer -= dt;
        if (surf.flareTimer <= 0) {
            const [lo, hi] = tier.flareEvery;
            surf.flareTimer = (lo + Math.random() * (hi - lo)) / (1 + instab * 2);
            surf.flares.push({ a: Math.random() * Math.PI * 2, t: 0, dur: 1.1 + Math.random() * 0.8, size: tier.flareSize, span: 0.12 + Math.random() * 0.14 });
        }
        for (let i = surf.flares.length - 1; i >= 0; i--) {
            const f = surf.flares[i];
            f.t += dt;
            if (f.t >= f.dur) {
                surf.flares.splice(i, 1);
                continue;
            }
            const p = f.t / f.dur;
            const rise = Math.sin(p * Math.PI);
            const span = f.span || 0.18;
            const h = rp * (1 + f.size * 0.55 * Math.sqrt(p) + 0.05);
            const a0 = f.a - span, a1 = f.a + span;
            ctx.globalAlpha = rise * 0.85 * blend;
            ctx.strokeStyle = rgba(mixRgb(base, [255, 150, 110], 0.45), 1);
            ctx.lineWidth = Math.max(1.2, rp * 0.05);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(Math.cos(a0) * rp * 0.98, Math.sin(a0) * rp * 0.98);
            ctx.bezierCurveTo(Math.cos(a0) * h * 1.15, Math.sin(a0) * h * 1.15, Math.cos(a1) * h * 1.15, Math.sin(a1) * h * 1.15, Math.cos(a1) * rp * 0.98, Math.sin(a1) * rp * 0.98);
            ctx.stroke();
            const fl = clamp(1 - p * 3, 0, 1);
            if (fl > 0) {
                const fx = Math.cos(f.a) * rp, fy = Math.sin(f.a) * rp;
                const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, rp * 0.4 * f.size);
                fg.addColorStop(0, `rgba(255,255,255,${0.9 * fl * blend})`);
                fg.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.globalAlpha = 1;
                ctx.fillStyle = fg;
                ctx.beginPath();
                ctx.arc(fx, fy, rp * 0.4 * f.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
        return { x, y, r: rp };
    };
})();
