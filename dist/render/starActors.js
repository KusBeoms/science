"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const clamp = G.clamp;
    function lerp(a, b, t) { return a + (b - a) * t; }
    function restingX(R, volume) {
        const normalX = R.W * G.STAR_REST_X_FRACTION;
        const oversizeThresholdR = 45;
        const rightEdgeTarget = normalX + oversizeThresholdR;
        const r = Gp._renderStarRadius(volume);
        return Math.min(normalX, rightEdgeTarget - r);
    }
    function drawRockyBody(x, y, r, angle) {
        const ctx = Gp._renderCtx;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = '#5a5147';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(30,26,22,0.55)';
        const spots = [[0.35, 0.1, 0.32], [-0.4, -0.25, 0.22], [0.05, -0.5, 0.18]];
        for (const [sx, sy, sr] of spots) {
            ctx.beginPath();
            ctx.arc(sx * r, sy * r, sr * r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        ctx.save();
        ctx.translate(x, y);
        const shade = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
        shade.addColorStop(0, 'rgba(190,180,160,0.20)');
        shade.addColorStop(0.55, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(10,8,6,0.55)');
        ctx.fillStyle = shade;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,170,150,0.25)';
        ctx.lineWidth = Math.max(1, r * 0.06);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    const GAS_BANDS = [
        [-0.86, 0.16, '#9d7546'],
        [-0.58, 0.14, '#e2c69c'],
        [-0.33, 0.11, '#a5763f'],
        [-0.04, 0.17, '#f0dcb4'],
        [0.24, 0.11, '#a5763f'],
        [0.50, 0.13, '#dcbb8d'],
        [0.80, 0.18, '#9d7546'],
    ];
    function drawGasGiantBody(x, y, r, angle) {
        const ctx = Gp._renderCtx;
        const flattening = 0.08;
        const ry = r * (1 - flattening);
        ctx.save();
        ctx.translate(x, y);
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = '#c9a170';
        ctx.fillRect(-r, -ry, r * 2, ry * 2);
        for (const [center, half, color] of GAS_BANDS) {
            ctx.fillStyle = color;
            ctx.fillRect(-r, (center - half) * ry, r * 2, half * 2 * ry);
        }
        const wrap = ((angle * 0.16) % 2 + 2) % 2 - 1;
        const sx = wrap * r;
        const edgeFade = clamp(1 - Math.abs(wrap) * 1.15, 0, 1);
        if (edgeFade > 0.01) {
            ctx.globalAlpha = edgeFade;
            ctx.fillStyle = '#c05a34';
            ctx.beginPath();
            ctx.ellipse(sx, ry * 0.26, r * 0.24, ry * 0.10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(240,150,110,0.55)';
            ctx.beginPath();
            ctx.ellipse(sx, ry * 0.26, r * 0.13, ry * 0.05, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        const g = ctx.createRadialGradient(-r * 0.28, -ry * 0.32, r * 0.1, 0, 0, r * 1.02);
        g.addColorStop(0, 'rgba(255,244,220,0.20)');
        g.addColorStop(0.58, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(24,14,6,0.5)');
        ctx.fillStyle = g;
        ctx.fillRect(-r, -ry, r * 2, ry * 2);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,225,180,0.28)';
        ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.98, ry * 0.98, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    function drawProtoBody(x, y, volume, angle, isGasGiant) {
        const r = Math.max(6, Gp._renderStarRadius(volume) * 0.55);
        if (isGasGiant)
            drawGasGiantBody(x, y, r, angle);
        else
            drawRockyBody(x, y, r, angle);
        return { x, y, r };
    }
    Gp._renderDrawPlayerStar = function (dt, centerT, panT) {
        const state = G.state;
        const ct = centerT == null ? 0 : centerT;
        const pt = panT == null ? 1 : panT;
        const restX = restingX(this, state.volume);
        const baseX = lerp(this.W * 0.5, restX, pt);
        const x = lerp(baseX, this.W * 0.5, ct);
        const y = lerp(this.H * 0.55, this.H * 0.5, ct);
        if (!state.hasFusion) {
            const isGasGiant = G.Stage.bodyStageKey(state) === 'gasGiant';
            return drawProtoBody(x, y, state.volume, this.starAngle, isGasGiant);
        }
        const fuelFrac = clamp(state.fuel / G.FUEL_MAX, 0, 1);
        const ignitionBlend = Gp._ignitionBlend ? Gp._ignitionBlend.v : 1;
        return Gp._renderDrawStarBody(x, y, state.mass, state.volume, fuelFrac, this.starAngle, 'player', dt, ignitionBlend);
    };
    function companionOrbitSpeed(m1, m2) {
        const tierBoost = (Gp._renderStarClass(m1).pulse + Gp._renderStarClass(m2).pulse) / 2;
        const massFactor = Math.sqrt((m1 + m2) / 20);
        return clamp(massFactor * tierBoost * 0.4, 0.3, 2.4);
    }
    Gp._renderDrawCompanionStar = function (dt) {
        const state = G.state;
        const px = this.W * 0.28, py = this.H * 0.55;
        const m1 = clamp(state.mass, 0.1, 60), m2 = clamp(state.companionMass, 0.1, 60);
        const orbitR = 90 + m1 * 1.2;
        this.companionOrbitAngle += (dt == null ? 0.016 : dt) * companionOrbitSpeed(m1, m2);
        const angle = this.companionOrbitAngle;
        const x = px + Math.cos(angle) * orbitR;
        const y = py + Math.sin(angle) * orbitR * 0.4;
        const fuelFrac = clamp(state.companionFuel / G.FUEL_MAX, 0, 1);
        const volume = clamp(20 + state.companionMass * 3, 6, 160);
        return Gp._renderDrawStarBody(x, y, state.companionMass, volume, fuelFrac, -angle * 1.3, 'companion', dt);
    };
})();
