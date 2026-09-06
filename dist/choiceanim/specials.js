"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    function drawDot(ctx, x, y, r, color, alpha) {
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    Gp._choiceTwoBodySpecials = ['bond', 'pass', 'stayBound', 'drift', 'collide', 'swerve'];
    Gp._choiceDrawSpecial = function (ctx, cx, cy, w, h, t, kind) {
        const edge = w / 2 - 10;
        if (kind === 'bond') {
            const cyc = (t * 0.4) % 1;
            let ang, rad;
            if (cyc < 0.7) {
                ang = cyc * 16;
                rad = 32 - (cyc / 0.7) * 17;
            }
            else {
                ang = t * 3;
                rad = 15;
            }
            const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad * 0.55;
            drawDot(ctx, x, y, 2.6, '#cdeaff');
        }
        else if (kind === 'pass') {
            const cyc = (t * 0.45) % 1;
            const x = -8 + cyc * (w + 16), y = cy - 16;
            const alpha = Math.sin(cyc * Math.PI);
            drawDot(ctx, x, y, 2.4, '#cdeaff', Math.max(0.15, alpha));
        }
        else if (kind === 'stayBound') {
            const ang = t * 3.2, r = 11;
            drawDot(ctx, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.55, 2.4, '#cdeaff');
            drawDot(ctx, cx + Math.cos(ang + Math.PI) * r, cy + Math.sin(ang + Math.PI) * r * 0.55, 2.4, '#ffd9a8');
        }
        else if (kind === 'drift') {
            const cyc = (t * 0.4) % 1;
            const dist = cyc * edge;
            const alpha = 1 - cyc * 0.7;
            drawDot(ctx, cx - dist, cy, 2.4, '#cdeaff', alpha);
            drawDot(ctx, cx + dist, cy, 2.4, '#ffd9a8', alpha);
        }
        else if (kind === 'collide') {
            const cyc = (t * 0.55) % 1;
            if (cyc < 0.72) {
                const p = cyc / 0.72;
                drawDot(ctx, cx - (1 - p) * edge, cy, 2.6, '#cdeaff');
                drawDot(ctx, cx + (1 - p) * edge, cy, 2.6, '#ffd9a8');
            }
            else {
                const p = (cyc - 0.72) / 0.28;
                ctx.strokeStyle = `rgba(255,220,170,${1 - p})`;
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.arc(cx, cy, 4 + p * 24, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        else if (kind === 'swerve') {
            const cyc = (t * 0.45) % 1;
            let x, y;
            if (cyc < 0.6) {
                const p = cyc / 0.6;
                x = cx - 38 + p * 38;
                y = cy;
            }
            else {
                const p = (cyc - 0.6) / 0.4;
                x = cx + p * 12;
                y = cy - p * 20;
            }
            drawDot(ctx, x, y, 2.6, '#cdeaff');
        }
        else if (kind === 'impact') {
            for (let i = 0; i < 3; i++) {
                const ang = t * 1.8 + i * 2.1, rad = 18 + Math.sin(t * 3.4 + i) * 5;
                const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad * 0.55;
                ctx.fillStyle = 'rgba(210,200,255,.9)';
                ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
            }
        }
    };
})();
