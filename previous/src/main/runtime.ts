/* main/* 파일들이 공유하는 가변 런타임 상태.
   예전엔 하나의 IIFE 안 클로저 변수였지만, 여러 파일로 쪼개면서
   Game 네임스페이스 아래 한 곳에 모아 공유한다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  interface IntroParticle { a: number; r0: number; size: number; delay: number; }

  Gp._runtime = {
    timeSkipping: false,

    // 점화 후 나이 가속 램프의 경과 시간(초). ignition.ts가 0으로 되돌린다.
    ignitionAgeRampT: 0,

    introParticles: [] as IntroParticle[],
    introT: 0,
    introPlaying: false,
    introDur: 2.2,
    introSpinDir: 1,
    introPanT: 0, // 응축 완료 후 카메라가 오른쪽으로 팬하는 진행 시간

    // 사망 연출 단계: move(중앙으로 이동) → form(엔딩 모양 형성) → hold(2초 정지) → fadeOut(암전) → done
    endingPhase: 'idle' as 'idle' | 'move' | 'form' | 'hold' | 'fadeOut' | 'done',
    endingMoveT: 0,
    endingHoldT: 0,
    endingFadeT: 0,

    lastT: performance.now(),
  };
})();
