"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._endingAnims = Gp._endingAnims || {};
    const clamp = G.clamp;
    const mod = {
        duration: 3.6,
        sound: (A) => { for (let i = 0; i < 6; i++)
            setTimeout(() => A.playTone(880, 0.08, 'square', 0.12), i * 350); },
        draw: (ctx, R, p) => {
            const cx = R.W * 0.5, cy = R.H * 0.5;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(p * 10);
            ctx.strokeStyle = 'rgba(160,220,255,.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-260, 0);
            ctx.lineTo(260, 0);
            ctx.stroke();
            ctx.restore();
            const r = 22 * (1 - p * 0.5);
            ctx.fillStyle = 'rgba(255,210,180,' + clamp(1 - p * 0.7, 0.15, 1) + ')';
            ctx.beginPath();
            ctx.ellipse(cx, cy, r * (1 + p * 0.6), r * (1 - p * 0.4), 0, 0, Math.PI * 2);
            ctx.fill();
        },
    };
    Gp._endingAnims.spider = mod;
})();
