// 절차적 BGM: 허브(밝고 느림) / 긴장(드론+심박) / 엔딩(느린 패드+빗소리). 8분음표 단위 룩어헤드 스케줄러, 1초 크로스페이드
import {audioCtx, bus, onReady} from './ctx.js';
import {hz, noiseBuf, tone} from './synth.js';

export type BgmMood = 'hub' | 'tense' | 'ending';
interface Mood {
  bpm: number;
  /** 연속음 시작 (정지 함수 반환) */
  start?(ac: AudioContext, out: GainNode): () => void;
  /** 8분음표 i 번째 */
  step(i: number, t: number, out: GainNode): void;
}
const PENTA = [0, 2, 4, 7, 9],
  HUB_ROOTS = [48, 45, 53, 55]; // C Am F G
const MOODS: Record<BgmMood, Mood> = {
  hub: {
    bpm: 76,
    step(i, t, out) {
      const bar = Math.floor(i / 8) % 4,
        r = HUB_ROOTS[bar];
      if (i % 8 === 0) [0, 4, 7].forEach(d => tone(hz(r + d + 12), t, 3.2, {vol: 0.05, att: 0.8, out}));
      if (i % 4 === 0) tone(hz(r - 12), t, 0.5, {type: 'triangle', vol: 0.08, out});
      if (i % 2 === 1 && Math.random() < 0.45)
        tone(hz(r + 24 + PENTA[Math.floor(Math.random() * 5)]), t, 0.5, {type: 'triangle', vol: 0.05, out});
    },
  },
  tense: {
    bpm: 200, // 8분음표 단위 → 심박 약 100bpm
    start(ac, out) {
      const o = ac.createOscillator(),
        f = ac.createBiquadFilter(),
        g = ac.createGain();
      o.type = 'sawtooth';
      o.frequency.value = hz(33);
      f.frequency.value = 160;
      g.gain.value = 0.07;
      o.connect(f).connect(g).connect(out);
      o.start();
      return () => o.stop();
    },
    step(i, t, out) {
      const b = i % 4;
      if (b === 0 || b === 2) tone(62, t + (b ? 0.1 : 0), 0.18, {to: 40, vol: b ? 0.22 : 0.3, out}); // 쿵-쿵
      if (i % 16 === 11) tone(hz(81), t, 0.25, {vol: 0.03, out}); // 드문 높은 핑
    },
  },
  ending: {
    bpm: 90,
    start(ac, out) {
      const s = ac.createBufferSource(),
        f = ac.createBiquadFilter(),
        g = ac.createGain();
      s.buffer = noiseBuf(ac);
      s.loop = true;
      f.type = 'bandpass';
      f.frequency.value = 3000;
      g.gain.value = 0.1;
      s.connect(f).connect(g).connect(out);
      s.start();
      return () => s.stop();
    },
    step(i, t, out) {
      if (i % 24 === 0) [50, 57, 62].forEach(n => tone(hz(n), t, 6, {vol: 0.04, att: 2, out})); // D 단조 패드
      if (i % 12 === 6) tone(hz(74 + PENTA[(i / 12) % 5 | 0]), t, 1.4, {vol: 0.035, out});
    },
  },
};
interface Run {
  mood: BgmMood;
  out: GainNode;
  stop?: () => void;
  i: number;
  next: number;
}
let cur: Run | null = null,
  want: BgmMood | null = null,
  timer = 0;
function pump() {
  const ac = audioCtx();
  if (!ac || !cur) return;
  const m = MOODS[cur.mood];
  if (cur.next < ac.currentTime - 0.5) cur.next = ac.currentTime; // 백그라운드 스로틀 뒤 몰아치기 방지
  while (cur.next < ac.currentTime + 0.3) {
    m.step(cur.i++, cur.next, cur.out);
    cur.next += 30 / m.bpm;
  }
}
function fadeOut(r: Run, ac: AudioContext, sec: number) {
  r.out.gain.setTargetAtTime(0, ac.currentTime, sec / 4);
  setTimeout(() => {
    if (r.stop) r.stop();
    r.out.disconnect();
  }, sec * 1000 + 300);
}
/** 분위기 전환 (null = 정지). 컨텍스트가 켜지기 전이면 켜진 뒤 시작 */
export function playBgm(mood: BgmMood | null) {
  want = mood;
  onReady(() => {
    const ac = audioCtx()!;
    if (want === (cur ? cur.mood : null)) return;
    if (cur) fadeOut(cur, ac, 1);
    cur = null;
    if (!want) return clearInterval(timer);
    const out = ac.createGain();
    out.gain.setValueAtTime(0, ac.currentTime);
    out.gain.linearRampToValueAtTime(1, ac.currentTime + 1);
    out.connect(bus.bgm);
    cur = {mood: want, out, i: 0, next: ac.currentTime + 0.05};
    const st = MOODS[want].start;
    if (st) cur.stop = st(ac, out);
    clearInterval(timer);
    timer = window.setInterval(pump, 100);
    pump();
  });
}
