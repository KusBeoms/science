/* 자연사 시점의 엔딩 분기 판정 (충돌/병합은 즉시 트리거라 여기서 다루지 않음) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  Gp._endingNaturalType = function (): EndingKind {
    const state = G.state;
    if (state.hasCompanion && state.companionAlive && state.mass < 50) return 'friends';
    if (state.hasCompanion && !state.companionAlive && state.staysBound) return 'spider';
    if (state.mass >= 80) return 'blackhole';
    if (state.mass >= 50) return 'supernova';
    return 'whitedwarf';
  };
})();
