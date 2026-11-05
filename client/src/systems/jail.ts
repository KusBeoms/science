// 교도소: 검거되면 감방으로. 형기가 끝나면 풀려나고, 일부러 남겨 둔 허점(감방 서쪽 벽의 헐거운 벽돌 → 마당 → 담장 틈)으로 탈출하면 바로 끝난다. 탈출해도 쫓지 않는다.
import {S, save} from '../core/state.js';
import {G} from '../core/runtime.js';
import {addDynSolid, dropDynSolid, groundH, type Solid} from '../core/terrain.js';
import {JAIL} from '../data/wild.js';
import {dist2} from '../core/util.js';
import {addHudLine, toast} from '../game/hud.js';
import {sfx} from '../audio/index.js';
import type {GameSystem, Interactable, Target} from '../core/types.js';

let bars: Solid | null = null,
  wall: Solid | null = null,
  hits = 0;
export let brickMesh: any = null;
export const setBrickMesh = (m: any) => (brickMesh = m);
let barsMesh: any = null;
export const setBarsMesh = (m: any) => (barsMesh = m);

/** 감방 철창·헐거운 벽 충돌체 (처음 불릴 때 1회) */
function ensureSolids() {
  if (bars) return;
  wall && dropDynSolid(wall);
  const [bx, bz] = [JAIL.cell.x, JAIL.cell.z];
  bars = addDynSolid(bx - 5, bz + 4.4, bx + 5, bz + 5.2); // 남쪽 철창문 (형기 동안 닫힘)
  wall = addDynSolid(JAIL.brick.x - 0.4, JAIL.brick.z - 1.6, JAIL.brick.x + 0.4, JAIL.brick.z + 1.6);
}
export function goJail(stars: number) {
  ensureSolids();
  hits = 0;
  if (brickMesh) brickMesh.visible = true;
  const fine = Math.min(Math.floor(S.cr * 0.1), 2000);
  S.cr -= fine;
  S.wanted = 0;
  const sentence = 40 + 25 * Math.max(1, stars);
  G.jail = {t: sentence, total: sentence};
  G.me.pos.set(JAIL.cell.x, groundH(JAIL.cell.x, JAIL.cell.z), JAIL.cell.z);
  G.me.vy = 0;
  G.yaw = 0;
  G.camDist = 11;
  toast(`⛓️ 검거! 벌금 ✦${fine} — 형기 ${sentence}초. 어딘가 허술한 곳이 있을지도…`, 4);
  sfx('deny');
  save();
}
function release(escaped: boolean) {
  G.jail = null;
  if (!escaped) {
    G.me.pos.set(JAIL.release.x, groundH(JAIL.release.x, JAIL.release.z), JAIL.release.z);
    toast('🔓 출소했습니다');
  } else toast('🏃 탈출 성공! 아무도 쫓지 않는다', 3.5);
  sfx('buy');
}
const outside = (x: number, z: number) => x < JAIL.rect[0] - 1 || x > JAIL.rect[2] + 1 || z < JAIL.rect[1] - 1 || z > JAIL.rect[3] + 1;

export const jailSystem: GameSystem = {
  id: 'jail',
  update(dt) {
    if (barsMesh) barsMesh.visible = !!bars;
    const j = G.jail;
    if (!j) return;
    if ((j.t -= dt) <= 0) {
      bars && (dropDynSolid(bars), (bars = null));
      return release(false);
    }
    if (outside(G.me.pos.x, G.me.pos.z)) {
      release(true);
      bars && (dropDynSolid(bars), (bars = null));
    }
  },
};
addHudLine(() => {
  if (!G.jail) return null;
  const t = Math.ceil(G.jail.t);
  return `⛓️ ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}${wall ? ' 🧱' : ' 🕳️'}`;
});

interface BrickT extends Target {
  kind: 'brick';
}
export const brickIt: Interactable<BrickT> = {
  kind: 'brick',
  tier: 0,
  find(me) {
    if (!G.jail || !wall) return null;
    const d = dist2(me.pos, JAIL.brick);
    return d < 3.2 ? {kind: 'brick', d} : null;
  },
  info: () => '<b>🧱 헐거운 벽돌</b>',
  prompt: () => `E 🧱 ${'●'.repeat(hits)}${'○'.repeat(3 - hits)}`,
  act(_t, key) {
    if (key !== 'e' || !wall) return;
    if (++hits >= 3) {
      dropDynSolid(wall);
      wall = null;
      if (brickMesh) brickMesh.visible = false;
      toast('🕳️ 벽에 구멍이 뚫렸다 — 마당 서쪽 끝으로!', 3);
    } else toast('🧱 덜컥…');
    sfx('jump');
  },
};
