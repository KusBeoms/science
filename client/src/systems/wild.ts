// 야생지 시스템: 풍차·간수 애니메이션, 산 정상 도전(깃발 E, 처음 오르면 보상), 물에 들어가면 느려짐.
import {S, save} from '../core/state.js';
import {G} from '../core/runtime.js';
import {dist2} from '../core/util.js';
import {SUMMIT} from '../data/wild.js';
import {SEA_Y} from '../data/world-map.js';
import {groundH} from '../core/terrain.js';
import {wildUpdate} from '../render/wild.js';
import {toast} from '../game/hud.js';
import {sfx} from '../audio/index.js';
import type {GameSystem, Interactable, Target} from '../core/types.js';

export const wildSystem: GameSystem = {
  id: 'wild',
  update(_dt, raw) {
    if (G.me && G.me.pos.z > 650) wildUpdate(raw);
  },
  /** 호수 물속은 천천히 걷는다 */
  speedMul: () => (G.me && !G.drive && groundH(G.me.pos.x, G.me.pos.z) < SEA_Y - 0.4 ? 0.6 : 1),
};
interface SummitT extends Target {
  kind: 'summit';
}
export const summitIt: Interactable<SummitT> = {
  kind: 'summit',
  tier: 0,
  find(me) {
    if (G.inside || G.drive) return null;
    const d = dist2(me.pos, SUMMIT);
    return d < 6 ? {kind: 'summit', d} : null;
  },
  info: () => '<b>🚩 정상</b>',
  prompt: () => 'E 🚩 정상 인증',
  act(_t, key) {
    if (key !== 'e') return;
    if (S.coins.summit) return toast('🏔️ 🚩 ✨');
    S.coins.summit = 1;
    S.cr += 600;
    toast('🏔️ 정상 정복! ✦ +600', 3.5);
    sfx('buy');
    save();
  },
};
