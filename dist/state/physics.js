"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    G.clamp = function (v, a, b) {
        return Math.max(a, Math.min(b, v));
    };
    G.fuelBurnRate = function (m) {
        return G.BASE_BURN * (1 + m / 100);
    };
    G.yearsPerSecond = function (m) {
        const ratio = Math.pow(G.clamp(m, 6, 160) / G.MASS_REF, 2.5);
        return G.clamp(ratio, 0.2, 8);
    };
})();
