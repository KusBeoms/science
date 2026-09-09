"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const SPECIAL_GLYPH = {
        bond: '⚭', pass: '↗', stayBound: '⇌', drift: '↔', collide: '💥',
        swerve: '↩', impact: '▤', compress: '»', flare: '✺', fade: '○',
    };
    const SPECIAL_NAME = {
        bond: '결속', pass: '스침', stayBound: '근접', drift: '거리', collide: '충돌',
        swerve: '회피', impact: '충격', compress: '압축', flare: '발화', fade: '소멸',
    };
    Gp._choiceBadgesFor = function (vis) {
        vis = vis || {};
        const badges = [];
        if (vis.mass)
            badges.push({ glyph: '●', dir: vis.mass > 0 ? 1 : -1, name: '질량' });
        if (vis.volume)
            badges.push({ glyph: '◯', dir: vis.volume > 0 ? 1 : -1, name: '부피' });
        if (vis.fuel)
            badges.push({ glyph: '⚡', dir: vis.fuel > 0 ? 1 : -1, name: '연료' });
        if (vis.special)
            badges.push({ glyph: SPECIAL_GLYPH[vis.special] || '?', dir: 0, name: SPECIAL_NAME[vis.special] || '' });
        return badges;
    };
})();
