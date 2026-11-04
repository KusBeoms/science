// QA 디버그 훅: URL 에 ?debug=1 일 때만 window.__game 을 노출하고 성능 오버레이를 띄운다 (평소엔 아무것도 하지 않음)
import {S, save} from './core/state.js';
import {G} from './core/runtime.js';
import {padPos} from './core/geometry.js';
import {unlockSector} from './core/progress.js';
import {groundH} from './core/terrain.js';
import {SECTORS, sectorIndex} from './data/sectors.js';
import {registerSystem, systems} from './systems/registry.js';

/** 성능 오버레이: FPS · 드로우콜 · 삼각형 · 지오메트리/텍스처 수 (renderer.info, WORLD.md 1.3 예산 대조용). 0.5초마다 갱신 */
function perfOverlay() {
  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;left:6px;bottom:6px;z-index:99;margin:0;padding:4px 6px;font:11px/1.3 monospace;color:#9dffb0;' +
    'background:rgba(0,0,0,.6);pointer-events:none;white-space:pre';
  document.body.append(el);
  let acc = 0,
    frames = 0;
  registerSystem({
    id: 'perf',
    update(_dt, raw) {
      acc += raw;
      frames++;
      if (acc < 0.5) return;
      const {render, memory} = G.renderer.info;
      el.textContent =
        `fps ${(frames / acc).toFixed(0)}  calls ${render.calls}  tris ${(render.triangles / 1000).toFixed(1)}k\n` +
        `geo ${memory.geometries}  tex ${memory.textures}  pos ${G.me.pos.x.toFixed(0)},${G.me.pos.z.toFixed(0)}`;
      acc = 0;
      frames = 0;
    },
  });
}
if (new URLSearchParams(location.search).get('debug') === '1') {
  /** 지면 위로 순간이동 (허공이면 높이 0) */
  const teleport = (x: number, z: number) => {
    const h = groundH(x, z);
    G.me.pos.set(x, h > -Infinity ? h : 0, z);
    G.me.vy = 0;
  };
  perfOverlay();
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
