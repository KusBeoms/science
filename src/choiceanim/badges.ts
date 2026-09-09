/* 아이콘 배지: vis 객체에서 자동 파생 (데이터 중복 없음) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  const SPECIAL_GLYPH: Record<SpecialKind, string> = {
    bond: '⚭', pass: '↗', stayBound: '⇌', drift: '↔', collide: '💥',
    swerve: '↩', impact: '▤', compress: '»', flare: '✺', fade: '○',
  };

  // 아이콘만 봐서는 뜻을 알기 어렵다는 피드백에 따라, 배지 옆에 붙일 짧은 이름표.
  const SPECIAL_NAME: Record<SpecialKind, string> = {
    bond: '결속', pass: '스침', stayBound: '근접', drift: '거리', collide: '충돌',
    swerve: '회피', impact: '충격', compress: '압축', flare: '발화', fade: '소멸',
  };

  Gp._choiceBadgesFor = function (vis?: ChoiceVis): Badge[] {
    vis = vis || {};
    const badges: Badge[] = [];
    if (vis.mass) badges.push({ glyph: '●', dir: vis.mass > 0 ? 1 : -1, name: '질량' });
    if (vis.volume) badges.push({ glyph: '◯', dir: vis.volume > 0 ? 1 : -1, name: '부피' });
    if (vis.fuel) badges.push({ glyph: '⚡', dir: vis.fuel > 0 ? 1 : -1, name: '연료' });
    if (vis.special) badges.push({ glyph: SPECIAL_GLYPH[vis.special] || '?', dir: 0, name: SPECIAL_NAME[vis.special] || '' });
    return badges;
  };
})();
