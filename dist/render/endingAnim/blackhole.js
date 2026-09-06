"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._endingAnims = Gp._endingAnims || {};
    const mod = {
        duration: 3.6,
        sound: (A) => A.playSweep(500, 40, 3.2),
        draw: (ctx, R, p) => {
            const cx = R.W * 0.5, cy = R.H * 0.5;
            const shrink = 1 - p;
            for (const pt of R.endingParticles) {
                const dist = (1 - p) * (200 + pt.speed);
                const x = cx + Math.cos(pt.a + p * 8) * dist, y = cy + Math.sin(pt.a + p * 8) * dist;
                ctx.fillStyle = 'rgba(180,190,255,' + (0.6 * (1 - p)) + ')';
                ctx.beginPath();
                ctx.arc(x, y, pt.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(cx, cy, 40 * shrink, 0, Math.PI * 2);
            ctx.fill();
        },
    };
    Gp._endingAnims.blackhole = mod;
})();
