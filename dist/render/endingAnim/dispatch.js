"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._endingAnims = Gp._endingAnims || {};
    Gp._renderSetupEndingAnim = function (type) {
        this.endingAnimT = 0;
        this.endingParticles = [];
        const n = 90;
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            this.endingParticles.push({ a, speed: 20 + Math.random() * 80, r: 1 + Math.random() * 2.5, life: 1 });
        }
        const mod = Gp._endingAnims[type];
        this.endingAnimDur = mod ? mod.duration : 3.2;
        Gp._renderPlayEndingSound.call(this, type);
    };
    Gp._renderPlayEndingSound = function (type) {
        const A = G.Audio;
        if (!A.actx)
            return;
        const mod = Gp._endingAnims[type];
        if (mod)
            mod.sound(A);
    };
    Gp._renderDrawEndingAnim = function () {
        const p = G.clamp(this.endingAnimT / this.endingAnimDur, 0, 1);
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(2,3,10,0.25)';
        ctx.fillRect(0, 0, this.W, this.H);
        const type = G.state.endingType;
        if (!type)
            return;
        const mod = Gp._endingAnims[type];
        if (mod)
            mod.draw(ctx, this, p);
    };
})();
