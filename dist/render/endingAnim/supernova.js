"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._endingAnims = Gp._endingAnims || {};
    const clamp = G.clamp;
    const mod = {
        duration: 3.0,
        sound: (A) => { A.playNoiseBurst(1.2, 0.5); A.playTone(120, 1.5, 'sawtooth', 0.25); },
        draw: (ctx, R, p) => {
            const cx = R.W * 0.5, cy = R.H * 0.5;
            for (let i = 0; i < 3; i++) {
                const rr = p * 400 - i * 40;
                if (rr < 0)
                    continue;
                ctx.strokeStyle = 'rgba(255,220,160,' + clamp(0.8 - p, 0, 0.8) + ')';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(cx, cy, rr, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(255,255,255,' + clamp(1 - p * 1.6, 0, 1) + ')';
            ctx.beginPath();
            ctx.arc(cx, cy, 60 * (1 - p * 0.5), 0, Math.PI * 2);
            ctx.fill();
        },
    };
    Gp._endingAnims.supernova = mod;
})();
