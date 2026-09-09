/* 순수 수치 헬퍼: 클램프, 연료 소모율, 질량 기반 체감 나이 속도 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));

  G.clamp = function (v: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, v));
  };

  // mass는 태양 질량(M☉) 단위.
  //
  // "무거운 별일수록 짧고 굵게 산다"는 사실은 아래 yearsPerSecond가 이미
  // 온전히 전달한다 — 연료가 바닥나는 순간 화면의 나이가 그 별의 실제 주계열
  // 수명이 되도록 역산하기 때문에, 20 M☉는 559만 년에서, 0.2 M☉는 5,590억
  // 년에서 죽는다(10만 배 차이). 그래서 "실제 플레이 시간"까지 질량에 따라
  // 짧아지게 만들 필요가 없다.
  //
  // 오히려 그렇게 두면 역효과가 났다: 질량을 키울수록 수명이 짧아져 남은
  // 이벤트 기회가 줄고, 결국 무거운 별을 노리는 선택이 스스로를 방해했다
  // (초신성·블랙홀 경로에 도달하기 어려웠던 주된 이유). 그래서 질량 의존성은
  // 흔적만 남기고(지수 0.1) 거의 평평하게 둬, 어떤 질량이든 비슷한 수의
  // 선택 기회를 갖게 한다.
  //
  // 계수는 한 판의 길이를 정한다. 세 프리셋이 서로 다른 지점에서 시작하므로
  // (항성 / 목성형 / 지구형) 총 플레이타임 = 형성기 + 항성기인데, 형성기 길이는
  // 프리셋마다 0·30·70초로 고정이다. 그래서 공통 항인 항성기를 늘려
  // 세 프리셋이 모두 2~5분 안에 들어오도록 맞춘다.
  //
  // 결과 항성기 수명(FUEL_MAX 기준): 0.5 M☉ ≈ 109초, 1 M☉ ≈ 101초,
  // 8 M☉ ≈ 82초, 20 M☉ ≈ 75초, 90 M☉ ≈ 65초.
  //
  // 이 값을 바꿔도 나이 카운터는 어긋나지 않는다 — yearsPerSecond가
  // 「실제 수명 ÷ 게임 내 수명」으로 역산하므로 자동으로 보정된다.
  G.fuelBurnRate = function (m: number): number {
    return 7.4 * Math.pow(G.clamp(m, 0.5, 90), 0.1);
  };

  // 실제 항성의 주계열 수명 공식: 질량-광도 관계 L ∝ M^3.5 (main-sequence
  // mass–luminosity relation)에서 수명 τ ∝ M/L ∝ M^-2.5, 태양 수명
  // τ☉ ≈ 100억 년(10 Gyr) 기준. 예: 8 M☉(백색왜성/초신성 경계) → 약 5500만 년,
  // 20 M☉(블랙홀 경계) → 약 630만 년 — 실제 대질량 O형 별의 수명(수백만 년)과 부합.
  //
  // 나이 카운터는 "이 별이 연료를 다 태웠을 때 화면의 숫자가 정확히 그 별의
  // 실제 주계열 수명이 되도록" 역산한 속도로 흐른다:
  //   초당 나이 = 실제 수명(년) / 게임 내 남은 수명(초)
  // 그래서 태양질량 별은 죽는 순간 100억 년, 20 M☉ 별은 약 600만 년,
  // 0.2 M☉ 적색왜성은 수천억 년을 가리킨다 — 가벼운 별일수록 오래 산다는
  // 사실이 숫자로 그대로 드러난다.
  //
  // (예전 구현은 M^+2.5, 즉 무거울수록 나이가 빨리 늘도록 되어 있어 실제
  //  관계와 정반대였고, 저질량 별에서는 하한 0.05에 걸려 한 판 내내 "0년"만
  //  표시됐다.)
  // 실제 주계열 수명 τ(M). 두 구간으로 나뉜다.
  //
  //   M ≥ 0.5 M☉ : τ = 100억 년 × M^-2.5
  //     질량-광도 관계에서 나오는 표준 관계. 태양 100억 년, 2 M☉ 약 18억 년,
  //     5 M☉ 약 1.8억 년, 20 M☉ 약 560만 년으로 문헌값과 맞는다.
  //
  //   M < 0.5 M☉ : 위 관계보다 훨씬 가파르게(지수 3.1) 길어진다
  //     태양은 중심핵의 수소 약 10%만 태우고 죽지만, 이 구간의 별은
  //     완전대류(fully convective)라 별 전체의 수소를 남김없이 연료로
  //     끌어다 쓴다. 그래서 단순 멱법칙이 예측하는 것보다 수명이 크게 길어져
  //     0.08 M☉에서 약 17조 년에 이른다 — 우주 나이(138억 년)보다 훨씬 길어
  //     아직 수명을 다한 적색왜성은 우주에 하나도 없다.
  const LOW_MASS_PIVOT = 0.5;
  function mainSequenceLifetimeYears(mm: number): number {
    if (mm >= LOW_MASS_PIVOT) return 1e10 * Math.pow(mm, -2.5);
    // 경계에서 값이 이어지도록 피벗 지점의 수명에 이어 붙인다.
    const atPivot = 1e10 * Math.pow(LOW_MASS_PIVOT, -2.5);
    return atPivot * Math.pow(mm / LOW_MASS_PIVOT, -3.1);
  }

  G.yearsPerSecond = function (m: number): number {
    const mm = G.clamp(m, 0.08, 100) / G.MASS_REF;
    const lifetimeYears = mainSequenceLifetimeYears(mm);
    const gameSeconds = G.FUEL_MAX / G.fuelBurnRate(mm);
    return lifetimeYears / gameSeconds;
  };

  // 나이는 수천억~수조 년까지 커져서 자릿수를 그대로 찍으면 읽을 수 없다.
  // 만/억/조 단위로 끊어 한국어 표기법대로 압축한다.
  G.formatYears = function (y: number): string {
    const abs = Math.abs(y);
    const unit = (v: number, suffix: string) =>
      (v < 100 ? v.toFixed(1) : Math.round(v).toLocaleString('ko-KR')) + suffix;
    if (abs < 1e4) return Math.floor(y).toLocaleString('ko-KR') + '년';
    if (abs < 1e8) return unit(y / 1e4, '만 년');
    if (abs < 1e12) return unit(y / 1e8, '억 년');
    return unit(y / 1e12, '조 년');
  };
})();
