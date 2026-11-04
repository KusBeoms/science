// 컷신 화면 효과 레이어 (#cine): 페이드/암전/붉은 비네팅/플래시/비/스포트라이트 램프, 반짝 입자, 말풍선(월드→화면 투영)
import {$} from '../core/util.js';
import type {BubbleKey, FxKey} from '../data/cutscene-types.js';
import {ICONS} from '../data/cutscene-icons.js';
import {iconEl} from './hud.js';

const NAMES = ['fade', 'dim', 'vig', 'flash', 'rain', 'spot'] as const;
type Ch = (typeof NAMES)[number];
const chan = Object.fromEntries(NAMES.map(n => [n, {v: 0, from: 0, to: 0, t0: 0, d: 0}])) as Record<Ch, {v: number; from: number; to: number; t0: number; d: number}>;
const HUD_OF: Record<string, string> = {apple: '#appleGauge', wanted: '#wanted', dir: '#dir'};
let clock = 0,
  shakeUntil = 0,
  shakeAmp = 0,
  slowUntil = 0,
  slowF = 1;
const bubs: {el: HTMLElement; who: string; until: number}[] = [];

/** OS 모션 감소 설정 (UX_CUTSCENE 6.3): 흔들림·플래시·팝 애니메이션 제거 */
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('rm');
function ramp(n: Ch, to: number, dur: number) {
  const c = chan[n];
  Object.assign(c, {from: c.v, to, t0: clock, d: dur});
}
export const fadeTo = (to: number, dur: number) => ramp('fade', to, dur);
export function fxTick(raw: number) {
  clock += raw;
  NAMES.forEach(n => {
    const c = chan[n];
    c.v = c.d > 0 ? c.from + (c.to - c.from) * Math.min(1, (clock - c.t0) / c.d) : c.to;
    ($('#cineFx .' + n) as HTMLElement).style.opacity = String(c.v);
  });
  for (let i = bubs.length - 1; i >= 0; i--)
    if (clock >= bubs[i].until) {
      bubs[i].el.remove();
      bubs.splice(i, 1);
    }
}
/** 현재 흔들림 진폭(모션 감소 시 0) / 컷신 시간 배속 */
export const shakeNow = () => (!reduced() && clock < shakeUntil ? shakeAmp : 0);
export const timeScale = () => (clock < slowUntil ? slowF : 1);

function sparkle(x: number, y: number) {
  for (let i = 0; i < (reduced() ? 2 : 6); i++) {
    const s = document.createElement('span');
    s.className = 'spk';
    s.textContent = '✨';
    s.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(i * 1.05) * 46}px;--dy:${Math.sin(i * 1.05) * 46}px`;
    $('#cineFx').append(s);
    setTimeout(() => s.remove(), 900);
  }
}
/** at: 배우 id → [x,y] 투영, HUD 대상('apple' 등)은 해당 요소 중심, 없으면 좌상단 */
export function runFx(k: FxKey, proj: (id: string) => [number, number] | null) {
  const amt = k.amt,
    d = k.dur ?? 0.4,
    at = k.at ? proj(k.at) || hudPos(k.at) : null;
  if (k.kind === 'fade') ramp('fade', amt ?? 1, k.dur ?? 0.3);
  else if (k.kind === 'dim') ramp('dim', amt ?? 0.4, d);
  else if (k.kind === 'vignetteRed') ramp('vig', amt ?? 1, d);
  else if (k.kind === 'rain') ramp('rain', amt ?? 1, k.dur ?? 1);
  else if (k.kind === 'flash') {
    if (reduced()) return; // 광과민: 모션 감소 시 번쩍임 생략, 상한 0.25
    Object.assign(chan.flash, {v: Math.min(amt ?? 0.2, 0.25)});
    ramp('flash', 0, 0.25);
  } else if (k.kind === 'spot') {
    if (at) {
      $('#cineFx').style.setProperty('--sx', at[0] + 'px');
      $('#cineFx').style.setProperty('--sy', at[1] + 'px');
    }
    ramp('spot', amt ?? 1, d);
  } else if (k.kind === 'sparkle') {
    const p = at || [innerWidth / 2, innerHeight / 2];
    sparkle(p[0], p[1]);
  } else if (k.kind === 'shake') {
    shakeAmp = amt ?? 1;
    shakeUntil = clock + d;
  } else if (k.kind === 'slowmo') {
    slowF = amt ?? 0.4;
    slowUntil = clock + (k.dur ?? 1);
  }
}
/** HUD 대상 id('apple'|'wanted'|'dir') 요소의 화면 중심. 아직 없는 HUD 면 좌상단 근처 */
export function hudPos(id: string): [number, number] {
  const e = document.querySelector(HUD_OF[id] || '#' + id);
  if (!e) return [70, 60];
  const r = e.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}
export function addBubble(k: BubbleKey) {
  if (bubs.length >= 3) bubs.shift()!.el.remove(); // 동시 최대 3개
  const el = document.createElement('div');
  el.className = 'bub pop-' + (k.pop || 'pop');
  el.dataset.shape = ICONS[k.icons[0]][1];
  k.icons.slice(0, 3).forEach(i => el.append(iconEl(i)));
  $('#cineBub').append(el);
  bubs.push({el, who: k.who, until: clock + k.dur});
}
/** 매 프레임: 말풍선을 배우 머리 위 화면 좌표로 이동 (proj 가 null 이면 카메라 뒤 → 숨김) */
export function placeBubbles(proj: (id: string) => [number, number] | null) {
  bubs.forEach(b => {
    const p = proj(b.who);
    b.el.style.visibility = p ? 'visible' : 'hidden';
    if (p) b.el.style.transform = `translate(${p[0]}px,${p[1]}px) translate(-50%,-100%)`;
  });
}
/** 모든 효과 초기화. black=true 면 화면은 암전 유지(건너뛰기 직후 fadeTo(0) 로 밝힌다) */
export function fxReset(black = false) {
  NAMES.forEach(n => Object.assign(chan[n], {v: 0, from: 0, to: 0, d: 0}));
  if (black) Object.assign(chan.fade, {v: 1, from: 1, to: 1});
  bubs.splice(0).forEach(b => b.el.remove());
  shakeUntil = slowUntil = 0;
  $('#cineFx')
    .querySelectorAll('.spk')
    .forEach(e => e.remove());
}
