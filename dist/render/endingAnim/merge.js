"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._endingAnims = Gp._endingAnims || {};
    const clamp = G.clamp;
    const mod = {
        duration: 3.4,
        sound: (A) => A.playSweep(300, 30, 3.0),
        draw: (ctx, R, p) => {
            const cx = R.W * 0.5, cy = R.H * 0.5;
            const holeX = cx + 180;
            ctx.fillStyle = 'rgba(0,0,0,.9)';
            ctx.beginPath();
            ctx.arc(holeX, cy, 26, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(160,180,255,.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(holeX, cy, 34, 0, Math.PI * 2);
            ctx.stroke();
            const sx = cx - 220 + p * (220 + 180 - 30);
            const stretch = 1 + p * 5;
            ctx.save();
            ctx.translate(sx, cy);
            ctx.scale(stretch, 1 / Math.sqrt(stretch));
            ctx.fillStyle = 'rgba(220,225,255,' + clamp(1 - p * 0.6, 0, 1) + ')';
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        },
    };
    Gp._endingAnims.merge = mod;
})();
