/* Web Audio 오실레이터 기반 SFX 합성 (외부 오디오 파일 없음) — 드론/톤/스윕/노이즈 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  Gp._audioInit = function (this: AudioAPI) {
    if (this.actx) return;
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.actx = new AC();
    this.masterGain = this.actx!.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.actx!.destination);
    Gp._audioStartDrone.call(this);
  };

  Gp._audioStartDrone = function (this: AudioAPI) {
    const actx = this.actx!;
    const o1 = actx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
    const o2 = actx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 82.4;
    const g = actx.createGain(); g.gain.value = 0.05;
    const lfo = actx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = actx.createGain(); lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    o1.connect(g); o2.connect(g); g.connect(this.masterGain!);
    o1.start(); o2.start(); lfo.start();
    this.droneNodes = { o1, o2, lfo, g };
  };

  Gp._audioPlayTone = function (
    this: AudioAPI,
    freq: number, dur: number, type?: OscillatorType, gainVal?: number, delay?: number
  ): OscillatorNode | undefined {
    if (!this.actx) return undefined;
    delay = delay || 0;
    const t0 = this.actx.currentTime + delay;
    const o = this.actx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    const g = this.actx.createGain(); g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gainVal !== undefined ? gainVal : 0.2, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.masterGain!);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  };

  Gp._audioPlaySweep = function (this: AudioAPI, f0: number, f1: number, dur: number) {
    if (!this.actx) return;
    const t0 = this.actx.currentTime;
    const o = this.actx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = this.actx.createGain(); g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(0.12, t0 + dur * 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.masterGain!);
    o.start(t0); o.stop(t0 + dur + 0.05);
  };

  Gp._audioPlayNoiseBurst = function (this: AudioAPI, dur: number, gainVal?: number) {
    if (!this.actx) return;
    const bufSize = this.actx.sampleRate * dur;
    const buf = this.actx.createBuffer(1, bufSize, this.actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = this.actx.createBufferSource(); src.buffer = buf;
    const g = this.actx.createGain(); g.gain.value = gainVal !== undefined ? gainVal : 0.35;
    src.connect(g); g.connect(this.masterGain!);
    src.start();
  };
})();
