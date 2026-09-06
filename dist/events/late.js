"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const LATE_EVENTS = [
        { id: 11, once: false, title: "핵 붕괴 전조",
            desc: "중심핵이 눈에 띄게 불안정해지기 시작한다.",
            condition: (s) => s.distanceLy >= 7,
            w: { label: "핵을 압축해 버틴다", caption: "압축", riskTier: 2, vis: { fuel: -2, special: 'compress' }, apply: (s) => { s.fuel -= 20; } },
            s: { label: "외피를 벗어던져 부담을 던다", caption: "방출", riskTier: 0, vis: { mass: -2, volume: -2, fuel: 2 }, apply: (s) => { s.mass -= 10; s.volume -= 10; s.fuel += 14; } } },
        { id: 12, once: true, title: "동반성의 위기",
            desc: "동반성이 눈에 띄게 불안정해지고 있다.",
            condition: (s) => s.distanceLy >= 7 && s.hasCompanion && s.companionAlive && s.companionTier !== 'low' && !s.crisisShown,
            w: { label: "궤도를 좁혀 가까이 머문다", caption: "근접", riskTier: 1, vis: { special: 'stayBound' }, apply: (s) => { s.staysBound = true; s.crisisShown = true; } },
            s: { label: "거리를 두어 각자의 길을 간다", caption: "거리", riskTier: 0, vis: { special: 'drift' }, apply: (s) => { s.staysBound = false; s.crisisShown = true; } } },
        { id: 13, once: true, title: "충돌 코스",
            desc: "동반성과의 궤도가 위험할 만큼 좁혀졌다.",
            condition: (s) => s.distanceLy >= 7 && s.hasCompanion && s.staysBound && s.companionAlive && !s.collisionEventShown,
            w: { label: "정면으로 충돌해 하나가 된다", caption: "충돌", riskTier: 2, vis: { special: 'collide' }, apply: (s) => { s.collisionEventShown = true; s.collisionFlag = true; } },
            s: { label: "마지막 순간 궤도를 튼다", caption: "회피", riskTier: 1, vis: { special: 'swerve' }, apply: (s) => { s.collisionEventShown = true; s.mass += 4; s.volume += 2; } } },
        { id: 14, once: false, title: "은하 중심 접근",
            desc: "초거대질량 블랙홀의 조석력이 느껴진다.",
            condition: (s) => s.distanceLy >= 7,
            w: { label: "중력에 몸을 맡긴다", caption: "투신", riskTier: 2, vis: { mass: 2, fuel: -2 }, apply: (s) => { s.mass += 14; s.fuel -= 18; } },
            s: { label: "벗어나려 발버둥친다", caption: "탈출", riskTier: 1, vis: { mass: -1, volume: 1, fuel: 2 }, apply: (s) => { s.mass -= 6; s.volume += 6; s.fuel += 10; } } },
        { id: 15, once: true, title: "마지막 숨",
            desc: "연료가 얼마 남지 않았다.",
            condition: (s) => s.distanceLy >= 7 && (s.fuel / G.FUEL_MAX) < 0.22 && !s.lastBreathShown,
            w: { label: "마지막으로 크게 타오른다", caption: "발화", riskTier: 2, vis: { fuel: -2, special: 'flare' }, apply: (s) => { s.mass += 5; s.fuel -= 30; s.lastBreathShown = true; } },
            s: { label: "조용히 사그라들기 시작한다", caption: "소멸", riskTier: 0, vis: { fuel: -1, special: 'fade' }, apply: (s) => { s.fuel -= 8; s.lastBreathShown = true; } } },
    ];
    G._LATE_EVENTS = LATE_EVENTS;
})();
