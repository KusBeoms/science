// 포탈 / 빠른 이동: 허브 패드 + 섹터 입구 패드. 섹터에 처음 들어가면 그 섹터 포탈이 열리고, 패드에서 E → 열린 포탈 목록에서 골라 이동
import {S, save} from '../core/state.js';
import {G} from '../core/runtime.js';
import {$, dist2} from '../core/util.js';
import {SECTORS} from '../data/sectors.js';
import {toast, flash} from './hud.js';
import {closeModal, openModal} from './modal.js';
import type {GameSystem, Interactable, Target} from '../core/types.js';

type PadT = Target & {id: string};
const padOn = (id: string) => id === 'hub' || !!S.portals[id];
const padName = (id: string) => {
  const i = SECTORS.findIndex(s => s.id === id);
  return i < 0 ? '🏠 기지' : `${i + 1}단계 ${SECTORS[i].icon} ${SECTORS[i].name}`;
};
/** 패드 id 로 순간이동 (들고 있는 행성은 그대로) */
export function warpTo(id: string) {
  const p = G.pads[id];
  if (!p) return;
  G.me.pos.set(p.x, 0, p.z + 3);
  G.me.vy = 0;
  flash('#7cf0ff', 0.4);
  toast(`🌀 ${padName(id)}`);
}
export function openPortal(from: string) {
  const list = $('#plist');
  list.innerHTML = '';
  ['hub', ...SECTORS.map(s => s.id)].filter(padOn).forEach(id => {
    const b = document.createElement('button');
    b.textContent = padName(id) + (id === from ? ' (여기)' : '');
    b.disabled = id === from;
    b.onclick = () => {
      closeModal();
      warpTo(id);
    };
    list.append(b);
  });
  $('#px').onclick = closeModal;
  openModal('portal');
}
export const portalIt: Interactable<PadT> = {
  kind: 'portal',
  tier: 1,
  find(me) {
    let best: PadT | null = null;
    Object.keys(G.pads).forEach(id => {
      if (!padOn(id)) return;
      const d = dist2(me.pos, G.pads[id]);
      if (d < 4 && (!best || d < best.d)) best = {kind: 'portal', d, id};
    });
    return best;
  },
  info: t => `<b>🌀 포탈 · ${padName(t.id)}</b><br>열린 포탈로 순간이동한다 (섹터에 처음 들어가면 그곳 포탈이 열린다)`,
  prompt: () => 'E 포탈 열기',
  act(t, key) {
    if (key === 'e') openPortal(t.id);
  },
  click(pk) {
    if (padOn(pk.id) && dist2(G.me.pos, G.pads[pk.id]) < 7) openPortal(pk.id);
    else toast('포탈에 더 가까이 가세요');
  },
};
export const portalSystem: GameSystem = {
  id: 'portal',
  update(_dt, raw) {
    Object.keys(G.pads).forEach(id => {
      const g = G.pads[id].grp;
      g.visible = padOn(id);
      if (g.visible) g.userData.ring.rotation.z += raw * 1.5;
    });
  },
  onSectorEnter(s) {
    if (S.portals[s.id] || !S.unlocked[s.id]) return;
    S.portals[s.id] = 1;
    toast(`🌀 ${s.name} 포탈이 열렸다 — 기지 포탈에서 바로 올 수 있다`, 3);
    save();
  },
};
