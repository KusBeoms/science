/* 전역 상수 + 시작 프리셋 테이블 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));

  G.SPEED = 0.1; // ly / sec
  G.FUEL_MAX = 750;
  G.BASE_BURN = 6;
  G.MASS_REF = 20;

  // 총량은 기존 기본값(20/20)과 비슷하게 맞춰
  // 기존 이벤트 임계값(mass<50, mass>=80 등)의 밸런스를 해치지 않는다.
  G.NEBULA_PRESETS = [
    { id: 'dense', name: '고밀도 성운', desc: '무겁고 짧게 타오른다', mass: 34, volume: 14 },
    { id: 'standard', name: '표준 성운', desc: '균형 잡힌 시작', mass: 20, volume: 20 },
    { id: 'diffuse', name: '희박한 성운', desc: '가볍고 오래 살아남는다', mass: 12, volume: 32 },
  ];
})();
