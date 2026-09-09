/* 자연사 시점의 엔딩 분기 판정 (충돌/병합은 즉시 트리거라 여기서 다루지 않음).

   실제 항성의 최종 운명을 가르는 건 "죽는 순간의 총 질량"이 아니라 그때까지
   중심에 무엇을 쌓아 올렸는가 — 즉 어디까지 태웠는가다. 그래서 분기는
   state.maxFusionIndex(이번 판에서 실제로 도달한 최대 연소 단계)를 기준으로 한다.

     수소까지만 (0.5 M☉ 미만, 헬륨 점화 실패)
       → 축퇴된 중심핵이 끝내 1억 K에 못 미쳐 수소만 태우고 식는다. 헬륨 백색왜성.
     헬륨까지 (0.5~8 M☉)
       → 탄소-산소 핵을 남긴 채 외피를 잃는다. CO 백색왜성.
     탄소·네온까지 (8~11 M☉)
       → O-Ne-Mg 핵이 만들어지면 전자포획으로 붕괴가 시작된다. 초신성.
     규소·철까지 (11 M☉ 이상)
       → 철은 더 태워도 에너지가 나오지 않아 핵이 즉시 무너진다. 초신성,
         그리고 잔해가 20 M☉를 넘길 만큼 무거우면 폭발이 외피를 뚫지 못해 블랙홀.

   질량은 이벤트로 오르내리므로 이 둘은 실제로 갈린다 — 한때 15 M☉까지 올라가
   탄소를 태웠다면, 이후 항성풍으로 질량을 잃어 5 M☉로 죽더라도 이미 만들어진
   핵은 사라지지 않는다. 그런 별은 백색왜성이 아니라 초신성으로 끝난다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  // FUSION_STAGES 인덱스: 0=H 1=He 2=C 3=Ne 4=O 5=Si 6=Fe
  const CARBON_INDEX = 2;

  Gp._endingNaturalType = function (): EndingKind {
    const state = G.state;
    const burned = state.maxFusionIndex;
    // 탄소 이상을 태운 별은 중심핵이 스스로 못 버티는 지점을 이미 넘었다.
    const coreCollapses = burned >= CARBON_INDEX;

    // 동반성이 얽힌 결말이 우선한다 — 다만 핵붕괴가 예정된 별은 동반성이
    // 곁에 있든 없든 조용히 식어갈 수 없다.
    if (!coreCollapses) {
      if (state.hasCompanion && state.companionAlive) return 'friends';
      if (state.hasCompanion && !state.companionAlive && state.staysBound) return 'spider';
      return 'whitedwarf';
    }
    if (state.hasCompanion && !state.companionAlive && state.staysBound) return 'spider';
    if (state.mass >= G.BLACK_HOLE_MIN) return 'blackhole';
    return 'supernova';
  };
})();
