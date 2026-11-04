// 지도: 정사각형 구역을 위(−z)로 이어 붙인다 (기지 → 1단계 → 2단계 …)
import type {Zone} from '../core/types.js';
import {P, SOLAR} from './planets.js';

const idx = (f: (p: (typeof P)[number]) => boolean) => P.filter(f).map(p => p.id);
export const TS = 44,
  H = TS / 2,
  SS = 88,
  SH = SS / 2; // 기지 한 변 44, 각 단계는 넓이 4배(한 변 88)
export const Z: Zone[] = [
  {n: '태양계', ic: '☄️', gs: 16, col: ['#3a3f4a', '#464c5c'], gc: 0xaaaaaa, pool: idx(p => SOLAR.includes(p.name))},
  {
    n: '외계행성',
    ic: '🛸',
    gs: 19,
    col: ['#3a2a5a', '#483670'],
    gc: 0x9a66ff,
    pool: idx(p => p.grp === '실제' && !SOLAR.includes(p.name)),
  },
  {
    n: '가르강튀아',
    ic: '🕳️',
    gs: 22,
    col: ['#12141f', '#1c2034'],
    gc: 0xff8a2a,
    pool: idx(p => p.grp === '인터스텔라'),
  },
  {n: '알파 센타우리', ic: '🐉', gs: 25, col: ['#0f4a4a', '#16605e'], gc: 0x2affc8, pool: idx(p => p.grp === '아바타')},
].map((z, i) => Object.assign(z, {x: 0, z: -(H + SS * (i + 0.5))}));
export const SLOTMAX = 10,
  SPDMAX = 10;
