"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const A = G.Audio;
    const FIRST_STEP_DUR = 0.85;
    const STEP_SHRINK = 0.7;
    const MIN_STEP_DUR = 0.22;
    const FINAL_HOLD = 0.9;
    const vitalsPanel = document.getElementById('vitalsPanel');
    function stepDur(k) {
        return Math.max(MIN_STEP_DUR, FIRST_STEP_DUR * Math.pow(STEP_SHRINK, k));
    }
    function stageTick(k) {
        if (!A.actx)
            return;
        A.playTone(196 * Math.pow(1.19, k), 0.18, 'triangle', 0.12);
    }
    function endRush(state) {
        state.collapseRush = null;
        state.forcedFusionIndex = -1;
        vitalsPanel.classList.remove('collapsing');
    }
    Gp._stageRushUpdate = function (dt) {
        const state = G.state;
        const dead = state.fuel <= 0;
        const natural = dead ? G.Stage.fusionStageCount(state.mass) - 1 : Gp._stageFuelIndex(state);
        let rush = state.collapseRush;
        if (!rush) {
            const shown = Math.max(0, state.maxFusionIndex);
            const skipped = dead ? natural > shown : natural > shown + 1;
            if (!skipped) {
                if (!dead)
                    state.maxFusionIndex = Math.max(state.maxFusionIndex, natural);
                return dead;
            }
            rush = state.collapseRush = { index: shown, target: natural, t: 0, step: 0 };
            state.forcedFusionIndex = shown;
            vitalsPanel.classList.add('collapsing');
        }
        rush.target = Math.max(rush.target, natural);
        if (dead)
            state.fuel = 0;
        rush.t += dt;
        if (rush.index < rush.target) {
            if (rush.t >= stepDur(rush.step)) {
                rush.t = 0;
                rush.index++;
                rush.step++;
                state.forcedFusionIndex = rush.index;
                state.maxFusionIndex = Math.max(state.maxFusionIndex, rush.index);
                stageTick(rush.step);
            }
            return false;
        }
        if (!dead) {
            endRush(state);
            return false;
        }
        if (rush.t < FINAL_HOLD)
            return false;
        endRush(state);
        return true;
    };
    Gp._collapseRushReset = function () {
        vitalsPanel.classList.remove('collapsing');
    };
})();
