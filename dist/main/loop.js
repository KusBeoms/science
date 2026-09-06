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
            R.starAngle += dt * (0.6 + state.mass / 120);
            R.drawPlayerStar(dt);
            if (state.hasCompanion && state.companionAlive)
                R.drawCompanionStar(dt);
            state.ageYears += dt * G.yearsPerSecond(state.mass);
            state.distanceLy += G.SPEED * dt;
            if (!RT.timeSkipping) {
                state.fuel -= G.fuelBurnRate(state.mass) * dt;
                state.mass += state.volume * 0.0009 * dt * 60;
                Gp._companionUpdate(dt);
            }
            if (state.collisionFlag)
                Gp._triggerEnding('collision');
            else if (state.mergeFlag)
                Gp._triggerEnding('merge');
            else if (state.fuel <= 0)
                Gp._triggerEnding(G.Ending.naturalEndingKind());
            if (!state.eventOpen && !RT.timeSkipping && !state.gameOver && state.ageYears >= state.nextEventAt) {
                const e = G.pickEvent();
                if (e)
                    Gp._popupOpenEvent(e);
                else
                    state.nextEventAt = state.ageYears + 3;
            }
            if (state.eventOpen) {
                RT.evTimeLeft -= dt;
                const frac = clamp(RT.evTimeLeft / RT.evDuration, 0, 1);
                evTimerBar.style.transform = 'scaleX(' + frac + ')';
                evTimerBar.style.background = frac < 0.3 ? '#ff6b6b' : (frac < 0.6 ? '#ffcf6b' : '#7fa0ff');
                if (RT.evTimeLeft <= 0)
                    Gp._popupResolveEvent(null);
            }
            Gp._hudUpdate();
        }
        else if (state.gameOver) {
            R.drawPlayerStar(dt);
            R.endingAnimT += dt;
            R.drawEndingAnim();
            if (R.endingAnimT >= R.endingAnimDur && document.getElementById('credits').classList.contains('show') === false) {
                G.Ending.buildCredits();
            }
        }
    }
    Gp._mainLoop = loop;
})();
