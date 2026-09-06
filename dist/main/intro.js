"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const RT = Gp._runtime;
    const state = G.state;
    const clamp = G.clamp;
    const A = G.Audio;
    const R = G.Render;
    function lerp(a, b, t) { return a + (b - a) * t; }
    const startOverlay = document.getElementById('startOverlay');
    Gp._introBeginGame = function (presetId) {
        G.applyPreset(presetId || 'standard');
        A.init();
        A.playMusic('ingame');
        startOverlay.style.display = 'none';
        RT.introParticles = [];
        const n = 140;
        const finalR = 14 + clamp(state.volume, 6, 160) * 0.55;
        RT.introSpinDir = Math.random() < 0.5 ? -1 : 1;
        for (let i = 0; i < n; i++) {
            const a0 = Math.random() * Math.PI * 2;
            const r0 = finalR + 90 + Math.random() * 260;
            RT.introParticles.push({ a: a0, r0, size: 1 + Math.random() * 1.4, delay: Math.random() * 0.25 });
        }
        RT.introT = 0;
        RT.introPlaying = true;
    };
    document.querySelectorAll('#presetRow .presetCard').forEach((card) => {
        card.addEventListener('click', () => Gp._introBeginGame(card.dataset.preset));
    });
    Gp._introTick = function (dt) {
        const ctx = R.ctx, W = R.W, H = R.H;
        RT.introT += dt;
        const p = clamp(RT.introT / RT.introDur, 0, 1);
        const cx = W * 0.28, cy = H * 0.55;
        const finalR = 14 + clamp(state.volume, 6, 160) * 0.55;
        for (const pt of RT.introParticles) {
            const lp = clamp((p - pt.delay) / (1 - pt.delay), 0, 1);
            const ease = lp * lp * lp;
            const r = lerp(pt.r0, finalR * 0.25, ease);
            pt.a += RT.introSpinDir * dt * (0.35 + 5 / (r * r * 0.01 + 1));
            const x = cx + Math.cos(pt.a) * r, y = cy + Math.sin(pt.a) * r * 0.72;
            const heat = clamp(ease * 1.3, 0, 1);
            const cr = Math.round(130 + (255 - 130) * heat), cg = Math.round(145 + (235 - 145) * heat), cb = Math.round(190 + (200 - 190) * heat);
            const alpha = 0.22 + 0.65 * heat;
            const trailA = pt.a - RT.introSpinDir * heat * 0.16;
            const txp = cx + Math.cos(trailA) * r, typ = cy + Math.sin(trailA) * r * 0.72;
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha * 0.55})`;
            ctx.lineWidth = pt.size * 0.8;
            ctx.beginPath();
            ctx.moveTo(txp, typ);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, pt.size, 0, Math.PI * 2);
            ctx.fill();
        }
        const coreGrow = clamp((p - 0.15) / 0.85, 0, 1);
        if (coreGrow > 0) {
            const col = R.massColor(state.mass);
            ctx.globalAlpha = 0.85 * coreGrow;
            ctx.fillStyle = col;
            ctx.shadowColor = col;
            ctx.shadowBlur = 10 + 25 * coreGrow;
            ctx.beginPath();
            ctx.arc(cx, cy, finalR * coreGrow, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
        if (p > 0.9) {
            const fp = clamp((p - 0.9) / 0.1, 0, 1);
            ctx.strokeStyle = `rgba(255,255,255,${(1 - fp) * 0.8})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, finalR * (1 + fp * 2.2), 0, Math.PI * 2);
            ctx.stroke();
        }
        if (p >= 1) {
            R.drawPlayerStar(dt);
        }
        if (p >= 1 && RT.introT > RT.introDur + 0.3) {
            RT.introPlaying = false;
            state.started = true;
            state.nextEventAt = state.ageYears + 5;
        }
    };
})();
