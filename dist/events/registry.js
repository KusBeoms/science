"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    G.EVENTS = [].concat(Gp._EARLY_EVENTS || [], Gp._MID_EVENTS || [], Gp._LATE_EVENTS || []);
    G.pickEvent = function () {
        const state = G.state;
        const pool = [];
        for (const e of G.EVENTS) {
            if (e.once && state.usedOnce.has(e.id))
                continue;
            if (!e.once && e.id === state.lastEventId)
                continue;
            if (!e.condition(state))
                continue;
            pool.push(e);
            if (e.once) {
                for (let k = 0; k < 4; k++)
                    pool.push(e);
            }
        }
        if (pool.length === 0)
            return null;
        return pool[Math.floor(Math.random() * pool.length)];
    };
})();
