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
        this.W = canvas.width = window.innerWidth;
        this.H = canvas.height = window.innerHeight;
    };
})();
