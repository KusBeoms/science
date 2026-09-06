"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._endingAnims = Gp._endingAnims || {};
    const mod = {
        duration: 3.4,
        sound: (A) => { A.playTone(523, 1.6, 'sine', 0.15); A.playTone(659, 1.6, 'sine', 0.12, 0.3); },
        draw: (ctx, R, p) => {
            const cx = R.W * 0.5, cy = R.H * 0.5;
            const tw = 0.6 + 0.4 * Math.sin(p * Math.PI * 6);
            [-70, 70].forEach((off) => {
                ctx.fillStyle = 'rgba(255,255,255,' + tw + ')';
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 25;
                ctx.beginPath();
                ctx.arc(cx + off, cy, 18, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });
        },
    };
    Gp._endingAnims.friends = mod;
})();
