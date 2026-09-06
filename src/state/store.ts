/* 게임 상태 객체: 생성, 참조 유지 리셋, 시작 프리셋 적용 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));

  function freshState(): GameState {
    return {
      started: false, gameOver: false, endingType: null,
      mass: 20, volume: 20, fuel: G.FUEL_MAX,
      ageYears: 0, distanceLy: 0,
      hasCompanion: false, companionTier: null, companionMass: 0, companionFuel: 0,
      companionAlive: false, staysBound: false, mergeFlag: false, collisionFlag: false,
      companionEventShown: false, crisisShown: false, collisionEventShown: false, lastBreathShown: false,
      lastEventId: null, usedOnce: new Set<number>(),
      choiceLog: [],
      eventOpen: false, nextEventAt: 6,
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
  };
})();
