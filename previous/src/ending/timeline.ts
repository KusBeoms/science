/* 크레딧용 "받은 효과" 타임라인 칩 HTML 생성 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  Gp._endingBuildTimelineHtml = function (log: EffectLogEntry[]): string {
    if (!log.length) return '';
    const chips = log.map((c) =>
      `<div class="timelineChip">` +
      `<div class="badgeRow"><span class="badge"><span class="glyph" style="font-size:1.1rem">${c.icon}</span></span></div>` +
      `<div class="caption">${c.name}</div></div>`
    ).join('');
    return `<div class="sectionTitle">받은 효과</div><div class="timelineRow">${chips}</div>`;
  };
})();
