/* 몸체 단계 판정: 지구형행성 → 목성형행성 → (점화) → 질량이 허락하는 핵융합 단계.
   HUD 라벨, 나침반, 내부구조 다이어그램이 모두 이 모듈 하나를 기준으로 삼는다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  // 실제 25 M☉ 별의 각 연소 단계 지속시간(수소 700만 년~규소 하루)은
  // 뒤로 갈수록 6~7자리씩 짧아져 그대로 fuelFrac 구간에 대응시키면 후반
  // 단계가 사실상 한 프레임 만에 지나가 버린다. 그래서 "뒤로 갈수록 훨씬
  // 짧다"는 정성적 사실은 유지하되, 각 단계가 최소한 눈에 보이도록 구간을
  // 압축해서 배정한다(플레이 가능한 범위 내에서 기하급수적으로 감소).
  const FUSION_STAGES: FusionStageInfo[] = [
    { key: 'H', index: 0, name: '수소 연소', color: '#e8e8e8' },
    { key: 'He', index: 1, name: '헬륨 연소', color: '#ffe27a' },
    { key: 'C', index: 2, name: '탄소 연소', color: '#ffb27a' },
    { key: 'Ne', index: 3, name: '네온 연소', color: '#c9a0ff' },
    { key: 'O', index: 4, name: '산소 연소', color: '#7ab8ff' },
    { key: 'Si', index: 5, name: '규소 연소', color: '#b0b0b0' },
    { key: 'Fe', index: 6, name: '철핵(붕괴 직전)', color: '#8a2f2f' },
  ];
  Gp._stageFusionStages = FUSION_STAGES;

  // 어디까지 태울 수 있느냐는 중심 온도가, 중심 온도는 질량이 정한다.
  // 각 경로의 단계 목록은 항상 FUSION_STAGES의 앞에서부터 잘라낸 것이라,
  // "도달한 최대 단계 번호" 하나만 있으면 어떤 단계들을 거쳤는지 복원할 수 있다.
  // 경계값은 연료 잔량(fuelFrac) 구간이며 길이는 (단계 수 + 1)이다.
  const BOUNDARIES_BY_COUNT: Record<number, number[]> = {
    1: [1, 0],                                         // 수소만
    2: [1, 0.2, 0],                                    // 수소·헬륨
    4: [1, 0.28, 0.10, 0.03, 0],                       // 수소~네온(O-Ne-Mg 핵)
    7: [1, 0.15, 0.05, 0.025, 0.015, 0.007, 0.002, 0], // 수소~철핵
  };

  // 질량 → 태울 수 있는 단계 수 (임계값 근거는 constants.ts 주석 참고)
  Gp._stageFusionCount = function (mass: number): number {
    if (mass >= G.IRON_CORE_MIN) return 7;
    if (mass >= G.CARBON_IGNITION_MIN) return 4;
    if (mass >= G.HELIUM_IGNITION_MIN) return 2;
    return 1;
  };

  // 연료 잔량만으로 본 연소 단계(질주 덮어쓰기 무시) — main/collapse.ts가
  // "원래 지금 어디여야 하는지"를 알기 위해 쓴다.
  Gp._stageFuelIndex = function (state: GameState): number {
    const fuelFrac = G.clamp(state.fuel / G.FUEL_MAX, 0, 1);
    const boundaries = BOUNDARIES_BY_COUNT[Gp._stageFusionCount(state.mass)];
    for (let i = 0; i < boundaries.length - 1; i++) {
      if (fuelFrac <= boundaries[i] && fuelFrac >= boundaries[i + 1]) return i;
    }
    return boundaries.length - 2;
  };

  Gp._stageFusionIndex = function (state: GameState): number {
    // 건너뛴 단계를 빠르게 밟는 중이면(main/collapse.ts) 그 단계를 그대로 쓴다 —
    // 연료가 크게 깎이면 연료 기준 판정이 여러 단계를 한 프레임 만에 건너뛰고,
    // 특히 연료 0은 경로의 마지막 단계(철핵 등)로 판정되기 때문이다.
    if (state.forcedFusionIndex >= 0) return state.forcedFusionIndex;
    return Gp._stageFuelIndex(state);
  };

  Gp._stageBodyKey = function (state: GameState): BodyStageKey {
    if (!state.hasFusion) {
      return state.mass < G.GAS_GIANT_MIN_MASS ? 'rocky' : 'gasGiant';
    }
    return FUSION_STAGES[Gp._stageFusionIndex(state)].key;
  };

  Gp._stageBodyLabel = function (state: GameState): string {
    if (!state.hasFusion) {
      return state.mass < G.GAS_GIANT_MIN_MASS ? '지구형행성' : '목성형행성';
    }
    return FUSION_STAGES[Gp._stageFusionIndex(state)].name;
  };

  // 좌상단 배지용 "큰 분류" 라벨 — 나침반(세부 연소 단계)과 달리
  // 지구형/목성형(점화 전) → 주계열성 → 적색거성/초거성(말기)까지
  // 4종류로만 뭉뚱그린다. 일반 관객에게 익숙한 항성 생애 용어.
  Gp._stageCoarseLabel = function (state: GameState): string {
    // 점화 전에는 암석형/가스형을 구분하지 않고 "행성"으로 묶는다 — 세부
    // 구분은 트랙 라벨과 단면도, 그리고 행성 본체 그림이 이미 보여준다.
    if (!state.hasFusion) return '행성';
    // 헬륨 점화 하한(0.5 M☉) 아래의 별은 완전대류라 수소를 남김없이 태우고,
    // 껍질 연소가 일어나지 않아 거성 단계를 아예 겪지 않는다 — 태어나서
    // 죽을 때까지 적색왜성이다. 예전엔 연료가 30% 아래로만 내려가면 질량과
    // 무관하게 "적색거성"을 붙여, 0.45 M☉ 별도 거성이라 표시하는 버그가 있었다.
    if (state.mass < G.HELIUM_IGNITION_MIN) return '적색왜성';
    const fuelFrac = G.clamp(state.fuel / G.FUEL_MAX, 0, 1);
    if (fuelFrac >= 0.3) return '주계열성';
    return state.mass < G.WHITE_DWARF_MAX ? '적색거성' : '초거성';
  };

  // 상단 진행 트랙용: 원시체 1칸 + 그 질량이 태울 수 있는 연소 단계
  // (1·2·4·7칸 중 하나)를 순서대로 나열하고, 지금이 몇 번째 칸인지 함께
  // 돌려준다. _stageFusionIndex와 같은 기준으로 칸 수를 정하므로 단면도가
  // 보여주는 층 수와 항상 일치한다.
  Gp._stageSequence = function (state: GameState): StageSequenceInfo {
    // 지나온 단계는 계속 남는다 — 암석형·가스형 두 칸을 항상 함께 깔아둬서,
    // 목성형이 된 뒤에도 "지구형행성을 지나왔다"가 트랙에 그대로 보인다.
    const entries: StageSequenceEntry[] = [
      { key: 'rocky', label: '지구형행성' },
      { key: 'gasGiant', label: '목성형행성' },
    ];
    // 연소 단계도 마찬가지로, 질량이 줄어 태울 수 있는 단계가 적어지더라도
    // 이미 태운 단계는 목록에서 사라지지 않게 한다.
    const fusionCount = Math.max(Gp._stageFusionCount(state.mass), state.maxFusionIndex + 1);
    for (let i = 0; i < fusionCount; i++) entries.push({ key: FUSION_STAGES[i].key, label: FUSION_STAGES[i].name });

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
