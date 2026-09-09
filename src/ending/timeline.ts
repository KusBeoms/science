/* 크레딧용 "당신의 선택" 타임라인 칩 HTML 생성 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  function badgesHtml(vis?: ChoiceVis): string {
    return G.ChoiceAnim.badgesFor(vis).map((b) => {
      const arrow = b.dir > 0 ? '<span class="arrow up">▲</span>'
        : b.dir < 0 ? '<span class="arrow down">▼</span>' : '';
      return `<span class="badge"><span class="glyph">${b.glyph}</span><span class="name">${b.name}</span>${arrow}</span>`;
    }).join('');
  }

  Gp._endingBuildTimelineHtml = function (choiceLog: ChoiceLogEntry[]): string {
    const chips = choiceLog.map((c) => {
      const event = G.EVENTS.find((e) => e.id === c.id);
      if (!event || !c.key) {
        return `<div class="timelineChip timeout">` +
          `<div class="badgeRow"><span class="badge"><span class="glyph">…</span></span></div>` +
          `<div class="keyBox">-</div><div class="caption">망설임</div></div>`;
      }
      const choice = c.key === 'A' ? event.w : event.s;
      return `<div class="timelineChip">` +
        `<div class="badgeRow">${badgesHtml(choice.vis)}</div>` +
        `<div class="keyBox">${c.key}</div><div class="caption">${choice.caption || ''}</div></div>`;
    }).join('');
    return `<div class="sectionTitle">당신의 선택</div><div class="timelineRow">${chips}</div>`;
  };
})();
