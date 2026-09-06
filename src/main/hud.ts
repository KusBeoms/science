/* HUD 갱신: 시계, 이동거리, 질량, 생명력 게이지 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const state = G.state;
  const clamp = G.clamp;

  const lifeGaugeFill = document.getElementById('lifeGaugeFill') as HTMLElement;
  const massDisplay = document.getElementById('massDisplay')!;

  Gp._hudUpdate = function () {
    document.getElementById('clockDisplay')!.textContent = Math.floor(state.ageYears).toLocaleString('ko-KR') + '년';
    document.getElementById('distDisplay')!.textContent = state.distanceLy.toFixed(1) + ' 광년';
    massDisplay.textContent = '~' + state.mass.toFixed(1) + ' × 태양';

    const frac = clamp(state.fuel / G.FUEL_MAX, 0, 1);
    lifeGaugeFill.style.width = (frac * 100) + '%';
    lifeGaugeFill.style.background = frac < 0.3 ? '#ff6b6b' : (frac < 0.6 ? '#ffcf6b' : '#7fa0ff');
    lifeGaugeFill.classList.toggle('danger', frac < 0.2);
  };
})();
