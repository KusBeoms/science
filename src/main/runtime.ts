/* main/* 파일들이 공유하는 가변 런타임 상태.
   예전엔 하나의 IIFE 안 클로저 변수였지만, 여러 파일로 쪼개면서
   Game 네임스페이스 아래 한 곳에 모아 공유한다. */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  interface IntroParticle { a: number; r0: number; size: number; delay: number; }

  Gp._runtime = {
    currentEvent: null as EventDef | null,
    evTimeLeft: 0,
    evDuration: 4,
    choiceAnimRAF: null as number | null,
    choiceAnimStartT: 0,

    timeSkipping: false,

    introParticles: [] as IntroParticle[],
    introT: 0,
    introPlaying: false,
    introDur: 2.2,
    introSpinDir: 1,

    lastT: performance.now(),
  };
})();
