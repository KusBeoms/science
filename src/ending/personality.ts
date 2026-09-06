/* 2축 성격 아키타입 시스템: 개입 성향(E/C) × 위험 성향(B/P) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  const ARCH: Record<string, ArchetypeInfo> = {
    EB: { title: "팽창형 개입가", desc: "무엇이든 끌어안고 보는 성향, 몸집을 불리는 데 주저함이 없다." },
    EP: { title: "신중한 수집가", desc: "천천히, 그러나 꾸준히 모으는 성향." },
    CB: { title: "대담한 정리자", desc: "위험을 감수하며 스스로를 깎아내는 데 익숙하다." },
    CP: { title: "고요한 관조자", desc: "최소한의 개입으로 흐름에 몸을 맡긴다." },
    EBX: { title: "탐욕스러운 붕괴자", desc: "거의 모든 순간 손을 뻗었고, 위험조차 서슴지 않았다." },
    CPX: { title: "은둔의 수도자", desc: "거의 모든 순간 물러섰고, 어떤 위험도 곁에 두지 않았다." },
  };
  Gp._endingArch = ARCH;

  Gp._endingComputeArchetype = function (): ArchetypeInfo {
    const state = G.state;
    const total = state.choiceLog.length;
    if (total === 0) return ARCH.CP;
    let wCount = 0, riskCount = 0;
    for (const c of state.choiceLog) { if (c.key === 'W') wCount++; if (c.riskTier >= 2) riskCount++; }
    const wRatio = wCount / total, riskRatio = riskCount / total;
    const axisA = wRatio >= 0.5 ? 'E' : 'C';
    const axisB = riskRatio >= 0.28 ? 'B' : 'P';
    if (axisA === 'E' && axisB === 'B' && wRatio >= 0.85) return ARCH.EBX;
    if (axisA === 'C' && axisB === 'P' && wRatio <= 0.15) return ARCH.CPX;
    return ARCH[axisA + axisB];
  };
})();
