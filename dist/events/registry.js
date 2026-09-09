"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    G.EVENTS = [].concat(Gp._EARLY_EVENTS || [], Gp._MID_EVENTS || [], Gp._LATE_EVENTS || []);
    G.pickEvent = function () {
        const state = G.state;
        const eligible = [];
        for (const e of G.EVENTS) {
            if (e.once && state.usedOnce.has(e.id))
                continue;
            if (!e.once && e.id === state.lastEventId)
                continue;
            if (!e.condition(state))
                continue;
            eligible.push(e);
        }
        if (eligible.length === 0)
            return null;
        const chanced = eligible.filter((e) => typeof e.chance === 'number');
        const plain = eligible.filter((e) => typeof e.chance !== 'number');
        for (const e of chanced) {
            if (Math.random() < e.chance)
                return e;
        }
        if (plain.length === 0)
            return null;
        const pool = [];
        for (const e of plain) {
            pool.push(e);
            if (e.once)
                pool.push(e);
        }
        return pool[Math.floor(Math.random() * pool.length)];
    };
})();
