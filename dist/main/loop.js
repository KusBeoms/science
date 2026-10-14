"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const RT = Gp._runtime;
    const state = G.state;
    const clamp = G.clamp;
    const R = G.Render;
    const evTimerBar = document.getElementById('evTimerBar');
    const ENDING_MOVE_DUR = 1.0;
    const ENDING_HOLD_DUR = 1.6;
    const ENDING_FADE_DUR = 1.4;
    const IGNITION_RAMP_DUR = 4.0;
    function loop(now) {
        const dt = clamp((now - RT.lastT) / 1000, 0, 0.05);
        RT.lastT = now;
        requestAnimationFrame(loop);
        const ctx = R.ctx, W = R.W, H = R.H;
        let scroll = 0;
        if (RT.introPlaying)
            scroll = RT.introT >= RT.introDur ? 1 : 0;
        else if (state.started && !state.gameOver)
            scroll = 1;
        else if (!state.started)
            scroll = 0.15;
        const budget = RT.introPlaying ? R.stars.length : R.starBudget();
        R.drawBackground(dt, scroll, budget);
        if (RT.introPlaying) {
            Gp._introTick(dt);
        }
        else if (state.started && !state.gameOver) {
            R.starAngle += dt * (0.6 + state.mass / 30);
            R.drawPlayerStar(dt);
            if (state.hasCompanion && state.companionAlive)
                R.drawCompanionStar(dt);
            if (!state.eventOpen) {
                if (state.hasFusion)
                    state.postIgnitionDistanceLy += G.SPEED * dt;
                state.distanceLy += G.SPEED * dt;
            }
            if (state.collapseRush) {
            }
            else if (state.hasFusion) {
                RT.ignitionAgeRampT = Math.min(RT.ignitionAgeRampT + dt, IGNITION_RAMP_DUR);
                const t = clamp(RT.ignitionAgeRampT / IGNITION_RAMP_DUR, 0, 1);
                const eased = t * t * (3 - 2 * t);
                const stellar = G.yearsPerSecond(state.mass);
                const rate = Math.pow(G.FORMATION_YEARS_PER_SEC, 1 - eased) * Math.pow(stellar, eased);
                state.ageYears += dt * rate;
            }
            else {
                state.ageYears += dt * G.FORMATION_YEARS_PER_SEC;
            }
            if (!RT.timeSkipping && !state.eventOpen) {
                if (state.hasFusion)
                    state.fuel -= G.fuelBurnRate(state.mass) * dt;
                if (!state.hasFusion) {
                }
                else {
                    const lifeFrac = G.clamp((state.mass - G.WHITE_DWARF_MAX) / 72, 0, 0.5);
                    const windLoss = lifeFrac * state.mass * G.fuelBurnRate(state.mass) / G.FUEL_MAX;
                    state.mass = Math.max(0.05, state.mass - windLoss * dt);
                }
                Gp._companionUpdate(dt);
            }
            const naturalDeath = state.hasFusion && Gp._stageRushUpdate(dt);
            if (!state.hasFusion && state.mass >= G.IGNITION_MASS)
                Gp._triggerIgnition();
            if (state.collisionFlag)
                Gp._triggerEnding('collision');
            else if (state.mergeFlag)
                Gp._triggerEnding('merge');
            else if (naturalDeath)
                Gp._triggerEnding(G.Ending.naturalEndingKind());
            if (!state.eventOpen && !RT.timeSkipping && !state.gameOver && !state.collapseRush && state.distanceLy >= state.nextEventAt) {
                const e = G.pickEvent();
                if (e)
                    Gp._popupOpenEvent(e);
                else
                    state.nextEventAt = state.distanceLy + 0.3;
            }
            if (state.eventOpen) {
                RT.evTimeLeft -= dt;
                const frac = clamp(RT.evTimeLeft / RT.evDuration, 0, 1);
                evTimerBar.style.transform = 'scaleX(' + frac + ')';
                evTimerBar.style.background = frac < 0.3 ? '#ff6b6b' : (frac < 0.6 ? '#ffcf6b' : '#7fa0ff');
                if (RT.evTimeLeft <= 0)
                    Gp._popupResolveEvent(null);
            }
            Gp._hudUpdate(dt);
        }
        else if (state.gameOver) {
            if (RT.endingPhase === 'move') {
                RT.endingMoveT += dt;
                const p = clamp(RT.endingMoveT / ENDING_MOVE_DUR, 0, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                R.drawPlayerStar(dt, eased);
                if (p >= 1) {
                    RT.endingPhase = 'form';
                    R.setupEndingAnim(state.endingType);
                }
            }
            else if (RT.endingPhase === 'form') {
                R.endingAnimT += dt;
                R.drawEndingAnim();
                if (R.endingAnimT >= R.endingAnimDur) {
                    RT.endingPhase = 'hold';
                    RT.endingHoldT = 0;
                }
            }
            else if (RT.endingPhase === 'hold') {
                R.drawEndingAnim();
                RT.endingHoldT += dt;
                if (RT.endingHoldT >= ENDING_HOLD_DUR) {
                    RT.endingPhase = 'fadeOut';
                    RT.endingFadeT = 0;
                }
            }
            else if (RT.endingPhase === 'fadeOut') {
                R.drawEndingAnim();
                RT.endingFadeT += dt;
                const fp = clamp(RT.endingFadeT / ENDING_FADE_DUR, 0, 1);
                ctx.fillStyle = `rgba(0,0,0,${fp})`;
                ctx.fillRect(0, 0, W, H);
                if (fp >= 1) {
                    RT.endingPhase = 'done';
                    G.Ending.buildCredits();
                }
            }
        }
    }
    Gp._mainLoop = loop;
})();
