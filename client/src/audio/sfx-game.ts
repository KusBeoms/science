// 게임 이벤트 효과음 (합성). 아이콘 1개당 소리 1개, 위험음은 저역+고역 이중 (UX_CUTSCENE 6.1)
import {coin, hz, noise, tone} from './synth.js';

type Fn = (t: number) => void;
const alert: Fn = t => {
  for (let i = 0; i < 2; i++) {
    tone(880, t + i * 0.14, 0.1, {type: 'square', vol: 0.07, lp: 2400}); // 고역
    tone(220, t + i * 0.14, 0.1, {type: 'sawtooth', vol: 0.12, lp: 500}); // 저역
  }
};
export const GAME = {
  step: t => {
    noise(t, 0.06, {vol: 0.12, lp: 500 + Math.random() * 300});
    tone(70 + Math.random() * 25, t, 0.07, {vol: 0.18});
  },
  jump: t => tone(260, t, 0.14, {to: 520, type: 'triangle', vol: 0.16}),
  /** 훔치기 성공: 상승 3음 + 반짝 */
  steal: t => {
    [72, 76, 79].forEach((n, i) => tone(hz(n), t + i * 0.07, 0.2, {type: 'triangle', vol: 0.2}));
    tone(hz(91), t + 0.22, 0.35, {vol: 0.08});
  },
  /** 기지 입고 */
  stash: t => {
    tone(hz(88), t, 0.25, {vol: 0.16});
    tone(hz(95), t + 0.06, 0.35, {vol: 0.13});
  },
  /** 판매: 금화 짤랑 */
  sell: t => [0, 1, 2, 3].forEach(i => coin(t + i * 0.06, 1900 + Math.random() * 700)),
  buy: t => {
    tone(hz(67), t, 0.1, {type: 'triangle', vol: 0.18});
    tone(hz(74), t + 0.08, 0.25, {type: 'triangle', vol: 0.18});
    coin(t + 0.16, 2400);
  },
  deny: t => {
    tone(150, t, 0.12, {type: 'square', vol: 0.08, lp: 600});
    tone(125, t + 0.14, 0.18, {type: 'square', vol: 0.08, lp: 600});
  },
  /** 퀴즈 정답: 상승 2음 */
  quizRight: t => {
    tone(hz(72), t, 0.14, {vol: 0.22});
    tone(hz(79), t + 0.1, 0.3, {vol: 0.22});
  },
  /** 퀴즈 오답: 하강 2음 */
  quizWrong: t => {
    tone(hz(62), t, 0.16, {type: 'triangle', vol: 0.22});
    tone(hz(55), t + 0.13, 0.35, {type: 'triangle', vol: 0.22});
  },
  /** 시험 통과(문 열림): 아르페지오 + 화음 */
  quizPass: t => {
    [72, 76, 79, 84].forEach((n, i) => tone(hz(n), t + i * 0.09, 0.3, {type: 'triangle', vol: 0.2}));
    [72, 76, 79].forEach(n => tone(hz(n), t + 0.4, 0.7, {vol: 0.08}));
  },
  quizFail: t => [67, 63, 58].forEach((n, i) => tone(hz(n), t + i * 0.12, 0.3, {type: 'triangle', vol: 0.2})),
  open: t => tone(420, t, 0.1, {to: 760, vol: 0.13}),
  close: t => tone(760, t, 0.1, {to: 420, vol: 0.1}),
  /** 도감 등록: 종소리 */
  dex: t => [84, 91, 96].forEach((n, i) => tone(hz(n), t + i * 0.05, 0.9, {vol: 0.12 - i * 0.02})),
  alert,
  /** 수호신 접근: 저역 스웰 + 고역 펄스 */
  danger: t => {
    tone(70, t, 0.7, {type: 'sawtooth', vol: 0.16, lp: 300, att: 0.3});
    tone(1760, t + 0.05, 0.12, {vol: 0.07});
    tone(1760, t + 0.3, 0.12, {vol: 0.07});
  },
  caught: t => {
    tone(130, t, 0.45, {to: 40, vol: 0.35});
    noise(t, 0.3, {vol: 0.25, lp: 900});
    alert(t + 0.05);
  },
  fall: t => tone(700, t, 0.6, {to: 90, type: 'triangle', vol: 0.18}),
  /** 포탈 이동: 우웅 → 쿵 */
  portal: t => {
    tone(110, t, 0.45, {to: 520, type: 'sawtooth', vol: 0.16, lp: 900, att: 0.12});
    tone(95, t + 0.3, 0.4, {to: 35, vol: 0.4});
    noise(t + 0.3, 0.25, {vol: 0.15, lp: 700});
  },
  /** 밤 전환: 느린 하강 + 먼 차임 */
  night: t => {
    tone(hz(57), t, 1.2, {type: 'triangle', vol: 0.18, att: 0.3});
    tone(hz(52), t + 0.5, 1.6, {type: 'triangle', vol: 0.18, att: 0.3});
    tone(hz(88), t + 1, 1.2, {vol: 0.06});
  },
  /** 심판 호루라기 */
  whistle: t => {
    for (let i = 0; i < 6; i++) tone(2900 + (i % 2) * 140, t + i * 0.05, 0.07, {type: 'sine', vol: 0.1});
  },
  /** 관중 함성 */
  cheer: t => {
    noise(t, 1.1, {vol: 0.16, lp: 1500});
    noise(t + 0.1, 0.8, {vol: 0.1, lp: 3000});
  },
  /** 공 차기 / 그물 */
  kick: t => {
    tone(140, t, 0.08, {to: 60, vol: 0.3});
    noise(t, 0.05, {vol: 0.12, lp: 900});
  },
  net: t => noise(t, 0.25, {vol: 0.12, lp: 2200}),
  /** 경찰 사이렌 */
  siren: t => {
    tone(700, t, 0.3, {to: 980, type: 'sawtooth', vol: 0.05, lp: 1800});
    tone(980, t + 0.3, 0.3, {to: 700, type: 'sawtooth', vol: 0.05, lp: 1800});
  },
  /** 헬기 날개 */
  chopper: t => {
    for (let i = 0; i < 4; i++) noise(t + i * 0.08, 0.05, {vol: 0.12, lp: 400});
  },
  splash: t => noise(t, 0.35, {vol: 0.16, lp: 1800}),
  bite: t => {
    tone(880, t, 0.08, {vol: 0.16});
    tone(1320, t + 0.08, 0.12, {vol: 0.16});
  },
  /** 메신저 알림 삐릭 */
  ping: t => {
    tone(hz(88), t, 0.1, {type: 'triangle', vol: 0.18});
    tone(hz(95), t + 0.09, 0.18, {type: 'triangle', vol: 0.18});
  },
  shutter: t => {
    noise(t, 0.03, {vol: 0.2, lp: 3000});
    noise(t + 0.07, 0.04, {vol: 0.2, lp: 2000});
  },
  /** 차 충돌 약: 퉁 */
  crashL: t => {
    tone(110, t, 0.12, {to: 55, vol: 0.28});
    noise(t, 0.08, {vol: 0.14, lp: 1200});
  },
  /** 차 충돌 강: 쿵 + 금속 찌그러짐 */
  crashH: t => {
    tone(90, t, 0.35, {to: 30, vol: 0.45});
    noise(t, 0.3, {vol: 0.3, lp: 1600});
    tone(520, t + 0.03, 0.18, {to: 180, type: 'square', vol: 0.07, lp: 2000});
  },
  /** 침수: 치지직 */
  sizzle: t => {
    noise(t, 0.7, {vol: 0.16, lp: 5000});
    tone(300, t, 0.6, {to: 70, type: 'sawtooth', vol: 0.08, lp: 700});
  },
  /** 엔진 꺼짐: 덜덜 하강 */
  engineOff: t => {
    for (let i = 0; i < 4; i++) tone(120 - i * 18, t + i * 0.09, 0.1, {type: 'sawtooth', vol: 0.14, lp: 400});
    tone(70, t + 0.4, 0.5, {to: 28, vol: 0.2});
  },
  moo: t => tone(120, t, 0.5, {to: 90, type: 'sawtooth', vol: 0.1, lp: 500}),
} satisfies Record<string, Fn>;
