/* 배경 별밭: 생성, 거리 기반 별 개수 축소, 어둠 진행도 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  // 1280x720 창을 기준으로 별 260개였던 밀도를 그대로 유지한다 — 창이
  // 커지면 그 넓이에 비례해 별이 늘어나고, 작아지면 줄어들어서 어떤 창
  // 크기에서도 별밭이 화면 전체를 고르게 채운 것처럼 보이게 한다.
  const REFERENCE_AREA = 1280 * 720 * 0.85;
  const STAR_DENSITY = 260 / REFERENCE_AREA;
  function starCountFor(W: number, H: number): number {
    return Math.max(20, Math.round(STAR_DENSITY * W * H * 0.85));
  }
  function makeStar(W: number, H: number): BackgroundStar {
    return {
      x: Math.random() * W, y: Math.random() * H * 0.85,
      r: 0.6 + Math.random() * 1.8,
      layer: 0.3 + Math.random() * 1.0,
      baseAlpha: 0.4 + Math.random() * 0.6,
    };
  }

  Gp._renderInitStars = function (this: RenderAPI) {
    this.stars = [];
    const count = starCountFor(this.W, this.H);
    for (let i = 0; i < count; i++) this.stars.push(makeStar(this.W, this.H));
  };

  // 창 크기가 바뀔 때 호출된다. 기존 별들의 상대 위치(비율)는 그대로 유지한
  // 채 새 화면 크기에 맞게 다시 배치하고, 밀도 기준에 맞춰 모자란 만큼
  // 새 별을 더하거나 넘치는 만큼 잘라낸다 — 그래서 창을 세로/가로 어느
  // 방향으로 늘리거나 줄여도 별밭에 빈 공간이 생기지 않는다.
  Gp._renderResyncStars = function (this: RenderAPI, oldW: number, oldH: number) {
    if (oldW > 0 && oldH > 0) {
      for (const s of this.stars) {
        s.x = s.x / oldW * this.W;
        s.y = s.y / oldH * this.H;
      }
    }
    const target = starCountFor(this.W, this.H);
    if (this.stars.length < target) {
      for (let i = this.stars.length; i < target; i++) this.stars.push(makeStar(this.W, this.H));
    } else if (this.stars.length > target) {
      this.stars.length = target;
    }
  };

  Gp._renderStarBudget = function (this: RenderAPI): number {
    const step = Math.floor(G.state.distanceLy);
    // 예전엔 "260개 중 몇 개"로 계산했지만, 이제 전체 별 개수가 화면 크기마다
    // 달라지므로 비율로 줄여야 큰 화면에서도 똑같이 서서히 어두워진다.
    const frac = G.clamp(1 - step * 22 / 260, 0, 1);
    return Math.max(1, Math.round(this.stars.length * frac));
  };

  Gp._renderBgDarkness = function (this: RenderAPI): number {
    return G.clamp(G.state.distanceLy / 12, 0, 1);
  };
})();
