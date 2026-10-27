/* 엔딩 연출: 소멸 — 화면 왼쪽 끝으로 밀려난 빛이 먼지가 되어 흩어진다 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  Gp._endingAnims = Gp._endingAnims || {};

  const mod: EndingAnimModule = {
    duration: 3.4,
    sound: (A) => A.playSweep(260, 50, 3.0),
    draw: (ctx, R, p) => {
      const x0 = R.W * 0.04, y0 = R.H * 0.55;
      // 꺼져가는 마지막 빛
      const a = Math.pow(1 - p, 1.5);
      const g = ctx.createRadialGradient(x0, y0, 0, x0, y0, 90 * (1 - p * 0.6) + 10);
      g.addColorStop(0, 'rgba(235,225,210,' + (0.55 * a).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x0, y0, 100, 0, Math.PI * 2); ctx.fill();
      // 오른쪽에서 왼쪽으로 흘러가는 먼지 — 우주는 계속 흘러간다
      for (const q of R.endingParticles) {
        const t = p * (0.5 + q.speed / 100);
        const x = R.W * ((q.a / 6.283 + 1.2 - t * 1.4) % 1.2) - R.W * 0.05;
        const y = y0 + Math.sin(q.a * 7 + p * 4) * R.H * 0.28;
        ctx.fillStyle = 'rgba(200,205,225,' + (0.5 * (1 - p)).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, q.r * 0.7, 0, Math.PI * 2); ctx.fill();
      }
    },
  };
  Gp._endingAnims.vanish = mod;
})();
