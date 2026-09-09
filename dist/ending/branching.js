"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const CARBON_INDEX = 2;
    Gp._endingNaturalType = function () {
        const state = G.state;
        const burned = state.maxFusionIndex;
        const coreCollapses = burned >= CARBON_INDEX;
        if (!coreCollapses) {
            if (state.hasCompanion && state.companionAlive)
                return 'friends';
            if (state.hasCompanion && !state.companionAlive && state.staysBound)
                return 'spider';
            return 'whitedwarf';
        }
        if (state.hasCompanion && !state.companionAlive && state.staysBound)
            return 'spider';
        if (state.mass >= G.BLACK_HOLE_MIN)
            return 'blackhole';
        return 'supernova';
    };
})();
