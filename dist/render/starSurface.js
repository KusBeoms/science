"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const clamp = G.clamp;
    const ctx = Gp._renderCtx;
    const STAR_TIERS = [
        { max: 13, color: [255, 178, 102], granules: 2, granuleSpeed: 0.40, spots: 2, spotOpacity: 0.40, flareEvery: [5, 9], flareSize: 0.50, wind: 0, windSpeed: 0, oblate: 0, pulse: 1.0 },
        { max: 19, color: [255, 206, 140], granules: 3, granuleSpeed: 0.55, spots: 1, spotOpacity: 0.28, flareEvery: [9, 14], flareSize: 0.55, wind: 0, windSpeed: 0, oblate: 0, pulse: 1.0 },
        { max: 31, color: [255, 238, 204], granules: 5, granuleSpeed: 0.75, spots: 1, spotOpacity: 0.18, flareEvery: [14, 22], flareSize: 0.60, wind: 6, windSpeed: 18, oblate: 0, pulse: 1.0 },
        { max: 50, color: [255, 248, 235], granules: 6, granuleSpeed: 0.90, spots: 0, spotOpacity: 0, flareEvery: [18, 26], flareSize: 0.65, wind: 10, windSpeed: 24, oblate: 0.02, pulse: 1.05 },
        { max: 65, color: [226, 232, 255], granules: 6, granuleSpeed: 1.05, spots: 0, spotOpacity: 0, flareEvery: [16, 24], flareSize: 0.75, wind: 16, windSpeed: 32, oblate: 0.06, pulse: 1.10 },
        { max: 80, color: [190, 206, 255], granules: 7, granuleSpeed: 1.30, spots: 0, spotOpacity: 0, flareEvery: [10, 16], flareSize: 0.90, wind: 28, windSpeed: 48, oblate: 0.11, pulse: 1.30 },
        { max: 160, color: [160, 182, 255], granules: 8, granuleSpeed: 1.60, spots: 0, spotOpacity: 0, flareEvery: [5, 9], flareSize: 1.10, wind: 42, windSpeed: 70, oblate: 0.17, pulse: 1.60 },
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
            wind: [], flareTimer: 2 + Math.random() * 4, flares: [],
        };
    }
    Gp._renderMassColor = function (m) {
        const mm = Number.isFinite(m) ? clamp(m, 6, 160) : 6;
        const nodes = [[6, [255, 120, 80]]];
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
        const mm = Number.isFinite(m) ? clamp(m, 6, 160) : 6;
        for (const t of STAR_TIERS)
            if (mm <= t.max)
                return t;
        return STAR_TIERS[STAR_TIERS.length - 1];
    };
    Gp._renderGetSurface = function (id) {
        if (!surfaces[id])
            surfaces[id] = makeSurface();
        return surfaces[id];
    };
    Gp._renderResetSurfaces = function () {
        for (const k in surfaces)
            delete surfaces[k];
    };
    Gp._renderDrawStarBody = function (x, y, mass, volume, fuelFrac, angle, id, dt) {
        id = id || 'anonymous';
        dt = (dt == null) ? 0.016 : dt;
        const tier = Gp._renderStarClass(mass);
        const col = Gp._renderMassColor(mass);
        const surf = Gp._renderGetSurface(id);
        const r = 14 + clamp(volume, 6, 160) * 0.55;
        const instab = fuelFrac < 0.2 ? 1 - fuelFrac / 0.2 : 0;
        const pulse = 1 + Math.sin(performance.now() / 120) * 0.06 * instab * tier.pulse;
        const rp = r * pulse;
        const squashY = 1 - tier.oblate;
        const ease = 1 - Math.exp(-3 * dt);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(1, squashY);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rp * 2.2);
        grad.addColorStop(0, col);
        grad.addColorStop(0.5, col + '');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, rp * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(0, 0, rp, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        surf.visibleGranules += (tier.granules - surf.visibleGranules) * ease;
        const gCount = Math.ceil(surf.visibleGranules);
        ctx.fillStyle = 'rgba(0,0,0,1)';
        for (let i = 0; i < gCount; i++) {
            const g = surf.granules[i];
            g.phase += dt * tier.granuleSpeed * g.speedSeed;
            const a = g.angle + g.phase * 0.15;
            const gx = Math.cos(a) * rp * g.rOff, gy = Math.sin(a) * rp * g.rOff;
            const boundaryAlpha = (i < gCount - 1) ? 1 : clamp(surf.visibleGranules - (gCount - 1), 0, 1);
            ctx.globalAlpha = 0.16 * boundaryAlpha;
            ctx.beginPath();
            ctx.ellipse(gx, gy, rp * 0.14 * g.sizeSeed, rp * 0.10 * g.sizeSeed, a, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        surf.visibleSpots += (tier.spots - surf.visibleSpots) * ease;
        const sCount = Math.ceil(surf.visibleSpots);
        ctx.fillStyle = '#000';
        for (let i = 0; i < sCount; i++) {
            const sp = surf.spots[i];
            sp.angle += dt * 0.05;
            const sx = Math.cos(sp.angle) * rp * 0.6, sy = Math.sin(sp.angle) * rp * 0.6;
            const boundaryAlpha = (i < sCount - 1) ? 1 : clamp(surf.visibleSpots - (sCount - 1), 0, 1);
            ctx.globalAlpha = tier.spotOpacity * boundaryAlpha;
            ctx.beginPath();
            ctx.ellipse(sx, sy, rp * 0.16 * sp.sizeSeed, rp * 0.12 * sp.sizeSeed, sp.angle, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        ctx.save();
        ctx.translate(x, y);
        surf.visibleWind += (tier.wind - surf.visibleWind) * (1 - Math.exp(-2 * dt));
        const windCount = Math.ceil(surf.visibleWind);
        const maxDist = rp * 4.5;
        ctx.fillStyle = col;
        for (let i = 0; i < windCount; i++) {
            const p = surf.wind[i] || (surf.wind[i] = {
                a: Math.random() * Math.PI * 2, dist: Math.random() * maxDist,
                speed: 0.7 + Math.random() * 0.6, size: 0.6 + Math.random() * 0.8,
            });
            p.dist += tier.windSpeed * p.speed * dt * (1 + instab * 0.5);
            p.dist %= maxDist;
            const fade = clamp(1 - p.dist / maxDist, 0, 1);
            const boundaryAlpha = (i < windCount - 1) ? 1 : clamp(surf.visibleWind - (windCount - 1), 0, 1);
            ctx.globalAlpha = 0.5 * fade * boundaryAlpha;
            const wx = Math.cos(p.a) * (rp + p.dist), wy = Math.sin(p.a) * (rp + p.dist);
            ctx.beginPath();
            ctx.arc(wx, wy, 1.2 * p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        surf.flareTimer -= dt;
        if (surf.flareTimer <= 0) {
            const [lo, hi] = tier.flareEvery;
            surf.flareTimer = (lo + Math.random() * (hi - lo)) / (1 + instab * 2);
            surf.flares.push({ a: Math.random() * Math.PI * 2, t: 0, dur: 0.4 + Math.random() * 0.3, size: tier.flareSize });
        }
        ctx.fillStyle = '#fff';
        for (let i = surf.flares.length - 1; i >= 0; i--) {
            const f = surf.flares[i];
            f.t += dt;
            if (f.t >= f.dur) {
                surf.flares.splice(i, 1);
                continue;
            }
            const p = f.t / f.dur;
            const fx = Math.cos(f.a) * rp, fy = Math.sin(f.a) * rp;
            const rad = rp * f.size * (0.3 + p * 0.9) * 0.35;
            ctx.globalAlpha = (1 - p) * 0.8;
            ctx.beginPath();
            ctx.arc(fx, fy, rad, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        return { x, y, r: rp };
    };
})();
