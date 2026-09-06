/* 아이콘 배지: vis 객체에서 자동 파생 (데이터 중복 없음) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  const SPECIAL_GLYPH: Record<SpecialKind, string> = {
    bond: '⚭', pass: '↗', stayBound: '⇌', drift: '↔', collide: '💥',
    swerve: '↩', impact: '▤', compress: '»', flare: '✺', fade: '○',
  };

  Gp._choiceBadgesFor = function (vis?: ChoiceVis): Badge[] {
    vis = vis || {};
    const badges: Badge[] = [];
    if (vis.mass) badges.push({ glyph: '●', dir: vis.mass > 0 ? 1 : -1 });
    if (vis.volume) badges.push({ glyph: '◯', dir: vis.volume > 0 ? 1 : -1 });
    if (vis.fuel) badges.push({ glyph: '⚡', dir: vis.fuel > 0 ? 1 : -1 });
    if (vis.special) badges.push({ glyph: SPECIAL_GLYPH[vis.special] || '?', dir: 0 });
    return badges;
  };
})();
