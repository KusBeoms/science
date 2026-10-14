"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const clamp = G.clamp;
    function lerp(a, b, t) { return a + (b - a) * t; }
    function restingX(R, volume) {
        const normalX = R.W * G.STAR_REST_X_FRACTION;
        const oversizeThresholdR = 45 * (Gp._renderViewScale || 1);
        const rightEdgeTarget = normalX + oversizeThresholdR;
        const r = Gp._renderStarRadius(volume);
        return Math.min(normalX, rightEdgeTarget - r);
    }
    function drawRockyBody(x, y, r, angle) {
        Gp._renderDrawTexturedSphere(Gp._renderCtx, 'rocky', x, y, r, angle * 0.35, 0);
    }
    function drawGasGiantBody(x, y, r, angle) {
        Gp._renderDrawTexturedSphere(Gp._renderCtx, 'gasGiant', x, y, r, angle * 0.3, 0.08);
    }
    function drawProtoBody(x, y, volume, angle, isGasGiant) {
        const r = Math.max(6, Gp._renderStarRadius(volume) * G.PROTO_BODY_SCALE);
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
        const orbitR = (90 + m1 * 1.2) * (Gp._renderViewScale || 1);
        this.companionOrbitAngle += (dt == null ? 0.016 : dt) * companionOrbitSpeed(m1, m2);
        const angle = this.companionOrbitAngle;
        const x = px + Math.cos(angle) * orbitR;
        const y = py + Math.sin(angle) * orbitR * 0.4;
        const fuelFrac = clamp(state.companionFuel / G.FUEL_MAX, 0, 1);
        const volume = clamp(20 + state.companionMass * 3, 6, 160);
        return Gp._renderDrawStarBody(x, y, state.companionMass, volume, fuelFrac, -angle * 1.3, 'companion', dt);
    };
})();
