// 컷신 키프레임 보간 헬퍼: 키 배열(시각순)에서 t 시점의 값을 읽는다
import type {Ease, Vec3} from '../data/cutscene-types.js';

export const EASE: Record<Ease, (x: number) => number> = {
  linear: x => x,
  in: x => x * x,
  out: x => 1 - (1 - x) ** 2,
  inOut: x => (x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) ** 2),
  back: x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
};
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const lerp3 = (a: Vec3, b: Vec3, u: number): Vec3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
export const sortKf = <K extends {t: number}>(kf: K[]): K[] => kf.slice().sort((a, b) => a.t - b.t);

type K = {t: number; ease?: Ease; cut?: boolean; [f: string]: any};
/** 필드 f 를 가진 키 중 t 를 둘러싼 (a 이전, b 이후). b.cut 이면 보간 없이 a 를 유지(u=0) */
function span(kf: K[], t: number, f: string) {
  let a: K | undefined, b: K | undefined;
  for (const k of kf) {
    if (k[f] === undefined) continue;
    if (k.t <= t) a = k;
    else {
      b = k;
      break;
    }
  }
  return {a, b, u: a && b && !b.cut ? EASE[b.ease || 'linear']((t - a.t) / (b.t - a.t)) : 0};
}
/** 숫자 필드 보간 (정의된 키가 없으면 undefined, 첫 키 이전이면 첫 값 유지) */
export function num(kf: K[], t: number, f: string): number | undefined {
  const {a, b, u} = span(kf, t, f);
  return a ? (b && u ? lerp(a[f], b[f], u) : a[f]) : b?.[f];
}
export function vec(kf: K[], t: number, f: string): Vec3 | undefined {
  const {a, b, u} = span(kf, t, f);
  return a ? (b && u ? lerp3(a[f], b[f], u) : a[f]) : b?.[f];
}
/** 계단식 필드(anim·visible·follow): t 이전의 마지막 값 */
export function step<T = any>(kf: K[], t: number, f: string): T | undefined {
  let v: T | undefined;
  for (const k of kf) if (k.t <= t && k[f] !== undefined) v = k[f];
  return v;
}
