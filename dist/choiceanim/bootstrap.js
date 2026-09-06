"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const ChoiceAnim = {
        badgesFor(vis) { return Gp._choiceBadgesFor(vis); },
        draw(ctx, w, h, t, vis) {
            vis = vis || {};
            ctx.clearRect(0, 0, w, h);
            const cx = w / 2, cy = h / 2 + 4;
            Gp._choiceDrawVolumeRings(ctx, cx, cy, t, vis.volume);
            Gp._choiceDrawFuelSparks(ctx, cx, cy, t, vis.fuel);
            if (vis.special)
                Gp._choiceDrawSpecial(ctx, cx, cy, w, h, t, vis.special);
            if (Gp._choiceTwoBodySpecials.indexOf(vis.special) === -1) {
                Gp._choiceDrawPulseFlash(ctx, cx, cy, t, vis.mass || 0);
                const r = Gp._choiceCoreRadius(t, vis.mass || 0, vis.special);
                const col = Gp._choiceCoreColor(vis.mass || 0, vis.special);
                ctx.fillStyle = col;
                ctx.shadowColor = col;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        },
    };
    G.ChoiceAnim = ChoiceAnim;
})();
