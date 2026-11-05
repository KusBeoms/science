// FC 온라인풍 축구 공용 상태·타입. 7대7(골키퍼+6), 파란팀(team 0, 사람)은 동쪽(+x) 골대를 공격, 빨간팀(team 1, AI)은 서쪽. 카메라는 남쪽 중계석이라 화면 오른쪽 = +x, 위 = −z.
import {PITCH} from '../data/soccer.js';

export const {cx, cz, hl, hw, goalHalf: GH, goalDepth: GD} = PITCH;
export const BR = 0.9;
export type Role = 'GK' | 'LB' | 'RB' | 'CM' | 'LW' | 'RW' | 'ST';
export interface Pl {
  m: any;
  team: 0 | 1;
  role: Role;
  /** 홈 위치: u = 자기 골(0) ~ 상대 골(1), v = −1~1 좌우 */
  u: number;
  v: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** 바라보는 각 (forward = (sin, cos)) */
  ry: number;
  stam: number;
  cd: number;
  /** 쓰러짐·슬라이딩 남은 시간 */
  down: number;
  slide: number;
  tackleCd: number;
  think: number;
  sprint: boolean;
  shield: boolean;
  yellow: number;
  off: boolean;
  /** GK 다이빙 */
  dive: number;
  hold: number;
  /** AI 가 노리는 점 */
  tx: number;
  tz: number;
}
export interface Ball {
  m: any;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  owner: Pl | null;
  last: Pl | null;
  spin: number;
  /** 마지막 패스를 한 팀과 패스 시점 오프사이드 후보 */
  passTeam: -1 | 0 | 1;
  offsideSet: Pl[];
  offsideT: number;
}
export type Phase = 'kickoff' | 'play' | 'goal' | 'restart' | 'foul' | 'half' | 'end';
export type RestartKind = 'kickoff' | 'throw' | 'goalkick' | 'corner' | 'free' | 'penalty' | 'indirect';
export interface Restart {
  kind: RestartKind;
  team: 0 | 1;
  x: number;
  z: number;
  taker: Pl;
  wait: number;
}
export interface Match {
  t: number;
  half: 1 | 2;
  score: [number, number];
  phase: Phase;
  pause: number;
  pls: Pl[];
  ctl: Pl;
  restart: Restart | null;
  ref: {m: any; x: number; z: number};
  cards: [[number, number], [number, number]]; // [팀][노랑, 빨강]
  fouls: [number, number];
  shots: [number, number];
  poss: [number, number];
  marker: any;
  prevCam: number;
  prevPitch: number;
  hint: string;
  hintT: number;
}
export const ball: Ball = {m: null, x: cx, y: BR, z: cz, vx: 0, vy: 0, vz: 0, owner: null, last: null, spin: 0, passTeam: -1, offsideSet: [], offsideT: 0};
export let M: Match | null = null;
export const setMatch = (m: Match | null) => (M = m);
export const dir = (t: 0 | 1) => (t === 0 ? 1 : -1);
/** t 팀이 공격하는 골 라인 x / 지키는 골 라인 x */
export const atkX = (t: 0 | 1) => cx + dir(t) * hl;
export const defX = (t: 0 | 1) => cx - dir(t) * hl;
export const dist = (a: {x: number; z: number}, b: {x: number; z: number}) => Math.hypot(a.x - b.x, a.z - b.z);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** 골 점(상대 골 중앙) 까지 */
export const toGoal = (p: Pl) => Math.abs(atkX(p.team) - p.x);
export const inBox = (x: number, z: number, defending: 0 | 1) => Math.abs(x - defX(defending)) < 16.5 && Math.abs(z - cz) < 20.16;
