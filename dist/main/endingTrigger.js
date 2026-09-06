"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const state = G.state;
    Gp._triggerEnding = function (type) {
        if (state.gameOver)
            return;
        state.gameOver = true;
        state.endingType = type;
        if (state.eventOpen)
            Gp._popupCloseEvent();
        G.Audio.stopMusic();
        document.getElementById('lifeGaugeFill').classList.remove('danger');
        G.Render.setupEndingAnim(type);
    };
})();
