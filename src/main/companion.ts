/* 동반성 운명 시뮬레이션: 연료 소모, 병합/시간도약 트리거 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const RT = Gp._runtime;
  const state = G.state;
  const clamp = G.clamp;
  const A = G.Audio;

  Gp._timeSkipToken = 0;

  Gp._companionUpdate = function (dt: number) {
    if (!state.hasCompanion || !state.companionAlive || state.gameOver) return;
    // 모든 tier에 동일한 연소율을 적용한다. 예전엔 low tier만 0.01/s로 고정해
    // 한 세션(수십 초) 안에서는 절대 죽지 않았고, 그 결과 동반성 롤의 1/3이
    // 후반 동반성 콘텐츠(위기·충돌)에 영영 도달하지 못했다.
    // 1.6배: 포획된 시점부터 세면 동반성도 플레이어 별과 비슷한 ~100초를 사는데,
    // 그러면 플레이어가 먼저 죽어 병합·시간 도약 결말에 거의 닿지 못했다.
    const burn = G.fuelBurnRate(state.companionMass) * 1.6;
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
    // 동반성의 주계열 수명(τ ≈ 100억 년 × M^-2.5) 중 이미 흐른 나이는 빼고 남은 만큼만
    // 도약한다 — 전부 더하면 같은 시간을 두 번 세는 셈이 된다. 남은 시간이 거의 없으면
    // (수십억 년 된 별 곁의 무거운 동반성은 사실 훨씬 먼저 죽었어야 한다) 연출을 생략한다.
    const lifetime = 1e10 * Math.pow(Math.max(0.08, state.companionMass), -2.5);
    const target = Math.round(Math.max(0, lifetime - state.ageYears));
    if (target < 1e5) return;
    const token = ++Gp._timeSkipToken;
    RT.timeSkipping = true;
    const el = document.getElementById('timeskip')!;
    const od = document.getElementById('odometer')!;
    el.classList.add('show');
    A.playSweep(300, 60, 2.4);
    const dur = 2400; const t0 = performance.now();
    function step(now: number) {
      // 도약 도중 재시작·종료됐다면 새 판에 영향을 주지 않고 멈춘다
      if (token !== Gp._timeSkipToken || state.gameOver) { el.classList.remove('show'); return; }
      const p = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.floor(eased * target);
      od.textContent = G.formatYears(val);
      if (p < 1) requestAnimationFrame(step);
      else {
        state.ageYears += target;
        setTimeout(() => {
          el.classList.remove('show');
          if (token === Gp._timeSkipToken) RT.timeSkipping = false;
        }, 400);
      }
    }
    requestAnimationFrame(step);
  };
})();
