// 구역 랜드마크 12종 (docs/design/WORLD.md 2.5): 구역마다 멀리서도 "저기!" 가 되는 큰 물체 1개. 전부 로우폴리 프리미티브를 병합한 메시 (드로우콜 1~2회).
import {sectorDetails} from './sector-art.js';
import {heightAt} from '../core/heightmap.js';
import {addSolid} from '../core/terrain.js';
import {SECTORS} from '../data/sectors.js';
import {TERRAIN, type LandmarkKind} from '../data/world-map.js';
import {ACCENT, BIOME, NEUTRAL, PAL, mix, type Biome} from './lowpoly/palette.js';
import {glowMat, lowMat, mergeGeometries} from './lowpoly/merge.js';
import {box, cone, cyl, frustum, ico, prism, taper, type Geo} from './lowpoly/prim.js';

/** 랜드마크 모양: 조명을 받는 부분(lit) 과 스스로 빛나는 부분(glow). 원점 = 땅 위 한가운데 */
interface Shape {
  lit: Geo[];
  glow?: Geo[];
}
const TAU = Math.PI * 2;

const SHAPES: Record<LandmarkKind, (c: readonly number[]) => Shape> = {
  // 관측 돔 + 안테나
  dome: c => ({
    lit: [cyl(8, 3, NEUTRAL.steel, 0, 0, 0, 0, 10), ico(8, 1, NEUTRAL.cloud, 0, 3, 0, 0, 0.8), box(1.6, 5, 5, NEUTRAL.coal, 7, 3, 0), cyl(0.4, 9, NEUTRAL.stone, -3, 3, 4)],
    glow: [ico(0.9, 0, c[5], -3, 12.5, 4)],
  }),
  // 떠 있는 바위 아치
  arch: c => ({
    lit: [
      taper(7, 7, 5, 5, 20, c[4], -9, 10, 0), taper(7, 7, 5, 5, 20, c[4], 9, 10, 0), box(26, 6, 7, c[3], 0, 28, 0),
      ico(3, 1, c[4], -9, 4, 2), ico(2.2, 1, c[4], 10, 6, -2), ico(1.6, 0, c[3], 0, 20, 0),
    ],
  }),
  // 폭풍 기둥: 줄무늬 원반을 쌓은 소용돌이
  storm: c => ({
    lit: Array.from({length: 9}, (_, i) => frustum(8, 4 + Math.sin(i * 0.9) * 2.2 + i * 0.3, 4 + Math.sin(i * 0.9 + 0.9) * 2.2 + i * 0.3, 4.6, i % 2 ? c[2] : c[1], 0, i * 4.6, 0, i * 0.35)),
    glow: [ico(2.4, 1, c[5], 0, 44, 0)],
  }),
  // 고리 모양 빙벽
  ring: c => ({
    lit: Array.from({length: 14}, (_, i) => {
      const a = (i / 14) * TAU;
      return taper(7.5, 4, 5, 3, 12 + (i % 3) * 2, i % 2 ? c[3] : c[2], Math.cos(a) * 20, 0, Math.sin(a) * 20, -a);
    }),
  }),
  // 혜성 꼬리 얼음탑
  spire: c => ({
    lit: [cone(7, 40, c[3], 0, 0, 0, 0, 6), cone(4, 24, c[2], 6, 0, 3, 0, 5), cone(3, 18, c[2], -5, 0, -4, 0, 5), cone(2.4, 12, c[4], 2, 0, -7, 0, 5)],
    glow: [ico(1.2, 0, c[5], 0, 41, 0)],
  }),
  // 붉은 항성 (거대한 구)
  sun: c => ({lit: [cyl(5, 2, NEUTRAL.coal, 0, 0, 0, 0, 8)], glow: [ico(11, 2, c[3], 0, 32, 0), ico(14, 1, mix(c[3], PAL.fog, 0.4), 0, 32, 0)]}),
  // 쌍둥이 오벨리스크
  obelisk: c => ({
    lit: [
      taper(6, 6, 2.4, 2.4, 28, c[3], -5, 0, 0), cone(1.8, 4, ACCENT.yellow, -5, 28, 0, 0, 4),
      taper(5, 5, 2, 2, 22, c[4], 6, 0, 3), cone(1.5, 3.5, ACCENT.yellow, 6, 22, 3, 0, 4), box(18, 1.2, 10, NEUTRAL.stone, 0, 0, 1.5),
    ],
  }),
  // 용암 폭포: 어두운 절벽과 흘러내리는 용암
  falls: c => ({
    lit: [taper(18, 12, 12, 8, 32, c[4], 0, 0, 0), taper(8, 6, 6, 4, 18, c[4], 9, 0, 4)],
    glow: [box(4, 30, 1, c[5], 0, 1, 6.3), box(14, 0.5, 6, c[3], 0, 0, 9.5)],
  }),
  // 가스 기둥: 위가 부풀어 오른 창조의 기둥
  pillar: c => ({
    lit: [frustum(7, 8, 3.2, 20, c[2], 0, 0, 0), frustum(7, 3.2, 5, 10, c[3], 0, 20, 0), ico(5.6, 1, c[3], 0, 33, 0, 0, 0.8), frustum(6, 3, 1, 7, c[1], -8, 0, 4)],
    glow: [ico(1.5, 0, c[5], 3, 35, 2)],
  }),
  // 거대 결정 첨탑
  crystal: c => ({
    lit: [
      frustum(5, 6, 0, 40, c[3], 0, 0, 0), frustum(5, 4.5, 0, 28, c[2], 7, 0, 4, 0.6), frustum(5, 4, 0, 24, c[3], -7, 0, 3, 1.1),
      frustum(5, 3, 0, 16, c[2], 3, 0, -8, 0.3), frustum(5, 2.5, 0, 12, c[1], -5, 0, -7),
    ],
    glow: [ico(1.3, 0, c[5], 0, 41, 0)],
  }),
  // 강착원반: 어두운 구와 빛나는 고리
  disk: c => ({
    lit: [cyl(4, 12, NEUTRAL.coal, 0, 0, 0, 0, 6)],
    glow: [
      ico(8, 2, NEUTRAL.ink, 0, 24, 0),
      ...Array.from({length: 20}, (_, i) => {
        const a = (i / 20) * TAU;
        return box(7, 1.2, 2.6, i % 2 ? c[5] : ACCENT.amber, Math.cos(a) * 18, 23.4, Math.sin(a) * 18, -a);
      }),
    ],
  }),
  // 떠 있는 산 (할렐루야 산)
  mount: c => ({
    lit: [cone(18, 34, c[2], 0, 14, 0, 0, 7), cone(10, 22, c[3], 11, 20, 4, 0, 6), prism(6, 5, 7, c[4], -3, 6, 0), cone(4, 8, c[4], -4, 0, 1, 0, 6)],
    glow: [ico(1.6, 0, c[5], 0, 49, 0), ico(1.1, 0, c[5], 11, 43, 4)],
  }),
};

/** 구역 i 의 랜드마크 그룹 (땅 높이에 놓여 있다). 청크가 해제될 때 같이 해제된다 */
export function buildLandmark(i: number): any {
  const s = SECTORS[i],
    lm = TERRAIN[s.id].landmark,
    pal = BIOME[s.id as Biome],
    shape = SHAPES[lm.kind](pal),
    g = new THREE.Group();
  g.add(new THREE.Mesh(mergeGeometries([...shape.lit, ...sectorDetails(lm.kind, pal)]), lowMat()));
  if (shape.glow) g.add(new THREE.Mesh(mergeGeometries(shape.glow), glowMat()));
  const x = s.center.x + lm.dx,
    z = s.center.z + lm.dz;
  g.position.set(x, heightAt(x, z), z);
  return g;
}

/** 랜드마크 밑동을 충돌체로 등록 (구역이 잠겨 있어도 위치는 변하지 않으므로 부팅 때 한 번) */
export function registerLandmarkSolids() {
  SECTORS.forEach(s => {
    const lm = TERRAIN[s.id].landmark,
      r = lm.r * 0.8,
      x = s.center.x + lm.dx,
      z = s.center.z + lm.dz;
    addSolid(x - r, z - r, x + r, z + r);
  });
}
