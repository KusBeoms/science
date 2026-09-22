"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const EARLY_EVENTS = [
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
    G._EARLY_EVENTS = EARLY_EVENTS;
})();
