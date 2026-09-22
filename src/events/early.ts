/* 형성기(핵융합 점화 전) 이벤트 — 지구형/목성형 행성 단계의 정체성 형성.
   이 단계 질량은 지구질량 안팎(~1e-6 M☉)이라 기존처럼 절대량을 더하면
   의미가 없다 — 실제 미행성체 성장(runaway/oligarchic growth)처럼
   비율(곱셈)로 불어나게 한다. 배경(수동) 성장은 매우 미미하게 눌러뒀으므로
   (main/loop.ts) 실제로 점화까지 이끄는 성장은 사실상 이 선택들 몫이다 —
   그래서 한 번의 선택으로 뚜렷하게 체감되도록 배율을 크게 잡는다(거대
   미행성체 충돌 한 방으로 질량이 몇 배씩 뛰는 실제 후기 강착 단계처럼).
   모든 선택지가 질량을 늘린다 — 예전엔 질량이 전혀 늘지 않는 선택지가 둘
   있어서, 그것만 고르는 경로는 점화까지 한없이 늘어졌다. 지금은 배율의
   크기로만 갈린다(안전 ~2.45~2.55배, 위험 ~2.9~3.0배, 부수적 선택 ~1.9~2.0배).
   배율의 상한은 popup.ts가 강제하는 "한 번에 현재 질량의 200%까지"(=3배)와
   같다 — 그래서 어떤 선택도 상한에 잘려 체감이 사라지는 일이 없다.
   표준 성운(지구 1개 질량)에서 점화(0.08 M☉)까지 대략 10~12회면 닿는다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));

  const EARLY_EVENTS: EventDef[] = [
    { id: 1, once: false, title: "원시 원반의 잔해",
      desc: "주변을 맴도는 먼지 원반이 아직 흩어지지 않았다.",
      condition: (s) => !s.hasFusion,
      w: { label: "강하게 끌어당긴다", caption: "흡수", riskTier: 1, vis: { mass: 2, volume: 1, fuel: -1 }, apply: (s) => { s.mass *= 2.95; s.volume += 5; s.fuel -= 8; } },
      s: { label: "천천히 정착하며 균형을 잡는다", caption: "정착", riskTier: 0, vis: { mass: 1, volume: 1, fuel: 0 }, apply: (s) => { s.mass *= 2.45; s.volume += 5; } } },
    { id: 2, once: false, title: "거대 분자운 통과",
      desc: "짙은 가스 구름이 진로를 가로막는다.",
      condition: (s) => !s.hasFusion,
      w: { label: "구름 속으로 파고들어 흡수한다", caption: "흡수", riskTier: 1, vis: { mass: 100, volume: 20, fuel: 100 }, apply: (s) => { s.mass *= 2.9; s.volume += 10; } },
      s: { label: "구름을 피해 돌아간다", caption: "회피", riskTier: 0, vis: { mass: 1, volume: 0, fuel: -1 }, apply: (s) => { s.mass *= 1.9; s.fuel -= 2; } } },
    { id: 3, once: false, title: "쌍둥이 원시성 경쟁",
      desc: "근처에 같은 물질을 노리는 또 다른 원시체가 있다.",
      condition: (s) => !s.hasFusion,
      w: { label: "물질을 먼저 차지하려 경쟁한다", caption: "경쟁", riskTier: 1, vis: { mass: 2, fuel: -1 }, apply: (s) => { s.mass *= 3.0; s.fuel -= 6; } },
      s: { label: "양보하고 남는 것을 취한다", caption: "양보", riskTier: 0, vis: { mass: 1, fuel: 1 }, apply: (s) => { s.mass *= 2.5; s.fuel += 6; } } },
    { id: 4, once: false, title: "자전 가속",
      desc: "회전이 점점 빨라지며 형태가 요동친다.",
      condition: (s) => !s.hasFusion,
      w: { label: "회전을 가속해 편평해진다", caption: "팽창", riskTier: 0, vis: { mass: 1, volume: 2 }, apply: (s) => { s.mass *= 2.0; s.volume += 8; } },
      s: { label: "천천히 응축된다", caption: "응축", riskTier: 0, vis: { mass: 1, volume: -1 }, apply: (s) => { s.mass *= 2.55; s.volume -= 5; } } },
  ];

  (G as any)._EARLY_EVENTS = EARLY_EVENTS;
})();
