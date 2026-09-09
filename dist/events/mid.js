"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const MID_EVENTS = [
        { id: 5, once: false, title: "핵융합 점화",
            desc: "중심부에서 첫 반응이 시작된다.",
            condition: (s) => s.hasFusion,
            w: { label: "반응을 적극적으로 가속한다", caption: "폭주", riskTier: 2, vis: { mass: -1, fuel: -2 }, apply: (s) => { s.mass *= 0.72; s.fuel -= 14; } },
            s: { label: "반응을 조절해 안정화한다", caption: "안정화", riskTier: 0, vis: { fuel: 2 }, apply: (s) => { s.fuel += 10; } } },
        { id: 6, once: false, title: "항성풍 분출",
            desc: "표면에서 물질이 뿜어져 나가려 한다.",
            condition: (s) => s.hasFusion,
            w: { label: "강하게 뿜어낸다", caption: "분출", riskTier: 1, vis: { mass: -2, volume: -1 }, apply: (s) => { s.mass *= 0.55; s.volume -= 6; } },
            s: { label: "조용히 흘려보낸다", caption: "방출", riskTier: 0, vis: { mass: -1 }, apply: (s) => { s.mass *= 0.85; } } },
        { id: 7, once: false, title: "소행성대 통과",
            desc: "파편이 빽빽하게 흩어진 지대를 지난다.",
            condition: (s) => s.hasFusion,
            w: { label: "충돌을 감수하고 돌진한다", caption: "돌진", riskTier: 2, vis: { special: 'impact' }, apply: (s) => { s.mass *= s.volume < 25 ? 0.6 : 2.9; } },
            s: { label: "중력으로 끌어당겨 흡수한다", caption: "흡수", riskTier: 0, vis: { mass: 1 }, apply: (s) => { s.mass *= 1.9; } } },
        { id: 8, once: true, title: "동반성 조우",
            desc: "근처를 떠돌던 또 다른 원시성이 안정 궤도에 들어온다.",
            condition: (s) => s.hasFusion && s.companionOffered && !s.hasCompanion && !s.companionEventShown,
            w: { label: "끌어당겨 궤도에 묶는다", caption: "결속", riskTier: 1, vis: { special: 'bond' }, apply: (s) => {
                    s.hasCompanion = true;
                    s.companionEventShown = true;
                    const r = Math.random();
                    if (r < 0.34) {
                        s.companionTier = 'low';
                        s.companionMass = 0.3 + Math.random() * 7.2;
                    }
                    else if (r < 0.67) {
                        s.companionTier = 'mid';
                        s.companionMass = 8.5 + Math.random() * 11;
                    }
                    else {
                        s.companionTier = 'high';
                        s.companionMass = 21 + Math.random() * 30;
                    }
                    s.companionFuel = G.FUEL_MAX;
                    s.companionAlive = true;
                } },
            s: { label: "서로의 중력만 느끼며 스쳐 지나간다", caption: "스침", riskTier: 0, vis: { special: 'pass' }, apply: (s) => { s.companionEventShown = true; } } },
        { id: 9, once: false, title: "가스 자이언트 흡수",
            desc: "거대한 가스 덩어리가 궤도 안으로 들어왔다.",
            condition: (s) => s.hasFusion,
            w: { label: "집어삼킨다", caption: "포식", riskTier: 1, vis: { mass: 2, volume: 2 }, apply: (s) => { s.mass *= 3.0; s.volume += 12; } },
            s: { label: "밀어낸다", caption: "완충", riskTier: 0, vis: { fuel: 1 }, apply: (s) => { s.fuel += 6; } } },
        { id: 10, once: false, title: "초신성 잔해 구름 통과",
            desc: "오래전 죽은 별의 무거운 원소가 흩어져 있다.",
            condition: (s) => s.hasFusion,
            w: { label: "무거운 원소를 흡수한다", caption: "흡수", riskTier: 1, vis: { mass: 2, volume: 1 }, apply: (s) => { s.mass *= 3.0; s.volume += 3; } },
            s: { label: "가볍게 스치듯 통과한다", caption: "스침", riskTier: 0, vis: { mass: 1 }, apply: (s) => { s.mass *= 1.8; } } },
    ];
    G._MID_EVENTS = MID_EVENTS;
})();
