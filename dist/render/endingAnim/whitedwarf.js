"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._endingAnims = Gp._endingAnims || {};
    const mod = {
        duration: 3.2,
        sound: (A) => A.playSweep(400, 180, 2.6),
        draw: (ctx, R, p) => {
            const cx = R.W * 0.5, cy = R.H * 0.5;
            const r = 60 * (1 - p * 0.85);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 40 * (1 - p);
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(4, r), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        },
    };
    Gp._endingAnims.whitedwarf = mod;
})();
