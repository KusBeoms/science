/* 엔딩 트리거: 팝업 종료 + 음악 정지 + 연출 시작을 한 번에 처리 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const state = G.state;

  Gp._triggerEnding = function (type: EndingKind) {
    if (state.gameOver) return;
    state.gameOver = true; state.endingType = type;
    if (state.eventOpen) Gp._popupCloseEvent();
    G.Audio.stopMusic();
    document.getElementById('lifeGaugeFill')!.classList.remove('danger');
    G.Render.setupEndingAnim(type);
  };
})();
