"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._choiceCoreRadius = function (t, mass, special) {
        const r0 = 9;
        let r = r0;
        if (mass) {
            const dir = mass > 0 ? 1 : -1;
            const mag = Math.min(2, Math.abs(mass));
            const span = 5 + mag * 6;
            const cyc = (t * 0.85) % 1;
            r = dir > 0 ? r0 + cyc * span : r0 + span - cyc * span;
        }
        if (special === 'compress') {
            const cyc = (t * 1.3) % 1;
            const tri = cyc < 0.5 ? cyc * 2 : 2 - cyc * 2;
            r = r0 - 4 * tri;
        }
        else if (special === 'flare') {
            const cyc = (t * 0.75) % 1;
            r = cyc < 0.15 ? r0 + 22 * (cyc / 0.15) : Math.max(6, 31 - 22 * Math.min(1, (cyc - 0.15) / 0.35));
        }
        else if (special === 'fade') {
            const cyc = (t * 0.5) % 1;
            r = 13 - 7 * cyc;
        }
        return Math.max(3, r);
    };
    Gp._choiceDrawPulseFlash = function (ctx, cx, cy, t, mass) {
        if (!mass)
            return;
        const cyc = (t * 0.85) % 1;
        if (cyc > 0.08)
            return;
        const p = cyc / 0.08;
        const col = mass > 0 ? '150,200,255' : '255,160,120';
        ctx.strokeStyle = `rgba(${col},${(1 - p) * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 10 + p * 14, 0, Math.PI * 2);
        ctx.stroke();
    };
    Gp._choiceCoreColor = function (mass, special) {
        if (special === 'flare')
            return '#ffe6a8';
        if (special === 'fade' || special === 'compress')
            return '#ff9a6b';
        if (mass > 0)
            return '#ffe6a8';
        if (mass < 0)
            return '#ff9a6b';
        return '#bcd0ff';
    };
})();
