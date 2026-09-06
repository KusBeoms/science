"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    Gp._renderInitStars = function () {
        this.stars = [];
        const count = 260;
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.W, y: Math.random() * this.H * 0.85,
                r: 0.6 + Math.random() * 1.8,
                layer: 0.3 + Math.random() * 1.0,
                baseAlpha: 0.4 + Math.random() * 0.6,
            });
        }
    };
    Gp._renderStarBudget = function () {
        const step = Math.floor(G.state.distanceLy);
        return Math.max(1, 260 - step * 22);
    };
    Gp._renderBgDarkness = function () {
        return G.clamp(G.state.distanceLy / 12, 0, 1);
    };
})();
