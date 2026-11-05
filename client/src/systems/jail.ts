// 교도소: 검거되면 감방으로. 형기가 끝나면 풀려나고, 일부러 남겨 둔 허점(감방 서쪽 벽의 헐거운 벽돌 → 마당 → 담장 틈)으로 탈출하면 바로 끝난다. 탈출해도 쫓지 않는다.
import {S, save} from '../core/state.js';
import {G} from '../core/runtime.js';
import {addDynSolid, dropDynSolid, groundH, type Solid} from '../core/terrain.js';
import {JAIL} from '../data/wild.js';
import {dist2} from '../core/util.js';
import {addHudLine, toast} from '../game/hud.js';
import {sfx} from '../audio/index.js';
import {pushMsg} from '../game/messenger.js';
import {guards} from '../render/wild.js';
import {animateWalk} from '../render/characters.js';
import {solidAt as solidHit} from '../core/terrain.js';
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
  toast(`체포되었습니다. 벌금 ✦${fine}, 형기 ${sentence}초. 벽을 살펴보세요`, 4);
  sfx('deny');
  setTimeout(() => pushMsg('friend', '벽 어딘가가 헐거워 보여. 잘 찾아봐'), 5000);
  save();
}
function release(escaped: boolean) {
  G.jail = null;
  if (!escaped) {
    G.me.pos.set(JAIL.release.x, groundH(JAIL.release.x, JAIL.release.z), JAIL.release.z);
    toast('형기를 마치고 출소했습니다');
  } else toast('탈출에 성공했습니다. 아무도 쫓지 않습니다', 3.5);
  sfx('buy');
}
const outside = (x: number, z: number) => x < JAIL.rect[0] - 1 || x > JAIL.rect[2] + 1 || z < JAIL.rect[1] - 1 || z > JAIL.rect[3] + 1;

/** 간수 순찰: 마당 세 곳을 돈다. 시야(범위·부채꼴, 벽에 막힘)에 0.7초 보이면 감방으로 끌려가고 형기 +15초 */
const J0 = JAIL.rect[1] - 725;
const ROUTES: [number, number][][] = [
  [[-182, 770], [-182, 790], [-200, 790], [-212, 772]],
  [[-222, 731], [-190, 731], [-170, 731], [-170, 745], [-190, 731]],
  [[-230, 790], [-230, 764], [-221, 764], [-221, 790]],
];
const RANGE = [12, 12, 9];
const gs: {i: number; k: number; seen: number; face: number}[] = [0, 1, 2].map(i => ({i, k: 0, seen: 0, face: 0}));
function patrol(dt: number) {
  guards.forEach((m: any, i: number) => {
    const g = gs[i],
      r = ROUTES[i];
    if (!r) return;
    const [tx, tz] = [r[g.k][0], r[g.k][1] + J0];
    const dx = tx - m.position.x,
      dz = tz - m.position.z,
      d = Math.hypot(dx, dz);
    if (d < 0.6) g.k = (g.k + 1) % r.length;
    else {
      m.position.x += (dx / d) * 3.2 * dt;
      m.position.z += (dz / d) * 3.2 * dt;
      g.face = Math.atan2(dx, dz);
      m.rotation.y = g.face;
      animateWalk(m, performance.now() / 1000 * 9 + i, false);
    }
    if (!G.jail) return;
    // 시야 판정
    const px = G.me.pos.x - m.position.x,
      pz = G.me.pos.z - m.position.z,
      pd = Math.hypot(px, pz);
    let see = pd < RANGE[i] && Math.abs(Math.atan2(Math.sin(Math.atan2(px, pz) - g.face), Math.cos(Math.atan2(px, pz) - g.face))) < 0.95;
    if (see) for (let t = 1; t < pd; t += 1.5) if (solidHit(m.position.x + (px * t) / pd, m.position.z + (pz * t) / pd, 0.3)) { see = false; break; }
    // 감방 안에 있으면 안 본다
    if (see && Math.abs(G.me.pos.x - JAIL.cell.x) < 5.2 && Math.abs(G.me.pos.z - JAIL.cell.z) < 5.5) see = false;
    g.seen = see ? g.seen + dt : Math.max(0, g.seen - dt * 2);
    if (g.seen > 0.7) {
      g.seen = 0;
      G.jail.t = Math.min(G.jail.total + 40, G.jail.t + 15);
      G.me.pos.set(JAIL.cell.x, groundH(JAIL.cell.x, JAIL.cell.z), JAIL.cell.z);
      toast('간수에게 들켰습니다. 감방으로 돌아가고 형기 15초 추가', 3);
      sfx('deny');
    }
  });
}
export const jailSystem: GameSystem = {
  id: 'jail',
  update(dt) {
    if (G.me.pos.z > JAIL.rect[1] - 125) patrol(dt);
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
  return `형기 ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}${wall ? '' : ' · 벽에 구멍이 났습니다'}`;
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
  info: () => '<b>헐거운 벽돌</b>',
  prompt: () => `E 벽돌 밀기 (${hits}/3)`,
  act(_t, key) {
    if (key !== 'e' || !wall) return;
    if (++hits >= 3) {
      dropDynSolid(wall);
      wall = null;
      if (brickMesh) brickMesh.visible = false;
      toast('벽에 구멍이 뚫렸습니다. 마당 서쪽 끝으로 가세요', 3);
    } else toast('벽돌이 흔들립니다');
    sfx('jump');
  },
};
