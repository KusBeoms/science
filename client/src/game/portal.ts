// 포탈 상호작용: 도시 포탈 광장(허브 패드·12 기둥 구역) + 각 섹터 섬의 입구 패드. E → 우주 지도(game/portal-map.ts)
// 섬은 도시와 걸어서 이어지지 않으므로 이동은 포탈뿐이다. 도착한 섹터는 S.portals 에 기록(기존 세이브 키 그대로).
import {S, save} from '../core/state.js';
import {G} from '../core/runtime.js';
import {dist2} from '../core/util.js';
import {inPlaza, PLAZA} from '../core/plaza.js';
import {toast} from './hud.js';
import {updatePlaza} from '../render/plaza.js';
import {openStarMap} from './portal-map.js';
import type {GameSystem, Interactable, Target} from '../core/types.js';

export {warpTo} from './portal-map.js';
type PadT = Target & {id: string};
/** 패드가 보이는/쓸 수 있는 조건: 허브는 항상, 섹터 패드는 해금(또는 예전에 연) 뒤 */
const padOn = (id: string) => id === 'hub' || !!S.portals[id] || !!S.unlocked[id];
export const openPortal = (from: string) => openStarMap(from);

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
    // 광장 어디서든(기둥 앞 포함) 허브 패드로 본다
    if (!best && !G.inside && inPlaza(me.pos.x, me.pos.z)) best = {kind: 'portal', d: dist2(me.pos, PLAZA) + 3, id: 'hub'};
    return best;
  },
  info: () => '<b>포탈</b><br>우주 지도를 열어 다른 구역으로 이동합니다',
  prompt: () => 'E 우주 지도 열기',
  act(t, key) {
    if (key === 'e') openStarMap(t.id);
  },
  click(pk) {
    const near = dist2(G.me.pos, G.pads[pk.id]) < 7 || (pk.id === 'hub' && inPlaza(G.me.pos.x, G.me.pos.z));
    if (padOn(pk.id) && near) openStarMap(pk.id);
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
    updatePlaza(performance.now() / 1000);
  },
  onSectorEnter(s) {
    if (S.portals[s.id] || !S.unlocked[s.id]) return;
    S.portals[s.id] = 1;
    save();
  },
};
