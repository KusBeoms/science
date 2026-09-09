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
    const eligible: EventDef[] = [];
    for (const e of G.EVENTS) {
      if (e.once && state.usedOnce.has(e.id)) continue;
      if (!e.once && e.id === state.lastEventId) continue;
      if (!e.condition(state)) continue;
      eligible.push(e);
    }
    if (eligible.length === 0) return null;

    // 등장 확률이 명시된 이벤트를 먼저 굴린다. 후보 수와 무관하게 정확히
    // 그 확률로만 나오므로, 드물게 나와야 할 사건을 의도대로 억제할 수 있다.
    const chanced = eligible.filter((e) => typeof e.chance === 'number');
    const plain = eligible.filter((e) => typeof e.chance !== 'number');
    for (const e of chanced) {
      if (Math.random() < (e.chance as number)) return e;
    }
    // 확률 이벤트가 모두 빗나갔는데 다른 후보가 없다면, 그 판은 이벤트 없이 넘긴다.
    if (plain.length === 0) return null;

    const pool: EventDef[] = [];
    for (const e of plain) {
      pool.push(e);
      // 한 번뿐인 서사 이벤트는 조금 더 자주 나오게 둔다(2배).
      if (e.once) pool.push(e);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  };
})();
