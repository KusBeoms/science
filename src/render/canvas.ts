/* 캔버스/컨텍스트 확보 + 리사이즈 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  Gp._renderCanvas = canvas;
  Gp._renderCtx = ctx;

  Gp._renderResize = function (this: RenderAPI) {
    this.W = canvas.width = window.innerWidth;
    this.H = canvas.height = window.innerHeight;
  };
})();
