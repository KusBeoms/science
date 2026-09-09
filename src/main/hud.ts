/* HUD 갱신: 시계, 이동거리, 질량(단계별 단위), 상단 배지 + 단면도/나침반 위임 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const state = G.state;

  const massDisplay = document.getElementById('massDisplay')!;
  const stageDisplay = document.getElementById('stageDisplay')!;

  const EARTH_MASSES_PER_SOLAR = 1 / G.EARTH_MASS; // ≈ 332,946
  const JUPITER_MASSES_PER_SOLAR = 1047.35; // 1 M☉ ≈ 1047.35 M_Jup

  // 질량 단위는 국면에 맞춰 3단계로 바뀐다 — 지구형(지구질량) →
  // 목성형(목성질량) → 점화 후(태양질량). 각 단위에서 "0.0"으로 뭉개지지
  // 않도록 국면 전환마다 자릿수가 읽히는 단위로 갈아탄다.
  function massText(): string {
    if (state.hasFusion) return '~' + state.mass.toFixed(2) + ' × 태양';
    if (state.mass < G.GAS_GIANT_MIN_MASS) return '~' + (state.mass * EARTH_MASSES_PER_SOLAR).toFixed(2) + ' × 지구';
    return '~' + (state.mass * JUPITER_MASSES_PER_SOLAR).toFixed(2) + ' × 목성';
  }

  // 이제 없어진 생명력 게이지의 초기화 훅 — 나침반/단면도는 매 프레임 현재
  // 상태만 보고 다시 그리므로 별도 리셋이 필요 없다. 기존 호출부(재시작·점화·
  // 디버그)를 건드리지 않기 위해 이름만 남겨둔 무동작 함수로 둔다.
  Gp._hudResetGauge = function () { };

  // 연료는 단면도/단계 트랙으로만 암시돼 있어 "얼마나 남았나"를 읽을 수단이
  // 전혀 없었다. 게이지 바를 되살리는 대신 백분율 텍스트 한 줄로만 보여주고,
  // 위험 구간에서는 배지 화살표가 이미 쓰고 있는 경고색으로 물들인다.
  const fuelDisplay = document.getElementById('fuelDisplay')!;
  function updateFuel() {
    if (!state.hasFusion) {
      fuelDisplay.textContent = '—';
      fuelDisplay.className = '';
      return;
    }
    const frac = G.clamp(state.fuel / G.FUEL_MAX, 0, 1);
    fuelDisplay.textContent = Math.round(frac * 100) + '%';
    fuelDisplay.className = frac < 0.15 ? 'critical' : frac < 0.35 ? 'warn' : '';
  }

  Gp._hudUpdate = function () {
    document.getElementById('clockDisplay')!.textContent = G.formatYears(state.ageYears);
    document.getElementById('distDisplay')!.textContent = state.distanceLy.toFixed(1) + ' 광년';
    massDisplay.textContent = massText();
    updateFuel();
    stageDisplay.textContent = G.Stage.coarseLabel(state);
    Gp._vitalsPanelUpdate(state);
  };
})();
