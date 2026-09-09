"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._runtime = {
        currentEvent: null,
        evTimeLeft: 0,
        evDuration: 4.5,
        choiceAnimRAF: null,
        choiceAnimStartT: 0,
        timeSkipping: false,
        ignitionAgeRampT: 0,
        introParticles: [],
        introT: 0,
        introPlaying: false,
        introDur: 2.2,
        introSpinDir: 1,
        introPanT: 0,
        endingPhase: 'idle',
        endingMoveT: 0,
        endingHoldT: 0,
        endingFadeT: 0,
        lastT: performance.now(),
    };
})();
