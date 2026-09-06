/* 선택지 애니메이션: 부피(고리 확장/수축)와 연료(스파크 흐름) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  Gp._choiceDrawVolumeRings = function (ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, volume?: number) {
    if (!volume) return;
    const dir = volume > 0 ? 1 : -1;
    const mag = Math.min(2, Math.abs(volume));
    for (let i = 0; i < 3; i++) {
      const phase = ((t * 0.7 * (0.7 + mag * 0.5)) + i / 3) % 1;
      const rr = dir > 0 ? 6 + phase * 28 : 34 - phase * 28;
      const alpha = (1 - phase) * 0.65;
      ctx.strokeStyle = `rgba(150,190,255,${Math.max(0, alpha)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, rr), 0, Math.PI * 2); ctx.stroke();
    }
  };

  Gp._choiceDrawFuelSparks = function (ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, fuel?: number) {
    if (!fuel) return;
    const dir = fuel > 0 ? 1 : -1;
    const mag = Math.min(2, Math.abs(fuel));
    const n = 4 + mag * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 0.7;
      const phase = ((t * 0.85 + i * 0.37) % 1);
      const rad = dir > 0 ? 32 - phase * 24 : 10 + phase * 24;
      const radPrev = dir > 0 ? 32 - Math.max(0, phase - 0.06) * 24 : 10 + Math.max(0, phase - 0.06) * 24;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.55;
      const px = cx + Math.cos(a) * radPrev, py = cy + Math.sin(a) * radPrev * 0.55;
      const col = dir > 0 ? `150,255,195` : `255,150,110`;
      ctx.strokeStyle = `rgba(${col},${(1 - phase) * 0.6})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = `rgba(${col},${1 - phase})`;
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    }
  };
})();
