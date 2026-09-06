"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    G.SPEED = 0.1;
    G.FUEL_MAX = 750;
    G.BASE_BURN = 6;
    G.MASS_REF = 20;
    G.NEBULA_PRESETS = [
        { id: 'dense', name: '고밀도 성운', desc: '무겁고 짧게 타오른다', mass: 34, volume: 14 },
        { id: 'standard', name: '표준 성운', desc: '균형 잡힌 시작', mass: 20, volume: 20 },
        { id: 'diffuse', name: '희박한 성운', desc: '가볍고 오래 살아남는다', mass: 12, volume: 32 },
    ];
})();
