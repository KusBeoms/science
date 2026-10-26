/* 게임 상태 객체: 생성, 참조 유지 리셋, 시작 프리셋 적용 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));

  function freshState(): GameState {
    return {
      started: false, gameOver: false, hasFusion: false, endingType: null,
      mass: 1 * G.EARTH_MASS, volume: 20, fuel: G.FUEL_MAX,
      ageYears: 0, maxFusionIndex: -1, forcedFusionIndex: -1, collapseRush: null, distanceLy: 0, postIgnitionDistanceLy: 0, accretionBoost: 1,
      companionOffered: Math.random() < G.COMPANION_ENCOUNTER_CHANCE,
      hasCompanion: false, companionTier: null, companionMass: 0, companionFuel: 0,
      companionAlive: false, staysBound: false, mergeFlag: false, collisionFlag: false,
      companionEventShown: false, crisisShown: false, collisionEventShown: false, lastBreathShown: false,
      gravity: 1, pressCount: 0, burstPresses: 0, lastPressAt: 0, absorbedClouds: 0,
      playTime: 0, nextEffectAt: 6, lastEffectId: null, usedEffects: new Set<string>(),
      effectLog: [],
      phaseStarBudget: 220,
    };
  }

  // state는 여러 모듈이 참조를 공유해야 하므로, 재시작 시에도
  // 객체 참조 자체는 유지한 채 내용만 Object.assign으로 교체한다.
  G.state = freshState();
  G.resetState = function () {
    Object.assign(G.state, freshState());
  };

  G.applyPreset = function (id: string) {
    const preset = G.NEBULA_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    G.state.mass = preset.mass;
    G.state.volume = preset.volume;
    G.state.accretionBoost = preset.accretionBoost;

    // 시작 질량이 이미 수소연소한계를 넘는 프리셋(고밀도)은 형성기 없이
    // 곧바로 항성으로 태어난다. 점화 판정(main/loop.ts)이 다시 걸리지 않도록
    // 여기서 상태를 완성해 둔다.
    if (G.state.mass >= G.IGNITION_MASS) {
      G.state.hasFusion = true;
      G.state.fuel = G.FUEL_MAX;
      G.state.maxFusionIndex = 0; // 수소 연소부터
      // 나이 가속 램프는 "형성기 속도 → 항성 속도" 전환을 부드럽게 하려는
      // 장치다. 형성기 자체가 없으므로 처음부터 항성 속도로 흐르게 다 채워둔다.
      const RT = (G as any)._runtime;
      if (RT) RT.ignitionAgeRampT = 1e9;
    }
  };
})();
