// 실내 어둡기 계수 (W8 INTERIOR): 건물 안에 있으면 바깥(하늘·반구광·태양·안개)을 부드럽게 어둡게, 나오면 되돌린다.
// 소비: render/sky.ts updateSky 가 매 프레임 `dimTint(tint, stepInteriorDark(dt))` 를 쓴다. 설정: 온사이트 스트리머가 setInteriorDarkTarget(0|1).
// 실내 표면은 조명을 받지 않는 재질(render/interior-onsite.ts)이라 이 계수에 영향을 받지 않는다 — 바깥만 어두워진다.
import type {Tint} from './lowpoly/palette.js';

const TAU = 0.35; // 시정수(초)
let target = 0, cur = 0;
export const setInteriorDarkTarget = (k: number): void => { target = k < 0 ? 0 : k > 1 ? 1 : k; };
export const interiorDarkTarget = (): number => target;
/** 현재 어둡기 0(밝음)~1(가장 어두움) */
export const interiorDark = (): number => cur;
/** 매 프레임 한 번: 목표로 지수 접근하고 현재 값을 돌려준다 */
export function stepInteriorDark(dt: number): number {
  const d = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  cur += (target - cur) * (1 - Math.exp(-d / TAU));
  if (Math.abs(target - cur) < 0.002) cur = target;
  return cur;
}
/** 테스트용: 즉시 값 지정 */
export function resetInteriorDark(v = 0): void { target = cur = v; }

const scale = (hex: number, f: number): number => {
  const r = Math.round(((hex >> 16) & 255) * f), g = Math.round(((hex >> 8) & 255) * f), b = Math.round((hex & 255) * f);
  return (r << 16) | (g << 8) | b;
};
const scratch: Tint = {sky: 0, fog: 0, hemiSky: 0, hemiGround: 0, sun: 0, hemiK: 0, sunK: 0};
/** 틴트를 k 만큼 어둡게(k≈0 이면 원본 그대로). 반환 객체는 재사용되므로 보관하지 말 것 */
export function dimTint(t: Tint, k: number): Tint {
  if (k < 0.002) return t;
  const c = 1 - 0.6 * k;
  scratch.sky = scale(t.sky, c);
  scratch.fog = scale(t.fog, c);
  scratch.hemiSky = scale(t.hemiSky, c);
  scratch.hemiGround = scale(t.hemiGround, c);
  scratch.sun = scale(t.sun, 1 - 0.5 * k);
  scratch.hemiK = t.hemiK * (1 - 0.5 * k);
  scratch.sunK = t.sunK * (1 - 0.75 * k);
  return scratch;
}
