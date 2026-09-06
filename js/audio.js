/* Web Audio 오실레이터 기반 사운드 합성 (외부 오디오 파일 없음) */
(function(){
"use strict";
const Game = window.Game = window.Game || {};

const Audio_ = {
  actx:null, masterGain:null, droneNodes:null, muted:false,

  init(){
    if (this.actx) return;
    this.actx = new (window.AudioContext||window.webkitAudioContext)();
    this.masterGain = this.actx.createGain();
    this.masterGain.gain.value = .5;
    this.masterGain.connect(this.actx.destination);
    this.startDrone();
  },

  startDrone(){
    const actx = this.actx;
    const o1 = actx.createOscillator(); o1.type='sine'; o1.frequency.value=55;
    const o2 = actx.createOscillator(); o2.type='sine'; o2.frequency.value=82.4;
    const g = actx.createGain(); g.gain.value=.05;
    const lfo = actx.createOscillator(); lfo.frequency.value=.07;
    const lfoGain = actx.createGain(); lfoGain.gain.value=.025;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    o1.connect(g); o2.connect(g); g.connect(this.masterGain);
    o1.start(); o2.start(); lfo.start();
    this.droneNodes = {o1,o2,lfo,g};
  },

  playTone(freq, dur, type, gainVal, delay){
    if (!this.actx) return;
    delay = delay||0;
    const t0 = this.actx.currentTime + delay;
    const o = this.actx.createOscillator(); o.type=type||'sine'; o.frequency.setValueAtTime(freq,t0);
    const g = this.actx.createGain(); g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(gainVal!==undefined?gainVal:.2, t0+.02);
    g.gain.exponentialRampToValueAtTime(.0001, t0+dur);
    o.connect(g); g.connect(this.masterGain);
    o.start(t0); o.stop(t0+dur+.05);
    return o;
  },

  playSweep(f0,f1,dur){
    if (!this.actx) return;
    const t0 = this.actx.currentTime;
    const o = this.actx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(f0,t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    const g = this.actx.createGain(); g.gain.setValueAtTime(.001,t0);
    g.gain.linearRampToValueAtTime(.12,t0+dur*.15);
    g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    o.connect(g); g.connect(this.masterGain);
    o.start(t0); o.stop(t0+dur+.05);
  },

  playNoiseBurst(dur, gainVal){
    if (!this.actx) return;
    const bufSize = this.actx.sampleRate*dur;
    const buf = this.actx.createBuffer(1,bufSize,this.actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<bufSize;i++) d[i] = (Math.random()*2-1) * (1-i/bufSize);
    const src = this.actx.createBufferSource(); src.buffer=buf;
    const g = this.actx.createGain(); g.gain.value = gainVal!==undefined?gainVal:.35;
    src.connect(g); g.connect(this.masterGain);
    src.start();
  }
};

Game.Audio = Audio_;

document.getElementById('muteBtn').addEventListener('click', ()=>{
  if (!Audio_.actx) return;
  Audio_.muted = !Audio_.muted;
  Audio_.masterGain.gain.value = Audio_.muted?0:.5;
  document.getElementById('muteBtn').textContent = Audio_.muted?'✕':'♪';
});

})();
