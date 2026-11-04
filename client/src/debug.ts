// QA 디버그 훅: URL 에 ?debug=1 일 때만 window.__game 을 노출한다 (평소엔 아무것도 하지 않음)
import {S, save} from './core/state.js';
import {G} from './core/runtime.js';
import {padPos} from './core/geometry.js';
import {unlockSector} from './core/progress.js';
import {SECTORS, sectorIndex} from './data/sectors.js';
import {systems} from './systems/registry.js';

if (new URLSearchParams(location.search).get('debug') === '1') {
  const teleport = (x: number, z: number) => {
    G.me.pos.set(x, 0, z);
    G.me.vy = 0;
  };
  (window as any).__game = {
    S,
    G,
    SECTORS,
    systems,
    teleport,
    giveMoney(n: number) {
      S.cr += n;
    },
    /** 모든 섹터·포탈 해금 (해금 조건 무시) */
    unlockAll() {
      SECTORS.forEach((s, i) => {
        unlockSector(i);
        S.portals[s.id] = 1;
      });
      save();
    },
    /** 섹터 포탈 패드 앞으로 이동 (id 또는 인덱스). 잠긴 섹터면 먼저 해금한다 */
    setSector(id: string | number) {
      const i = typeof id === 'number' ? id : sectorIndex(id);
      if (!SECTORS[i]) return false;
      unlockSector(i);
      const p = padPos(i);
      teleport(p.x, p.z + 3);
      return true;
    },
  };
}
