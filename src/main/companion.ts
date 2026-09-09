/* 동반성 운명 시뮬레이션: 연료 소모, 병합/시간도약 트리거 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const RT = Gp._runtime;
  const state = G.state;
  const clamp = G.clamp;
  const A = G.Audio;

  Gp._companionUpdate = function (dt: number) {
    if (!state.hasCompanion || !state.companionAlive || state.gameOver) return;
    // 모든 tier에 동일한 연소율을 적용한다. 예전엔 low tier만 0.01/s로 고정해
    // 한 세션(수십 초) 안에서는 절대 죽지 않았고, 그 결과 동반성 롤의 1/3이
    // 후반 동반성 콘텐츠(위기·충돌)에 영영 도달하지 못했다.
    const burn = G.fuelBurnRate(state.companionMass);
    state.companionFuel -= burn * dt;
    if (state.companionFuel <= 0) {
      state.companionAlive = false;
      if (state.companionTier === 'high') {
        if (state.staysBound) { state.mergeFlag = true; }
      } else if (state.companionTier === 'mid') {
        if (state.staysBound) { Gp._companionPlayTimeSkip(); }
      }
    }
  };

  Gp._companionPlayTimeSkip = function () {
    RT.timeSkipping = true;
    const el = document.getElementById('timeskip')!;
    const od = document.getElementById('odometer')!;
    el.classList.add('show');
    A.playSweep(300, 60, 2.4);
    // 동반성이 죽고 나서 흐르는 시간은 그 동반성의 실제 주계열 수명
    // (τ ≈ 100억 년 × M^-2.5)으로 잡는다 — 8~20 M☉면 수백만~수천만 년.
    const target = Math.round(1e10 * Math.pow(Math.max(0.08, state.companionMass), -2.5));
    const dur = 2400; const t0 = performance.now();
    function step(now: number) {
      const p = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.floor(eased * target);
      od.textContent = G.formatYears(val);
      if (p < 1) requestAnimationFrame(step);
      else {
        state.ageYears += target;
        setTimeout(() => { el.classList.remove('show'); RT.timeSkipping = false; }, 400);
      }
    }
    requestAnimationFrame(step);
  };
})();
