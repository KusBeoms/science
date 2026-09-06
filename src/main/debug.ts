/* QA용 콘솔 훅: window.debugEnding(1~7)로 각 엔딩을 즉시 트리거 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;
  const RT = Gp._runtime;
  const state = G.state;
  const A = G.Audio;

  const DEBUG_ORDER: EndingKind[] = ['blackhole', 'supernova', 'whitedwarf', 'friends', 'merge', 'collision', 'spider'];

  window.debugEnding = function (n: number) {
    if (n < 1 || n > 7) { console.warn('use 1~7'); return; }
    A.init();
    document.getElementById('startOverlay')!.style.display = 'none';
    document.getElementById('credits')!.classList.remove('show');
    G.resetState();
    G.Render.resetSurfaces();
    state.started = true; state.gameOver = false;
    state.distanceLy = 6 + Math.random() * 5;
    state.ageYears = state.distanceLy / G.SPEED;
    state.mass = 30 + Math.random() * 70;
    state.volume = 30 + Math.random() * 60;
    state.choiceLog = [];
    for (let i = 0; i < 10; i++) {
      state.choiceLog.push({ id: i, key: Math.random() < 0.5 ? 'W' : 'S', riskTier: Math.floor(Math.random() * 3) });
    }
    const type = DEBUG_ORDER[n - 1];
    if (type === 'friends') { state.hasCompanion = true; state.companionAlive = true; state.mass = 30; }
    if (type === 'spider') { state.hasCompanion = true; state.companionAlive = false; state.staysBound = true; }
    if (type === 'merge') { state.hasCompanion = true; state.mergeFlag = true; state.companionAlive = false; }
    if (type === 'collision') { state.hasCompanion = true; state.collisionFlag = true; }
    if (type === 'blackhole') state.mass = 90;
    if (type === 'supernova') state.mass = 60;
    if (type === 'whitedwarf') state.mass = 30;
    RT.introPlaying = false;
    Gp._triggerEnding(type);
  };
})();
