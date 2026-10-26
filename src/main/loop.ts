/* 메인 requestAnimationFrame 루프: 배경/별/시뮬레이션/이벤트 스케줄링을 매 프레임 조율 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const RT = Gp._runtime;
  const state = G.state;
  const clamp = G.clamp;
  const R = G.Render;

  // 사망 연출 단계별 지속시간(초)
  const ENDING_MOVE_DUR = 1.0;  // 별이 화면 중앙으로 미끄러져 오는 시간
  const ENDING_HOLD_DUR = 1.6;  // 엔딩 모양이 다 형성된 뒤 정지해서 보여주는 시간
  const ENDING_FADE_DUR = 1.4;  // 암전 시간

  // 점화 직후 나이 진행 속도를 형성기 속도에서 항성 속도로 끌어올리는 시간(초)
  const IGNITION_RAMP_DUR = 4.0;

  function loop(now: number) {
    const dt = clamp((now - RT.lastT) / 1000, 0, 0.05);
    RT.lastT = now;
    requestAnimationFrame(loop);

    const ctx = R.ctx, W = R.W, H = R.H;

    // 배경(우주의 노화에 따른 어둠 + 시차 별밭/은하수/성운). 카메라는 실제
    // 게임 중에는 게임 속도로, 인트로의 응축 단계에선 멈췄다가 팬이 시작되면
    // 같은 속도로, 시작 화면에서는 아주 느리게 표류해 메뉴 뒤 우주가 살아 있게 한다.
    let scroll = 0;
    if (RT.introPlaying) scroll = RT.introT >= RT.introDur ? 1 : 0;
    else if (state.started && !state.gameOver) scroll = 1;
    else if (!state.started) scroll = 0.15;
    const budget = RT.introPlaying ? R.stars.length : R.starBudget();
    R.drawBackground(dt, scroll, budget);

    if (RT.introPlaying) {
      Gp._introTick(dt);
    } else if (state.started && !state.gameOver) {
      const E = G.Effects, N = G.Nebula;
      R.starAngle += dt * (0.6 + state.mass / 30) * E.mods.spin;
      // 시간 도약(동반성 사망 후) 중에는 효과·성운 시계를 멈춘다
      const fxDt = RT.timeSkipping ? 0 : dt;
      const lastBody: StarActorPoint = Gp._bodyCache || { x: R.W * G.STAR_REST_X_FRACTION, y: R.H * 0.55, r: R.starRadius(state.volume) };
      // 효과 수치 → 성운 물리 순서. 몸체 위치는 직전 프레임 값을 쓴다(1프레임 차이는 보이지 않는다)
      E.update(fxDt, lastBody);
      N.update(fxDt, lastBody);
      // 몸체 뒤 연출(중력장, 효과의 배경층) → 몸체 → 앞 연출
      N.drawBack(ctx, lastBody, dt);
      E.drawBack(ctx, lastBody, dt);
      const body = R.drawPlayerStar(dt);
      Gp._bodyCache = body;
      if (state.hasCompanion && state.companionAlive) E.companionPos = R.drawCompanionStar(dt);
      else E.companionPos = null;
      N.drawFront(ctx, body, dt);
      E.drawFront(ctx, body, dt);

      // simulation updates
      // 선택지가 없어졌으므로 이동거리는 항상 일정하게 흐른다. 이 값이 후반 효과의
      // 개방 시점(점화 후 2광년 ≈ 20초)을 정한다.
      if (state.hasFusion) state.postIgnitionDistanceLy += G.SPEED * dt;
      state.distanceLy += G.SPEED * dt;
      // 나이는 점화 전에도 흐른다. 예전엔 점화 후에만 흘러서, 형성기 내내
      // 화면에 "0년"이 박힌 채로 거리만 몇 광년씩 쌓였다 — 0년 만에 1광년을
      // 가는 초광속이었다. 형성기에는 원시행성계원반의 실제 수명 규모로,
      // 점화 후에는 그 별의 실제 주계열 수명 규모로 흐른다(physics.ts).
      //
      // 다만 그 둘은 규모가 60만 배 가까이 차이나서, 점화하는 순간 카운터가
      // 한 프레임 만에 폭주하듯 튄다. 점화 직후 몇 초에 걸쳐 기하적으로
      // (비율을 일정하게) 가속시켜 "서서히 빨라진다"로 만든다.
      if (state.collapseRush) {
        // 말기 연소 단계들은 주계열 수명에 비하면 찰나다(규소 연소는 하루) —
        // 질주하는 몇 초 동안 나이를 주계열 속도로 계속 올리면 수명이 부풀려진다.
      } else if (state.hasFusion) {
        RT.ignitionAgeRampT = Math.min(RT.ignitionAgeRampT + dt, IGNITION_RAMP_DUR);
        const t = clamp(RT.ignitionAgeRampT / IGNITION_RAMP_DUR, 0, 1);
        const eased = t * t * (3 - 2 * t); // smoothstep
        const stellar = G.yearsPerSecond(state.mass);
        const rate = Math.pow(G.FORMATION_YEARS_PER_SEC, 1 - eased) * Math.pow(stellar, eased);
        state.ageYears += dt * rate;
      } else {
        state.ageYears += dt * G.FORMATION_YEARS_PER_SEC;
      }
      if (!RT.timeSkipping) {
        // 핵융합이 붙기 전(아직 "별"이 아닌 원시체) 상태에서는 생명력(fuel)이라는
        // 개념 자체가 없다 — 태울 연료가 없으니 소모될 것도 없다.
        if (state.hasFusion) state.fuel -= G.fuelBurnRate(state.mass) * dt * G.Effects.mods.fuelBurn;

        // 항성풍 분출 같은 효과가 거는 질량 손실(초당 비율)
        if (G.Effects.mods.massDrain > 0) state.mass = Math.max(1e-9, state.mass * (1 - G.Effects.mods.massDrain * dt));

        if (!state.hasFusion) {
          // 형성기의 질량 성장은 오직 성운 흡수(nebula/nebula.ts)로만 일어난다 —
          // 키를 누르지 않으면 원시체는 자라지 않는다.
        } else {
          // 항성풍 질량 손실. 문헌상 O형 별은 주계열 기간 동안 누적으로 초기
          // 질량의 대략 10~50%를 항성풍으로 잃는다(연간 손실률 10^-6~10^-5 M☉,
          // Björklund+ 2012 등). 백색왜성 경계(8 M☉) 근처에서는 사실상 0%,
          // 80 M☉ 안팎에서 상한 50%가 되도록 "생애 손실 비율" f(mass)를 정하고,
          // f(mass)*mass를 남은 수명(FUEL_MAX/연료소모율) 동안 나눠 잃는
          // 속도로 역산한다 — 그러면 실제 별이 정확히 그 비율만큼만 잃고
          // 죽도록 자동으로 맞춰진다.
          const lifeFrac = G.clamp((state.mass - G.WHITE_DWARF_MAX) / 72, 0, 0.5);
          const windLoss = lifeFrac * state.mass * G.fuelBurnRate(state.mass) / G.FUEL_MAX;
          state.mass = Math.max(0.05, state.mass - windLoss * dt);
        }
        Gp._companionUpdate(dt);
      }

      // 이번 판에서 실제로 어디까지 태웠는지 기록해 둔다. 질량이 이벤트로
      // 오르내리므로 죽는 순간의 질량만으로는 알 수 없다 — 한때 15 M☉까지
      // 올라가 탄소를 태웠다면, 나중에 질량을 잃어도 그 핵은 이미 만들어졌다.
      // 도달 단계 기록 + 건너뛴 단계 질주(collapse.ts). 연료가 바닥났고 마지막
      // 단계까지 다 보여줬으면 naturalDeath가 true가 된다.
      const naturalDeath = state.hasFusion && Gp._stageRushUpdate(dt);

      // 점화 판정: 질량이 수소연소한계를 넘는 순간 단 한 번 발생.
      if (!state.hasFusion && state.mass >= G.IGNITION_MASS) Gp._triggerIgnition();

      // ending triggers
      if (state.collisionFlag) Gp._triggerEnding('collision');
      else if (state.mergeFlag) Gp._triggerEnding('merge');
      else if (naturalDeath) Gp._triggerEnding(G.Ending.naturalEndingKind());

      Gp._hudUpdate(dt);
    } else if (state.gameOver) {
      // move → form → hold → fadeOut → done 순서로 진행되는 사망 연출.
      // 화면 이동(별밭 스크롤)은 이미 위에서 !state.gameOver 조건으로 멈춰 있다.
      if (RT.endingPhase === 'move') {
        RT.endingMoveT += dt;
        const p = clamp(RT.endingMoveT / ENDING_MOVE_DUR, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        R.drawPlayerStar(dt, eased);
        if (p >= 1) {
          RT.endingPhase = 'form';
          R.setupEndingAnim(state.endingType!);
        }
      } else if (RT.endingPhase === 'form') {
        // 별이 중앙에 도착한 뒤로는 엔딩 모양이 별을 대신한다 — 별을 계속 그리면
        // (특히 항성풍/플레어의 흰 섬광 때문에) 엔딩 모양 뒤에서 별이 그대로
        // 비쳐 보이거나, 초신성처럼 번쩍이는 것처럼 착각하게 만드는 버그가 있었다.
        R.endingAnimT += dt;
        R.drawEndingAnim();
        if (R.endingAnimT >= R.endingAnimDur) {
          RT.endingPhase = 'hold';
          RT.endingHoldT = 0;
        }
      } else if (RT.endingPhase === 'hold') {
        R.drawEndingAnim(); // endingAnimT를 더 늘리지 않아 완성된 형태로 정지
        RT.endingHoldT += dt;
        if (RT.endingHoldT >= ENDING_HOLD_DUR) {
          RT.endingPhase = 'fadeOut';
          RT.endingFadeT = 0;
        }
      } else if (RT.endingPhase === 'fadeOut') {
        R.drawEndingAnim();
        RT.endingFadeT += dt;
        const fp = clamp(RT.endingFadeT / ENDING_FADE_DUR, 0, 1);
        ctx.fillStyle = `rgba(0,0,0,${fp})`;
        ctx.fillRect(0, 0, W, H);
        if (fp >= 1) {
          RT.endingPhase = 'done';
          G.Ending.buildCredits();
        }
      }
    }
  }

  Gp._mainLoop = loop;
})();
