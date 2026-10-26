/* 2축 성격 아키타입 시스템: 입력 빈도(E/C) × 입력 리듬(B/P) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  const ARCH: Record<string, ArchetypeInfo> = {
    EB: { title: "팽창형 개입가", desc: "무엇이든 끌어안고 보는 성향, 키를 몰아치듯 눌러 몸집을 불리는 데 주저함이 없다." },
    EP: { title: "신중한 수집가", desc: "일정한 박자로, 천천히 그러나 꾸준히 성운을 불러들이는 성향." },
    CB: { title: "대담한 승부사", desc: "평소엔 지켜보다가 결정적인 순간에 한꺼번에 손을 뻗는다." },
    CP: { title: "고요한 관조자", desc: "최소한의 개입으로 흐름에 몸을 맡긴다." },
    EBX: { title: "탐욕스러운 붕괴자", desc: "거의 쉬지 않고 성운을 삼켰다. 멈추는 법을 몰랐다." },
    CPX: { title: "은둔의 수도자", desc: "거의 손대지 않았다. 우주가 알아서 흘러가도록 두었다." },
  };
  Gp._endingArch = ARCH;

  // 선택지가 없어졌으므로 성격은 "얼마나 자주(E/C)" × "어떤 리듬으로(B/P)" 키를 눌렀는지로 가른다.
  Gp._endingComputeArchetype = function (): ArchetypeInfo {
    const state = G.state;
    const total = state.pressCount;
    if (total === 0) return ARCH.CPX;
    const rate = total / Math.max(10, state.playTime);       // 초당 입력 수
    const burst = state.burstPresses / total;                // 몰아치기 비율
    const axisA = rate >= 1.2 ? 'E' : 'C';
    const axisB = burst >= 0.45 ? 'B' : 'P';
    if (axisA === 'E' && axisB === 'B' && rate >= 3) return ARCH.EBX;
    if (axisA === 'C' && axisB === 'P' && rate <= 0.25) return ARCH.CPX;
    return ARCH[axisA + axisB];
  };
})();
