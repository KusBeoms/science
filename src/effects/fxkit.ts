/* 성운/효과 연출이 함께 쓰는 그리기 헬퍼 모음(난수, 색, 글로우, 궤도 꼬리, 화면 흔들림) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  const TAU = Math.PI * 2;

  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
  function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
  function smooth(t: number) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  // 시드 고정 난수(mulberry32) — 효과마다 같은 모양이 매번 다르게, 그러나 한 번 시작하면 일관되게
  function rng(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hsl(h: number, s: number, l: number, a?: number): string {
    return 'hsla(' + (((h % 360) + 360) % 360).toFixed(0) + ',' + s + '%,' + l + '%,' + (a == null ? 1 : Math.max(0, Math.min(1, a)).toFixed(3)) + ')';
  }

  // 색상환에서 가까운 쪽으로 돌아가는 보간(분홍→주황이 초록을 거치지 않게)
  function hueLerp(a: number, b: number, t: number): number {
    const d = ((b - a + 540) % 360) - 180;
    return a + d * t;
  }

  function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c0: string, c1?: string) {
    if (!(r > 0.5)) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1 || 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  // 4갈래 반짝임(렌즈 플레어 같은 십자 별)
  function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
    ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
    ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
    ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
    ctx.fill();
    ctx.restore();
  }

  // 타원 궤도 위의 꼬리: 각도 a에서 뒤로 len 라디안만큼, 뒤로 갈수록 옅어진다.
  // side: 0 전부, 1 앞쪽 절반(sin>=0, 몸체 앞), -1 뒤쪽 절반(sin<0, 몸체에 가려지는 쪽)
  function arcTrail(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number,
    a: number, len: number, hue: number, alpha: number, lw: number, side: number) {
    const steps = 7;
    ctx.lineCap = 'round';
    for (let i = 0; i < steps; i++) {
      const a0 = a - len * (i / steps), a1 = a - len * ((i + 1) / steps);
      const am = (a0 + a1) / 2;
      const front = Math.sin(am) >= 0;
      if (side === 1 && !front) continue;
      if (side === -1 && front) continue;
      ctx.strokeStyle = hsl(hue, 85, 78, alpha * (1 - i / steps));
      ctx.lineWidth = lw * (1 - i / (steps * 1.4));
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, a1, a0);
      ctx.stroke();
    }
  }

  // 두 점을 잇는 휘어진 가스 다리(동반성 사이) — 점들이 흐르며 반짝인다
  function bridge(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number,
    t: number, hue: number, alpha: number, bend: number, count: number, dir: number) {
    const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
    ctx.strokeStyle = hsl(hue, 80, 70, alpha * 0.25);
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    ctx.strokeStyle = hsl(hue, 90, 82, alpha * 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    for (let i = 0; i < count; i++) {
      let u = ((i / count) + t * 0.45 * dir) % 1; if (u < 0) u += 1;
      const iu = 1 - u;
      const px = iu * iu * x0 + 2 * iu * u * mx + u * u * x1;
      const py = iu * iu * y0 + 2 * iu * u * my + u * u * y1;
      const tw = 0.5 + 0.5 * Math.sin(t * 9 + i * 1.7);
      ctx.fillStyle = hsl(hue + 20, 90, 85, alpha * (0.4 + 0.6 * tw));
      ctx.beginPath(); ctx.arc(px, py, 1.2 + 1.4 * tw, 0, TAU); ctx.fill();
    }
  }

  // 화면 흔들림 — 캔버스 요소 전체를 CSS로 흔든다(core.ts가 매 프레임 적용·감쇠).
  Gp._shake = 0;
  function shake(px: number) { Gp._shake = Math.max(Gp._shake || 0, px); }

  Gp._fx = { TAU, lerp, clamp, smooth, rng, hsl, hueLerp, glow, sparkle, arcTrail, bridge, shake };
})();
