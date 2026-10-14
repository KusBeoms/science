"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const Render = {
        canvas: Gp._renderCanvas,
        ctx: Gp._renderCtx,
        W: 0, H: 0,
        stars: [],
        starAngle: 0,
        companionOrbitAngle: 0,
        endingAnimT: 0, endingAnimDur: 3.2, endingParticles: [],
        resize() { Gp._renderResize.call(this); },
        initStars() { Gp._renderInitStars.call(this); },
        starBudget() { return Gp._renderStarBudget.call(this); },
        bgDarkness() { return Gp._renderBgDarkness.call(this); },
        drawBackground(dt, scroll, budget) { Gp._renderDrawBackground.call(this, dt, scroll, budget); },
        massColor(m) { return Gp._renderMassColor(m); },
        starClass(m) { return Gp._renderStarClass(m); },
        starRadius(volume) { return Gp._renderStarRadius(volume); },
        getSurface(id) { return Gp._renderGetSurface(id); },
        resetSurfaces() { Gp._renderResetSurfaces(); },
        drawStarBody(x, y, mass, volume, fuelFrac, angle, id, dt, ignitionBlend) {
            return Gp._renderDrawStarBody(x, y, mass, volume, fuelFrac, angle, id, dt, ignitionBlend);
        },
        drawPlayerStar(dt, centerT, panT) { return Gp._renderDrawPlayerStar.call(this, dt, centerT, panT); },
        drawCompanionStar(dt) { return Gp._renderDrawCompanionStar.call(this, dt); },
        setupEndingAnim(type) { Gp._renderSetupEndingAnim.call(this, type); },
        playEndingSound(type) { Gp._renderPlayEndingSound.call(this, type); },
        drawEndingAnim() { Gp._renderDrawEndingAnim.call(this); },
    };
    window.addEventListener('resize', () => Render.resize());
    Render.resize();
    setTimeout(Gp._renderWarmBodyTextures, 120);
    G.Render = Render;
})();
