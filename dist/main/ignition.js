"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const A = G.Audio;
    Gp._triggerIgnition = function () {
        const state = G.state;
        if (state.hasFusion)
            return;
        state.hasFusion = true;
        Gp._runtime.ignitionAgeRampT = 0;
        state.fuel = G.FUEL_MAX;
        Gp._hudResetGauge();
        Gp._ignitionBlend = { v: 0 };
        gsap.to(Gp._ignitionBlend, { v: 1, duration: 1.2, ease: 'power2.out' });
        A.playSweep(90, 520, 1.2);
        A.playTone(660, 0.5, 'sine', 0.18, 0.15);
    };
})();
