// 공용 인터페이스
export interface Planet {
  id: number;
  name: string;
  grp: string;
  M: number;
  R: number;
  t: number;
  price: number;
  c1: string;
  c2: string;
  fact: string;
  fx: string;
  g: number;
  ve: number;
  inc: number;
}
export interface Zone {
  n: string;
  ic: string;
  gs: number;
  col: string[];
  gc: number;
  pool: number[];
  x: number;
  z: number;
}
/** 기지 슬롯에 놓인 행성 */
export interface Owned {
  id: number;
  mut: number;
  left: number;
  st: number;
}
/** 들고 있는 행성 (z=구역, k=둥지 번호, st=문제를 맞혀 얻음) */
export interface Carry {
  id: number;
  z: number;
  k: number;
  st: number;
}
export interface SaveState {
  cr: number;
  slots: number;
  spd: number;
  base: (Owned | null)[];
  dex: Record<number, number>;
  mi: number;
  stolen: number;
  correct: number;
  bought: number;
  zone: number;
  springs: number[];
  eq: number;
  bag: number;
  deco: Record<string, number>;
  look: Record<string, number>;
  own: Record<string, number>;
  notes: Record<number, number>;
  ver: number;
  chapter: number;
  wanted: number;
  vehicle: number;
  ach: Record<string, number>;
  coins: Record<string, number>;
  playSec: number;
}
export interface StarDef {
  n: string;
  bh?: number;
  c: number[];
  R: number;
  orb: number;
}
export interface Star extends StarDef {
  x: number;
  z: number;
  rad: number;
}
export interface OrbitItem {
  kind: 'orbit';
  s: number;
  r: number;
  a: number;
  w: number;
  x: number;
  z: number;
}
export interface SoloItem {
  kind: 'solo';
  x: number;
  z: number;
}
export type LayItem = OrbitItem | SoloItem;
export interface Layout {
  stars: Star[];
  items: LayItem[];
}
export interface Nest {
  t: number[];
  cd: number[];
  s: number[];
}
export type Pick =
  {kind: 'nest'; z: number; k: number} | {kind: 'base'; i: number} | {kind: 'npc'} | {kind: 'gate'; i: number};
export type Target =
  | {kind: 'nest'; z: number; k: number; id: number}
  | {kind: 'base'; i: number; id: number}
  | {kind: 'npc'}
  | {kind: 'gate'; i: number};
export interface QuizQ {
  q: string;
  opts: {t: string; ok: boolean}[];
  why: string;
}
export interface QuizCtx {
  title: string;
  qs: string[][];
  need: number;
  onDone: (ok: boolean) => void;
  i: number;
  right: number;
  done: boolean;
  cur?: QuizQ;
  answered?: boolean;
}
