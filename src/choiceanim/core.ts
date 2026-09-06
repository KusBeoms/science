/* 선택지 미니 애니메이션의 중심 "핵" 원: 질량 방향성 톱니파 + 리셋 플래시 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  // 별(핵) 반지름: 방향성 있는 톱니파(증가=커지다 리셋, 감소=크게 시작해 줄어들다 리셋)
  Gp._choiceCoreRadius = function (t: number, mass: number, special?: SpecialKind): number {
    const r0 = 9;
    let r = r0;
    if (mass) {
      const dir = mass > 0 ? 1 : -1;
      const mag = Math.min(2, Math.abs(mass));
      const span = 5 + mag * 6;
      const cyc = (t * 0.85) % 1;
      r = dir > 0 ? r0 + cyc * span : r0 + span - cyc * span;
    }
    if (special === 'compress') {
      const cyc = (t * 1.3) % 1;
      const tri = cyc < 0.5 ? cyc * 2 : 2 - cyc * 2;
      r = r0 - 4 * tri;
    } else if (special === 'flare') {
      const cyc = (t * 0.75) % 1;
      r = cyc < 0.15 ? r0 + 22 * (cyc / 0.15) : Math.max(6, 31 - 22 * Math.min(1, (cyc - 0.15) / 0.35));
    } else if (special === 'fade') {
      const cyc = (t * 0.5) % 1;
      r = 13 - 7 * cyc;
    }
    return Math.max(3, r);
  };

  // 톱니 리셋 순간에 짧은 링 플래시를 더해 "성장/수축" 전환을 또렷하게 강조
  Gp._choiceDrawPulseFlash = function (ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, mass: number) {
    if (!mass) return;
    const cyc = (t * 0.85) % 1;
    if (cyc > 0.08) return;
    const p = cyc / 0.08;
    const col = mass > 0 ? '150,200,255' : '255,160,120';
    ctx.strokeStyle = `rgba(${col},${(1 - p) * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 10 + p * 14, 0, Math.PI * 2); ctx.stroke();
  };

  Gp._choiceCoreColor = function (mass: number, special?: SpecialKind): string {
    if (special === 'flare') return '#ffe6a8';
    if (special === 'fade' || special === 'compress') return '#ff9a6b';
    if (mass > 0) return '#ffe6a8';
    if (mass < 0) return '#ff9a6b';
    return '#bcd0ff';
  };
})();
