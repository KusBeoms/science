/* 부팅: 별밭 초기화 후 메인 루프 시작 (반드시 다른 main/* 파일들 뒤에 로드) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  G.Render.initStars();
  requestAnimationFrame(Gp._mainLoop);
})();
