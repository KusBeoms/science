// 지도 판정: 타일 안/잠김/바닥/막힘/슬롯 좌표/구역
import {H, SH, Z} from '../data/zones.js';
import {S} from './state.js';
import {G} from './runtime.js';

export const SHOP_AT = {x: -15, z: -13},
  SPAWN = {x: 0, z: 17};
export const inTile = (x: number, z: number, c: number, m?: number, h?: number) => {
  h = (h || H) + (m || 0);
  return Math.abs(x) < h && Math.abs(z - c) < h;
};
export const locked = (zi: number) => zi >= S.zone;
export const onGround = (x: number, z: number) =>
  inTile(x, z, 0) || Z.some((q, i) => !locked(i) && inTile(x, z, q.z, 0, SH));
export const blockedAt = (x: number, z: number) => Z.some((q, i) => locked(i) && inTile(x, z, q.z, 0, SH));
export const slotPos = (i: number) => ({x: -16 + 8 * (i % 5), z: 2 + 8 * Math.floor(i / 5)});
export const zoneAt = () => {
  for (let i = 0; i < Z.length; i++) if (inTile(G.me.pos.x, G.me.pos.z, Z[i].z, 1, SH)) return i;
  return -1;
};
