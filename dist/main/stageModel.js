"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
    const FUSION_STAGES = [
        { key: 'H', index: 0, name: '수소 연소', color: '#e8e8e8' },
        { key: 'He', index: 1, name: '헬륨 연소', color: '#ffe27a' },
        { key: 'C', index: 2, name: '탄소 연소', color: '#ffb27a' },
        { key: 'Ne', index: 3, name: '네온 연소', color: '#c9a0ff' },
        { key: 'O', index: 4, name: '산소 연소', color: '#7ab8ff' },
        { key: 'Si', index: 5, name: '규소 연소', color: '#b0b0b0' },
        { key: 'Fe', index: 6, name: '철핵(붕괴 직전)', color: '#8a2f2f' },
    ];
    Gp._stageFusionStages = FUSION_STAGES;
    const BOUNDARIES_BY_COUNT = {
        1: [1, 0],
        2: [1, 0.2, 0],
        4: [1, 0.28, 0.10, 0.03, 0],
        7: [1, 0.15, 0.05, 0.025, 0.015, 0.007, 0.002, 0],
    };
    Gp._stageFusionCount = function (mass) {
        if (mass >= G.IRON_CORE_MIN)
            return 7;
        if (mass >= G.CARBON_IGNITION_MIN)
            return 4;
        if (mass >= G.HELIUM_IGNITION_MIN)
            return 2;
        return 1;
    };
    Gp._stageFusionIndex = function (state) {
        const fuelFrac = G.clamp(state.fuel / G.FUEL_MAX, 0, 1);
        const boundaries = BOUNDARIES_BY_COUNT[Gp._stageFusionCount(state.mass)];
        for (let i = 0; i < boundaries.length - 1; i++) {
            if (fuelFrac <= boundaries[i] && fuelFrac >= boundaries[i + 1])
                return i;
        }
        return boundaries.length - 2;
    };
    Gp._stageBodyKey = function (state) {
        if (!state.hasFusion) {
            return state.mass < G.GAS_GIANT_MIN_MASS ? 'rocky' : 'gasGiant';
        }
        return FUSION_STAGES[Gp._stageFusionIndex(state)].key;
    };
    Gp._stageBodyLabel = function (state) {
        if (!state.hasFusion) {
            return state.mass < G.GAS_GIANT_MIN_MASS ? '지구형행성' : '목성형행성';
        }
        return FUSION_STAGES[Gp._stageFusionIndex(state)].name;
    };
    Gp._stageCoarseLabel = function (state) {
        if (!state.hasFusion)
            return '행성';
        if (state.mass < G.HELIUM_IGNITION_MIN)
            return '적색왜성';
        const fuelFrac = G.clamp(state.fuel / G.FUEL_MAX, 0, 1);
        if (fuelFrac >= 0.3)
            return '주계열성';
        return state.mass < G.WHITE_DWARF_MAX ? '적색거성' : '초거성';
    };
    Gp._stageSequence = function (state) {
        const entries = [
            { key: 'rocky', label: '지구형행성' },
            { key: 'gasGiant', label: '목성형행성' },
        ];
        const fusionCount = Math.max(Gp._stageFusionCount(state.mass), state.maxFusionIndex + 1);
        for (let i = 0; i < fusionCount; i++)
            entries.push({ key: FUSION_STAGES[i].key, label: FUSION_STAGES[i].name });
        const index = state.hasFusion
            ? 2 + Gp._stageFusionIndex(state)
            : (state.mass < G.GAS_GIANT_MIN_MASS ? 0 : 1);
        return { entries, index };
    };
    G.Stage = {
        FUSION_STAGES,
        bodyStageKey(state) { return Gp._stageBodyKey(state); },
        bodyStageLabel(state) { return Gp._stageBodyLabel(state); },
        coarseLabel(state) { return Gp._stageCoarseLabel(state); },
        fusionStageIndex(state) { return Gp._stageFusionIndex(state); },
        fusionStageCount(mass) { return Gp._stageFusionCount(mass); },
        sequence(state) { return Gp._stageSequence(state); },
    };
})();
