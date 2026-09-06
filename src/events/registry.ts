/* 이벤트 풀 조립 + 랜덤 선택 로직 (early/mid/late 각 파일이 미리 채워둔
   임시 필드를 모아 최종 Game.EVENTS 배열을 만든다) */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  G.EVENTS = ([] as EventDef[]).concat(
    Gp._EARLY_EVENTS || [],
    Gp._MID_EVENTS || [],
    Gp._LATE_EVENTS || []
  );

  G.pickEvent = function (): EventDef | null {
    const state = G.state;
    const pool: EventDef[] = [];
    for (const e of G.EVENTS) {
      if (e.once && state.usedOnce.has(e.id)) continue;
      if (!e.once && e.id === state.lastEventId) continue;
      if (!e.condition(state)) continue;
      pool.push(e);
      if (e.once) { for (let k = 0; k < 4; k++) pool.push(e); } // weight specials higher
    }
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  };
})();
