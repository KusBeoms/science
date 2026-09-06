"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._endingNaturalType = function () {
        const state = G.state;
        if (state.hasCompanion && state.companionAlive && state.mass < 50)
            return 'friends';
        if (state.hasCompanion && !state.companionAlive && state.staysBound)
            return 'spider';
        if (state.mass >= 80)
            return 'blackhole';
        if (state.mass >= 50)
            return 'supernova';
        return 'whitedwarf';
    };
})();
