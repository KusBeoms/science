"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const REFERENCE_AREA = 1280 * 720 * 0.85;
    const STAR_DENSITY = 260 / REFERENCE_AREA;
    function starCountFor(W, H) {
        return Math.max(20, Math.round(STAR_DENSITY * W * H * 0.85));
    }
    function makeStar(W, H) {
        return {
            x: Math.random() * W, y: Math.random() * H * 0.85,
            r: 0.6 + Math.random() * 1.8,
            layer: 0.3 + Math.random() * 1.0,
            baseAlpha: 0.4 + Math.random() * 0.6,
        };
    }
    Gp._renderInitStars = function () {
        this.stars = [];
        const count = starCountFor(this.W, this.H);
        for (let i = 0; i < count; i++)
            this.stars.push(makeStar(this.W, this.H));
    };
    Gp._renderResyncStars = function (oldW, oldH) {
        if (oldW > 0 && oldH > 0) {
            for (const s of this.stars) {
                s.x = s.x / oldW * this.W;
                s.y = s.y / oldH * this.H;
            }
        }
        const target = starCountFor(this.W, this.H);
        if (this.stars.length < target) {
            for (let i = this.stars.length; i < target; i++)
                this.stars.push(makeStar(this.W, this.H));
        }
        else if (this.stars.length > target) {
            this.stars.length = target;
        }
    };
    Gp._renderStarBudget = function () {
        const step = Math.floor(G.state.distanceLy);
        const frac = G.clamp(1 - step * 22 / 260, 0, 1);
        return Math.max(1, Math.round(this.stars.length * frac));
    };
    Gp._renderBgDarkness = function () {
        return G.clamp(G.state.distanceLy / 12, 0, 1);
    };
})();
