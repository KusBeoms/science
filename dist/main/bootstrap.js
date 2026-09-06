"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    G.Render.initStars();
    requestAnimationFrame(Gp._mainLoop);
})();
