"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const RT = Gp._runtime;
    const state = G.state;
    const clamp = G.clamp;
    const R = G.Render;
    function lerp(a, b, t) { return a + (b - a) * t; }
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
        const dark = R.bgDarkness();
        const bgCol = `rgba(${lerp(6, 2, dark)},${lerp(9, 3, dark)},${lerp(24, 8, dark)},1)`;
        ctx.fillStyle = bgCol;
        ctx.fillRect(0, 0, W, H);
        const budget = RT.introPlaying ? R.stars.length : R.starBudget();
        for (let i = 0; i < R.stars.length; i++) {
            if (i >= budget)
                continue;
            const s = R.stars[i];
            if (!RT.introPlaying && state.started && !state.gameOver) {
                s.x -= G.SPEED * 260 * s.layer * dt;
                if (s.x < -5) {
                    s.x = W + 5;
                    s.y = Math.random() * H * 0.85;
                }
            }
            ctx.globalAlpha = s.baseAlpha * (1 - dark * 0.85);
            ctx.fillStyle = '#dfe8ff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(140,160,255,' + (0.15 * (1 - dark * 0.7)) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H * 0.72);
        ctx.lineTo(W, H * 0.72);
        ctx.stroke();
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
            if (state.hasFusion) {
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
            if (state.hasFusion) {
                state.maxFusionIndex = Math.max(state.maxFusionIndex, G.Stage.fusionStageIndex(state));
            }
            if (!state.hasFusion && state.mass >= G.IGNITION_MASS)
                Gp._triggerIgnition();
            if (state.collisionFlag)
                Gp._triggerEnding('collision');
            else if (state.mergeFlag)
                Gp._triggerEnding('merge');
            else if (state.hasFusion && state.fuel <= 0)
                Gp._triggerEnding(G.Ending.naturalEndingKind());
            if (!state.eventOpen && !RT.timeSkipping && !state.gameOver && state.distanceLy >= state.nextEventAt) {
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
