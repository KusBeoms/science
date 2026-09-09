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
    const oldW = this.W, oldH = this.H;
    // 픽셀 버퍼는 devicePixelRatio 배로 잡고 좌표계는 setTransform으로 CSS 픽셀
    // 단위를 유지한다 — 고해상도 화면에서 별/배경이 흐릿하게 뭉개지지 않으면서,
    // W/H를 쓰는 모든 그리기 코드는 그대로 둘 수 있다.
    const dpr = window.devicePixelRatio || 1;
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    canvas.width = Math.round(this.W * dpr);
    canvas.height = Math.round(this.H * dpr);
    canvas.style.width = this.W + 'px';
    canvas.style.height = this.H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Gp._renderResyncStars.call(this, oldW, oldH);
  };
})();
