// 컷신 소리 큐 (UX_CUTSCENE 1장 '소리' 열). 월드 덕킹을 받지 않고 sfx 버스로 직행한다
import {coin, hz, noise, tone} from './synth.js';

type Fn = (t: number) => void;
export const CUE = {
  /** 💗 뿅: 3음 상승 */
  heart: t => [76, 81, 88].forEach((n, i) => tone(hz(n), t + i * 0.12, 0.3, {to: hz(n + 1), vol: 0.2})),
  /** 금화 흡수 "칭" */
  coin: t => coin(t, 2400),
  /** 금화 폭포 (약 4초) */
  coinFall: t => {
    for (let i = 0; i < 36; i++) coin(t + Math.random() * 4 * (i / 36 + 0.3), 1800 + Math.random() * 1200);
  },
  /** ❗ 띠링 */
  ping: t => {
    tone(hz(88), t, 0.4, {vol: 0.18});
    tone(hz(95), t + 0.12, 0.6, {vol: 0.18});
  },
  /** "슉": 피치 하강 */
  whoosh: t => {
    noise(t, 0.35, {vol: 0.18, bp: 2400, to: 400, att: 0.05});
    tone(900, t, 0.3, {to: 200, vol: 0.08});
  },
  gulp: t => {
    tone(300, t, 0.12, {to: 120, vol: 0.25});
    tone(260, t + 0.16, 0.14, {to: 100, vol: 0.25});
  },
  /** 금화 음 상승 아르페지오 */
  arpeggio: t => [72, 76, 79, 84, 88, 91].forEach((n, i) => tone(hz(n), t + i * 0.08, 0.35, {type: 'triangle', vol: 0.16})),
  /** 짧은 팡파르 */
  fanfare: t => {
    [72, 72, 76, 79].forEach((n, i) => tone(hz(n), t + i * 0.13, 0.25, {type: 'sawtooth', vol: 0.1, lp: 1800}));
    [72, 76, 79, 84].forEach(n => tone(hz(n), t + 0.55, 0.8, {type: 'sawtooth', vol: 0.07, lp: 1500}));
  },
  /** 쿵 */
  boom: t => {
    tone(100, t, 0.6, {to: 32, vol: 0.45});
    noise(t, 0.4, {vol: 0.25, lp: 400});
  },
  /** 포효 (저음 노이즈) */
  roar: t => {
    noise(t, 1.2, {vol: 0.3, lp: 350, att: 0.3});
    tone(55, t, 1.2, {type: 'sawtooth', vol: 0.18, lp: 200, att: 0.3});
  },
  /** 저음 드론 스웰 */
  swell: t => tone(55, t, 2.2, {type: 'sawtooth', vol: 0.2, lp: 260, att: 1.2}),
  wind: t => noise(t, 1.8, {vol: 0.12, bp: 400, to: 900, att: 0.7}),
  /** 둔탁한 "푹" */
  thud: t => {
    tone(80, t, 0.25, {to: 40, vol: 0.4});
    noise(t, 0.18, {vol: 0.15, lp: 250});
  },
  /** 유리 금 가는 소리 */
  crack: t => {
    for (let i = 0; i < 6; i++) noise(t + i * 0.1 + Math.random() * 0.08, 0.05, {vol: 0.1, hp: 4000});
    tone(3200, t, 0.6, {to: 2400, vol: 0.04});
  },
  /** 결의 스팅어 (D 단조 저음 화음) */
  stinger: t => [38, 45, 50, 53].forEach(n => tone(hz(n), t, 1, {type: 'sawtooth', vol: 0.09, lp: 700, att: 0.06})),
  /** 낮은 한숨 */
  sigh: t => noise(t, 1, {vol: 0.1, bp: 500, to: 250, att: 0.35}),
  /** 반짝 차임 */
  chime: t => {
    tone(hz(96), t, 0.5, {vol: 0.1});
    tone(hz(103), t + 0.08, 0.6, {vol: 0.08});
  },
  /** 단 1회 "탁/툭" */
  tick: t => tone(700, t, 0.05, {type: 'square', vol: 0.1, lp: 1500}),
  /** "팅" */
  ting: t => tone(hz(96), t, 0.35, {vol: 0.16}),
  /** "딩" 체크 */
  ding: t => tone(hz(88), t, 0.5, {vol: 0.18}),
  /** "쨍" 금속 스팅어 */
  clang: t => {
    tone(1180, t, 0.5, {type: 'square', vol: 0.06, lp: 4000});
    tone(1930, t, 0.4, {type: 'square', vol: 0.05, lp: 4000});
    noise(t, 0.12, {vol: 0.12, hp: 3000});
  },
  /** 상인 "오오" 허밍 */
  hum: t => [57, 60].forEach((n, i) => tone(hz(n), t + i * 0.25, 0.5, {type: 'triangle', vol: 0.12, lp: 600, att: 0.12})),
  /** 안도 코드 */
  relief: t => [60, 64, 67, 72].forEach(n => tone(hz(n), t, 1.4, {vol: 0.1, att: 0.15})),
  /** 상승음 */
  rise: t => tone(300, t, 0.5, {to: 900, type: 'triangle', vol: 0.15}),
  /** 포탈 충전 "우웅" */
  portalCharge: t => tone(90, t, 1.2, {to: 420, type: 'sawtooth', vol: 0.15, lp: 800, att: 0.5}),
} satisfies Record<string, Fn>;
