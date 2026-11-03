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

  // 웅장한 울림: 살짝 어긋난 오실레이터 여러 겹이 천천히 차올랐다 길게 사라진다.
  // 로우패스 필터가 열리며 밝아지고, 짧은 에코가 공간감을 더한다.
  Gp._audioPlayChord = function (this: AudioAPI, freqs: number[], dur: number, gainVal?: number, type?: OscillatorType) {
    if (!this.actx) return;
    const a = this.actx, t0 = a.currentTime;
    const peak = gainVal !== undefined ? gainVal : 0.07;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const lp = a.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t0);
    lp.frequency.exponentialRampToValueAtTime(2600, t0 + dur * 0.4);
    lp.frequency.exponentialRampToValueAtTime(500, t0 + dur);
    const echo = a.createDelay(0.5); echo.delayTime.value = 0.23;
    const fb = a.createGain(); fb.gain.value = 0.35;
    echo.connect(fb); fb.connect(echo);
    lp.connect(g); g.connect(this.masterGain!);
    g.connect(echo); echo.connect(this.masterGain!);
    for (const f of freqs) {
      for (const detune of [-7, 7]) {
        const o = a.createOscillator(); o.type = type || 'sawtooth';
        o.frequency.value = f; o.detune.value = detune;
        o.connect(lp); o.start(t0); o.stop(t0 + dur + 0.1);
      }
    }
  };

  // 묵직한 충격: 내려앉는 저음 + 낮게 걸러낸 노이즈 폭발.
  Gp._audioPlayBoom = function (this: AudioAPI, gainVal?: number, dur?: number) {
    if (!this.actx) return;
    const a = this.actx, t0 = a.currentTime, d = dur || 1.6, peak = gainVal !== undefined ? gainVal : 0.5;
    const o = a.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(110, t0);
    o.frequency.exponentialRampToValueAtTime(28, t0 + d * 0.8);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(this.masterGain!);
    o.start(t0); o.stop(t0 + d + 0.05);
    const n = Math.floor(a.sampleRate * d * 0.6);
    const buf = a.createBuffer(1, n, a.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = a.createBufferSource(); src.buffer = buf;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t0); lp.frequency.exponentialRampToValueAtTime(80, t0 + d * 0.6);
    const ng = a.createGain(); ng.gain.value = peak * 0.7;
    src.connect(lp); lp.connect(ng); ng.connect(this.masterGain!);
    src.start(t0);
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
