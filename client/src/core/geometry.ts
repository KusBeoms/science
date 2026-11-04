// 지도 판정 (2D): 허브/섹터 안·잠긴 구역 막힘·문·포탈 패드·슬롯 좌표 (바닥 높이는 core/terrain.ts)
import {H, SECTORS} from '../data/sectors.js';
import {PAD_IN} from '../data/world-map.js';
import {locked} from './progress.js';
import {G} from './runtime.js';

export const SHOP_AT = {x: -15, z: -13},
  SPAWN = {x: 0, z: 17},
  HUB_PAD = {x: 15, z: -13};
/** 허브 타일 안 (m = 여유, 음수면 안쪽으로 좁힘) */
export const inBase = (x: number, z: number, m = 0) => Math.abs(x) < H + m && Math.abs(z) < H + m;
export const inSector = (x: number, z: number, i: number, m = 0) => {
  const s = SECTORS[i],
    h = s.size / 2 + m;
  return Math.abs(x - s.center.x) < h && Math.abs(z - s.center.z) < h;
};
/** 섹터 사각형까지의 거리 (안이면 0) — 청크 스트리밍 기준 */
export const sectorDist = (x: number, z: number, i: number) => {
  const s = SECTORS[i],
    h = s.size / 2;
  return Math.hypot(Math.max(0, Math.abs(x - s.center.x) - h), Math.max(0, Math.abs(z - s.center.z) - h));
};
export const blockedAt = (x: number, z: number) => SECTORS.some((_, i) => locked(i) && inSector(x, z, i));
export const slotPos = (i: number) => ({x: -16 + 8 * (i % 5), z: 2 + 8 * Math.floor(i / 5)});
export const zoneAt = () => {
  for (let i = 0; i < SECTORS.length; i++) if (inSector(G.me.pos.x, G.me.pos.z, i, 1)) return i;
  return -1;
};
/** 문이 놓인 변: 중점(x,z), 섹터 안쪽 방향(ix,iz), 변을 따라가는 방향(lx,lz) */
export function gateFrame(i: number) {
  const s = SECTORS[i],
    h = s.size / 2,
    c = s.center;
  if (s.gate === 's') return {x: c.x, z: c.z + h, ix: 0, iz: -1, lx: 1, lz: 0};
  if (s.gate === 'n') return {x: c.x, z: c.z - h, ix: 0, iz: 1, lx: 1, lz: 0};
  if (s.gate === 'e') return {x: c.x + h, z: c.z, ix: -1, iz: 0, lx: 0, lz: 1};
  return {x: c.x - h, z: c.z, ix: 1, iz: 0, lx: 0, lz: 1};
}
/** 문 앞 (변까지 수직 거리 < d, 변 길이 + 2 안쪽) */
export function nearGate(i: number, x: number, z: number, d: number) {
  const f = gateFrame(i),
    dx = x - f.x,
    dz = z - f.z;
  return Math.abs(dx * f.ix + dz * f.iz) < d && Math.abs(dx * f.lx + dz * f.lz) < SECTORS[i].size / 2 + 2;
}
/** 섹터 포탈 패드: 문에서 안쪽으로 PAD_IN(둘레 능선 안쪽 평지), 옆으로 반변의 절반 */
export function padPos(i: number) {
  const f = gateFrame(i),
    o = SECTORS[i].size / 4;
  return {x: f.x + f.ix * PAD_IN + f.lx * o, z: f.z + f.iz * PAD_IN + f.lz * o};
}
