"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const state = G.state;
    const massDisplay = document.getElementById('massDisplay');
    const stageDisplay = document.getElementById('stageDisplay');
    const EARTH_MASSES_PER_SOLAR = 1 / G.EARTH_MASS;
    const JUPITER_MASSES_PER_SOLAR = 1047.35;
    function massText() {
        if (state.hasFusion)
            return '~' + state.mass.toFixed(2) + ' × 태양';
        if (state.mass < G.GAS_GIANT_MIN_MASS)
            return '~' + (state.mass * EARTH_MASSES_PER_SOLAR).toFixed(2) + ' × 지구';
        return '~' + (state.mass * JUPITER_MASSES_PER_SOLAR).toFixed(2) + ' × 목성';
    }
    Gp._hudResetGauge = function () { };
    const fuelDisplay = document.getElementById('fuelDisplay');
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
        document.getElementById('clockDisplay').textContent = G.formatYears(state.ageYears);
        document.getElementById('distDisplay').textContent = state.distanceLy.toFixed(1) + ' 광년';
        massDisplay.textContent = massText();
        updateFuel();
        stageDisplay.textContent = G.Stage.coarseLabel(state);
        Gp._vitalsPanelUpdate(state);
    };
})();
