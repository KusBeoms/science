"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    function freshState() {
        return {
            started: false, gameOver: false, hasFusion: false, endingType: null,
            mass: 1 * G.EARTH_MASS, volume: 20, fuel: G.FUEL_MAX,
            ageYears: 0, maxFusionIndex: -1, forcedFusionIndex: -1, collapseRush: null, distanceLy: 0, postIgnitionDistanceLy: 0, accretionBoost: 1,
            companionOffered: Math.random() < G.COMPANION_ENCOUNTER_CHANCE,
            hasCompanion: false, companionTier: null, companionMass: 0, companionFuel: 0,
            companionAlive: false, staysBound: false, mergeFlag: false, collisionFlag: false,
            companionEventShown: false, crisisShown: false, collisionEventShown: false, lastBreathShown: false,
            lastEventId: null, usedOnce: new Set(),
            choiceLog: [],
            eventOpen: false, nextEventAt: 0.5,
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
        G.state.accretionBoost = preset.accretionBoost;
        if (G.state.mass >= G.IGNITION_MASS) {
            G.state.hasFusion = true;
            G.state.fuel = G.FUEL_MAX;
            G.state.maxFusionIndex = 0;
            const RT = G._runtime;
            if (RT)
                RT.ignitionAgeRampT = 1e9;
        }
    };
})();
