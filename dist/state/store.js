"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    function freshState() {
        return {
            started: false, gameOver: false, endingType: null,
            mass: 20, volume: 20, fuel: G.FUEL_MAX,
            ageYears: 0, distanceLy: 0,
            hasCompanion: false, companionTier: null, companionMass: 0, companionFuel: 0,
            companionAlive: false, staysBound: false, mergeFlag: false, collisionFlag: false,
            companionEventShown: false, crisisShown: false, collisionEventShown: false, lastBreathShown: false,
            lastEventId: null, usedOnce: new Set(),
            choiceLog: [],
            eventOpen: false, nextEventAt: 6,
            phaseStarBudget: 220,
        };
    }
    G.state = freshState();
    G.resetState = function () {
        Object.assign(G.state, freshState());
    };
    G.applyPreset = function (id) {
        const preset = G.NEBULA_PRESETS.find((p) => p.id === id);
        if (!preset)
            return;
        G.state.mass = preset.mass;
        G.state.volume = preset.volume;
    };
})();
