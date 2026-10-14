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
  // 행성 표면 지도는 생성에 수십 ms가 든다 — 시작 화면에 머무는 동안 미리
  // 만들어 두어, 게임이 시작되는 순간 첫 프레임이 끊기지 않게 한다.
  setTimeout(Gp._renderWarmBodyTextures, 120);

  G.Render = Render;
})();
