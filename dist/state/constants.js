"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    G.SPEED = 0.1;
    G.FUEL_MAX = 750;
    G.BASE_BURN = 6;
    G.MASS_REF = 1;
    G.EARTH_MASS = 1 / 332946;
    G.GAS_GIANT_MIN_MASS = 6 * G.EARTH_MASS;
    G.IGNITION_MASS = 0.08;
    G.WHITE_DWARF_MAX = 8;
    G.BLACK_HOLE_MIN = 20;
    G.HELIUM_IGNITION_MIN = 0.5;
    G.CARBON_IGNITION_MIN = 8;
    G.IRON_CORE_MIN = 11;
    G.FORMATION_YEARS_PER_SEC = 150000;
    G.STAR_REST_X_FRACTION = 0.28;
    G.PROTO_BODY_SCALE = 0.8;
    G.ACCRETION_DAMP_MASS = 8;
    G.COMPANION_ENCOUNTER_CHANCE = 0.05;
    G.JUPITER_MASS = 1 / 1047.35;
    G.NEBULA_PRESETS = [
        { id: 'dense', name: '고밀도 성운', desc: '태양과 같은 항성으로 태어난다', mass: 1, volume: 46, accretionBoost: 1.6 },
        { id: 'standard', name: '표준 성운', desc: '목성형 행성에서 시작한다', mass: 1 * G.JUPITER_MASS, volume: 30, accretionBoost: 1.0 },
        { id: 'diffuse', name: '희박한 성운', desc: '지구형 행성에서 시작한다', mass: 1 * G.EARTH_MASS, volume: 20, accretionBoost: 0.65 },
    ];
})();
