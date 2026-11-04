// 범용 유틸
export const $ = (s: string) => document.querySelector(s) as HTMLElement;
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const fmt = (n: number) =>
  n >= 999500
    ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'
    : n >= 1e4
      ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K'
      : Math.floor(n) + '';
export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const dist2 = (a: {x: number; z: number}, b: {x: number; z: number}) => Math.hypot(a.x - b.x, a.z - b.z);
/** 값이 바뀔 때만 textContent 를 갱신 (요소 캐시) */
type Cached = HTMLElement & {_v?: string};
const EL: Record<string, Cached> = {};
export const setTxt = (sel: string, v: string) => {
  const e = EL[sel] || (EL[sel] = $(sel));
  if (e._v !== v) {
    e._v = v;
    e.textContent = v;
  }
};
