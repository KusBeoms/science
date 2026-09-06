/* 순수 수치 헬퍼: 클램프, 연료 소모율, 질량 기반 체감 나이 속도 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));

  G.clamp = function (v: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, v));
  };

  G.fuelBurnRate = function (m: number): number {
    return G.BASE_BURN * (1 + m / 100);
  };

  // 실제 항성의 주계열 수명은 질량이 클수록 급격히 짧아진다 (수명 ∝ M^-2.5).
  // 여기서는 반대로 "연(年) 카운터가 흐르는 체감 속도"에 반영해, 무거운 별일수록
  // 화면상 나이가 빠르게 올라가도록(짧고 굵게 산다) 표현한다. 기준 질량(20)에서는
  // 기존과 동일하게 1년/초가 되도록 정규화.
  G.yearsPerSecond = function (m: number): number {
    const ratio = Math.pow(G.clamp(m, 6, 160) / G.MASS_REF, 2.5);
    return G.clamp(ratio, 0.2, 8);
  };
})();
