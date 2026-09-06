"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const RT = Gp._runtime;
    const state = G.state;
    const clamp = G.clamp;
    const A = G.Audio;
    Gp._companionUpdate = function (dt) {
        if (!state.hasCompanion || !state.companionAlive || state.gameOver)
            return;
        const burn = state.companionTier === 'low' ? 0.01 : G.fuelBurnRate(state.companionMass);
        state.companionFuel -= burn * dt;
        if (state.companionFuel <= 0) {
            state.companionAlive = false;
            if (state.companionTier === 'high') {
                if (state.staysBound) {
                    state.mergeFlag = true;
                }
            }
            else if (state.companionTier === 'mid') {
                if (state.staysBound) {
                    Gp._companionPlayTimeSkip();
                }
            }
        }
    };
    Gp._companionPlayTimeSkip = function () {
        RT.timeSkipping = true;
        const el = document.getElementById('timeskip');
        const od = document.getElementById('odometer');
        el.classList.add('show');
        A.playSweep(300, 60, 2.4);
        const target = 100000000;
        const dur = 2400;
        const t0 = performance.now();
        function step(now) {
            const p = clamp((now - t0) / dur, 0, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = Math.floor(eased * target);
            od.textContent = val.toLocaleString('ko-KR') + '년';
            if (p < 1)
                requestAnimationFrame(step);
            else {
                state.ageYears += target;
                setTimeout(() => { el.classList.remove('show'); RT.timeSkipping = false; }, 400);
            }
        }
        requestAnimationFrame(step);
    };
})();
