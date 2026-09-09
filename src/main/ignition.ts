/* 핵융합 점화: 질량이 수소연소한계(IGNITION_MASS)를 넘는 순간
   생명력(연료) 게이지가 활성화되는 일생 최초의 전환점 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const A = G.Audio;

  Gp._triggerIgnition = function () {
    const state = G.state;
    if (state.hasFusion) return;
    state.hasFusion = true;
    // 나이 카운터가 항성 속도로 튀어오르지 않고 몇 초에 걸쳐 가속되도록(loop.ts)
    Gp._runtime.ignitionAgeRampT = 0;
    // 점화 순간부터 "생명"이 시작되는 것이므로, 그 전까지 이벤트 등에서
    // 흔들렸을 수 있는 fuel 값을 점화 시점 기준으로 다시 가득 채운다.
    state.fuel = G.FUEL_MAX;
    Gp._hudResetGauge();
    // 암석질 원시체 → 빛나는 별로 그림이 한 프레임에 툭 바뀌지 않도록,
    // 0→1로 부드럽게 오르는 블렌드 값을 시작한다. starActors.ts가 이 값을
    // 읽어 drawStarBody에 넘기고, starSurface.ts가 그 값만큼 원시체 질감을
    // 겹쳐 그리며 색/글로우를 서서히 밝힌다.
    Gp._ignitionBlend = { v: 0 };
    gsap.to(Gp._ignitionBlend, { v: 1, duration: 1.2, ease: 'power2.out' });
    A.playSweep(90, 520, 1.2);
    A.playTone(660, 0.5, 'sine', 0.18, 0.15);
  };
})();
