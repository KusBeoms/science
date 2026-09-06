/* canvas/background/starSurface/starActors/endingAnim 조각을 모아 Game.Render로 조립 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  const Render: RenderAPI = {
    canvas: Gp._renderCanvas,
    ctx: Gp._renderCtx,
    W: 0, H: 0,
    stars: [],
    starAngle: 0,
    endingAnimT: 0, endingAnimDur: 3.2, endingParticles: [],

    resize() { Gp._renderResize.call(this); },
    initStars() { Gp._renderInitStars.call(this); },
    starBudget() { return Gp._renderStarBudget.call(this); },
    bgDarkness() { return Gp._renderBgDarkness.call(this); },
    massColor(m) { return Gp._renderMassColor(m); },
    starClass(m) { return Gp._renderStarClass(m); },
    getSurface(id) { return Gp._renderGetSurface(id); },
    resetSurfaces() { Gp._renderResetSurfaces(); },
    drawStarBody(x, y, mass, volume, fuelFrac, angle, id, dt) {
      return Gp._renderDrawStarBody(x, y, mass, volume, fuelFrac, angle, id, dt);
    },
    drawPlayerStar(dt) { return Gp._renderDrawPlayerStar.call(this, dt); },
    drawCompanionStar(dt) { return Gp._renderDrawCompanionStar.call(this, dt); },
    setupEndingAnim(type) { Gp._renderSetupEndingAnim.call(this, type); },
    playEndingSound(type) { Gp._renderPlayEndingSound.call(this, type); },
    drawEndingAnim() { Gp._renderDrawEndingAnim.call(this); },
  };

  window.addEventListener('resize', () => Render.resize());
  Render.resize();

  G.Render = Render;
})();
