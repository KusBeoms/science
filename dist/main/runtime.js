"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._runtime = {
        currentEvent: null,
        evTimeLeft: 0,
        evDuration: 4,
        choiceAnimRAF: null,
        choiceAnimStartT: 0,
        timeSkipping: false,
        introParticles: [],
        introT: 0,
        introPlaying: false,
        introDur: 2.2,
        introSpinDir: 1,
        lastT: performance.now(),
    };
})();
