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
    document.body.classList.add('inGame');
    document.getElementById('credits')!.classList.remove('show');
    G.resetState();
    G.Render.resetSurfaces();
    Gp._hudResetGauge();
    state.started = true; state.gameOver = false; state.hasFusion = true;
    state.distanceLy = 6 + Math.random() * 5;
    state.ageYears = state.distanceLy / G.SPEED;
    state.mass = 3 + Math.random() * 25;
    state.volume = 30 + Math.random() * 60;
    G.Effects.reset(); G.Nebula.reset(); G.Run.reset();
    state.steps = 20 + Math.floor(Math.random() * 60); state.peakMass = state.mass;
    state.pressCount = 30 + Math.floor(Math.random() * 200);
    state.burstPresses = Math.floor(state.pressCount * Math.random());
    state.playTime = 60 + Math.random() * 60;
    state.absorbedClouds = Math.floor(state.pressCount * 0.9);
    state.gravity = 1 + Math.random() * 5;
    for (const id of ['disk', 'molecular', 'runaway', 'wind', 'gasgiant']) state.effectLog.push({ id, name: id, icon: '✦' });
    const type = DEBUG_ORDER[n - 1];
    if (type === 'friends') { state.hasCompanion = true; state.companionAlive = true; state.mass = 3; }
    if (type === 'spider') { state.hasCompanion = true; state.companionAlive = false; state.staysBound = true; }
    if (type === 'merge') { state.hasCompanion = true; state.mergeFlag = true; state.companionAlive = false; }
    if (type === 'collision') { state.hasCompanion = true; state.collisionFlag = true; }
    if (type === 'blackhole') state.mass = 25;
    if (type === 'supernova') state.mass = 12;
    if (type === 'whitedwarf') state.mass = 3;
    RT.introPlaying = false;
    Gp._triggerEnding(type);
  };
})();
