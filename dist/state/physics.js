"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    G.clamp = function (v, a, b) {
        return Math.max(a, Math.min(b, v));
    };
    G.fuelBurnRate = function (m) {
        return 7.4 * Math.pow(G.clamp(m, 0.5, 90), 0.1);
    };
    const LOW_MASS_PIVOT = 0.5;
    function mainSequenceLifetimeYears(mm) {
        if (mm >= LOW_MASS_PIVOT)
            return 1e10 * Math.pow(mm, -2.5);
        const atPivot = 1e10 * Math.pow(LOW_MASS_PIVOT, -2.5);
        return atPivot * Math.pow(mm / LOW_MASS_PIVOT, -3.1);
    }
    G.yearsPerSecond = function (m) {
        const mm = G.clamp(m, 0.08, 100) / G.MASS_REF;
        const lifetimeYears = mainSequenceLifetimeYears(mm);
        const gameSeconds = G.FUEL_MAX / G.fuelBurnRate(mm);
        return lifetimeYears / gameSeconds;
    };
    G.formatYears = function (y) {
        const abs = Math.abs(y);
        const unit = (v, suffix) => (v < 100 ? v.toFixed(1) : Math.round(v).toLocaleString('ko-KR')) + suffix;
        if (abs < 1e4)
            return Math.floor(y).toLocaleString('ko-KR') + '년';
        if (abs < 1e8)
            return unit(y / 1e4, '만 년');
        if (abs < 1e12)
            return unit(y / 1e8, '억 년');
        return unit(y / 1e12, '조 년');
    };
})();
