"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._endingAnims = Gp._endingAnims || {};
    const clamp = G.clamp;
    const mod = {
        duration: 3.0,
        sound: (A) => { A.playNoiseBurst(0.8, 0.45); setTimeout(() => A.playNoiseBurst(0.8, 0.4), 250); },
        draw: (ctx, R, p) => {
            const cx = R.W * 0.5, cy = R.H * 0.5;
            const gap = (1 - p) * 160;
            ctx.fillStyle = 'rgba(255,200,140,.9)';
            ctx.beginPath();
            ctx.arc(cx - gap, cy, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + gap, cy, 14, 0, Math.PI * 2);
            ctx.fill();
            if (p > 0.45) {
                const fp = (p - 0.45) / 0.55;
                ctx.fillStyle = 'rgba(255,240,200,' + clamp(1 - fp, 0, 1) + ')';
                ctx.beginPath();
                ctx.arc(cx, cy, fp * 160, 0, Math.PI * 2);
                ctx.fill();
            }
        },
    };
    Gp._endingAnims.collision = mod;
})();
