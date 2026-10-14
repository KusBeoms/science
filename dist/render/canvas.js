"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const canvas = document.getElementById('scene');
    const ctx = canvas.getContext('2d');
    Gp._renderCanvas = canvas;
    Gp._renderCtx = ctx;
    Gp._renderResize = function () {
        const oldW = this.W, oldH = this.H;
        const dpr = window.devicePixelRatio || 1;
        this.W = window.innerWidth;
        this.H = window.innerHeight;
        canvas.width = Math.round(this.W * dpr);
        canvas.height = Math.round(this.H * dpr);
        canvas.style.width = this.W + 'px';
        canvas.style.height = this.H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        Gp._renderViewScale = G.clamp(Math.min(this.W, this.H) / 720, 0.85, 1.6);
        Gp._renderResyncStars.call(this, oldW, oldH);
    };
})();
