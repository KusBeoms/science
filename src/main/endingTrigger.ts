/* 엔딩 트리거: 효과·성운 정리 + 음악 정지 + 연출 시작을 한 번에 처리 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const RT = Gp._runtime;
  const state = G.state;

  Gp._triggerEnding = function (type: EndingKind) {
    if (state.gameOver) return;
    state.gameOver = true; state.endingType = type;
    // 질주 도중 충돌·병합 같은 즉시 결말이 끼어들어도 경고 표시가 남지 않게
    Gp._collapseRushReset();
    // 진행 중이던 효과와 날아오던 성운은 정리한다(엔딩 연출을 가리지 않게)
    G.Effects.reset();
    G.Nebula.reset();
    G.Audio.stopMusic();
    // 화면 이동을 멈추고 별이 중앙으로 이동한 뒤(move) 엔딩 모양이 형성되도록(form)
    // 단계를 나눈다 — setupEndingAnim(파티클/사운드 준비)은 별이 중앙에 도착한
    // 뒤(loop.ts의 move→form 전환 시점)에 호출한다.
    RT.endingPhase = 'move';
    RT.endingMoveT = 0;
  };
})();
