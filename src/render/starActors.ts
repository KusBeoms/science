/* 플레이어 별 / 동반성 별 그리기 (starSurface의 drawStarBody를 실제 좌표에 적용) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const clamp = G.clamp;

  Gp._renderDrawPlayerStar = function (this: RenderAPI, dt?: number): StarActorPoint {
    const state = G.state;
    const x = this.W * 0.28, y = this.H * 0.55;
    const fuelFrac = clamp(state.fuel / G.FUEL_MAX, 0, 1);
    return Gp._renderDrawStarBody(x, y, state.mass, state.volume, fuelFrac, this.starAngle, 'player', dt);
  };

  Gp._renderDrawCompanionStar = function (this: RenderAPI, dt?: number): StarActorPoint {
    const state = G.state;
    const px = this.W * 0.28, py = this.H * 0.55;
    const orbitR = 90 + clamp(state.mass, 6, 160) * 0.4;
    const angle = this.starAngle * 0.7;
    const x = px + Math.cos(angle) * orbitR;
    const y = py + Math.sin(angle) * orbitR * 0.4;
    const fuelFrac = clamp(state.companionFuel / G.FUEL_MAX, 0, 1);
    const volume = clamp(state.companionMass * 0.7, 6, 160);
    return Gp._renderDrawStarBody(x, y, state.companionMass, volume, fuelFrac, -angle * 1.3, 'companion', dt);
  };
})();
