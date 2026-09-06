"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const SPECIAL_GLYPH = {
        bond: '⚭', pass: '↗', stayBound: '⇌', drift: '↔', collide: '💥',
        swerve: '↩', impact: '▤', compress: '»', flare: '✺', fade: '○',
    };
    Gp._choiceBadgesFor = function (vis) {
        vis = vis || {};
        const badges = [];
        if (vis.mass)
            badges.push({ glyph: '●', dir: vis.mass > 0 ? 1 : -1 });
        if (vis.volume)
            badges.push({ glyph: '◯', dir: vis.volume > 0 ? 1 : -1 });
        if (vis.fuel)
            badges.push({ glyph: '⚡', dir: vis.fuel > 0 ? 1 : -1 });
        if (vis.special)
            badges.push({ glyph: SPECIAL_GLYPH[vis.special] || '?', dir: 0 });
        return badges;
    };
})();
