// W5 상점 거리 공용 UI 부품: 패널(#shop2) 열기, 카드 버튼, 결제. 글은 최소 — 아이콘 + ✦ 가격.
import {S, save} from '../core/state.js';
import {G} from '../core/runtime.js';
import {$, fmt} from '../core/util.js';
import {openModal, closeModal} from './modal.js';
import {toast} from './hud.js';
import {sfx} from '../audio/index.js';

export interface Panel {
  title: HTMLElement;
  tabs: HTMLElement;
  hint: HTMLElement;
  grid: HTMLElement;
}
/** #shop2 오버레이를 (없으면 만들어) 열고 비운 요소들을 돌려준다 */
export function openPanel(): Panel {
  let el = document.getElementById('shop2');
  if (!el) {
    el = document.createElement('div');
    el.className = 'hud ov';
    el.id = 'shop2';
    el.innerHTML =
      '<div class="card"><div class="row"><b id="s2t"></b><button id="s2x">✕</button></div><div class="ctabs" id="s2tabs"></div>' +
      '<div id="s2hint" style="font-size:12px;color:var(--dim);margin:6px 0"></div><div class="cgrid" id="s2grid"></div></div>';
    document.body.appendChild(el);
  }
  if (G.modal !== 'shop2') openModal('shop2');
  $('#s2x').onclick = () => closeModal();
  const p: Panel = {title: $('#s2t'), tabs: $('#s2tabs'), hint: $('#s2hint'), grid: $('#s2grid')};
  p.tabs.innerHTML = '';
  p.grid.innerHTML = '';
  p.hint.textContent = '';
  return p;
}

export const crHead = (icon: string) => `${icon} <span style="color:var(--acc)">✦ ${fmt(S.cr)}</span>`;
/** 카드 버튼. locked = 살 수 없음(흐림) */
export function card(html: string, fn: () => void, cls = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'it ' + cls;
  b.innerHTML = html;
  b.onclick = fn;
  return b;
}
export const big = (s: string) => `<div style="font-size:28px">${s}</div>`;
/** 결제: 돈이 모자라면 false */
export function pay(cost: number): boolean {
  if (S.cr < cost) {
    toast('코인이 부족합니다');
    sfx('deny');
    return false;
  }
  S.cr -= cost;
  sfx('buy');
  return true;
}
export const commit = () => save();
