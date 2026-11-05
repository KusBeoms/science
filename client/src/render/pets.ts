// 펫 모델 7종(햄스터·토끼·강아지·고양이·병아리·로봇 강아지·아기 용): 로우폴리 상자 조합 1 메시. 앞쪽 = +z, 원점은 발 밑.
import {rigPet} from './pet-rig.js';
import {PAL, mix} from './lowpoly/palette.js';
import {box} from './lowpoly/prim.js';
import {glowMat, lowMat, mergeGeometries} from './lowpoly/merge.js';
import type {PetType} from '../data/shops2.js';

type G3 = any;
export function buildPet(t: PetType): any {
  const c = t.color,
    a = t.accent,
    k = t.kind,
    dk = PAL.ink,
    L: G3[] = [],
    G: G3[] = [];
  const eyes = (y: number, z: number, dx = 0.12) => L.push(box(0.07, 0.07, 0.05, dk, -dx, y, z), box(0.07, 0.07, 0.05, dk, dx, y, z));
  const legs = (z0: number, z1: number, h: number, col = c) => [z0, z1].forEach(z => [-0.17, 0.17].forEach(x => L.push(box(0.14, h, 0.14, col, x, 0, z))));
  switch (k) {
    case 'hamster':
      L.push(box(0.55, 0.45, 0.6, c, 0, 0.05, 0), box(0.42, 0.34, 0.3, PAL.white, 0, 0.1, 0.25), box(0.12, 0.14, 0.05, a, -0.2, 0.5, 0.1), box(0.12, 0.14, 0.05, a, 0.2, 0.5, 0.1));
      eyes(0.35, 0.31, 0.12);
      break;
    case 'rabbit':
      L.push(box(0.5, 0.45, 0.7, c, 0, 0.12, 0), box(0.4, 0.38, 0.4, c, 0, 0.35, 0.4), box(0.12, 0.55, 0.1, c, -0.1, 0.7, 0.35), box(0.12, 0.55, 0.1, c, 0.1, 0.7, 0.35), box(0.2, 0.2, 0.2, a, 0, 0.3, -0.4));
      eyes(0.55, 0.61);
      legs(-0.2, 0.25, 0.14);
      break;
    case 'dog':
      L.push(box(0.5, 0.45, 0.95, c, 0, 0.35, 0), box(0.42, 0.4, 0.42, c, 0, 0.6, 0.6), box(0.26, 0.2, 0.26, a, 0, 0.6, 0.9), box(0.12, 0.26, 0.12, a, -0.26, 0.62, 0.55), box(0.12, 0.26, 0.12, a, 0.26, 0.62, 0.55), box(0.1, 0.1, 0.4, c, 0, 0.62, -0.62).rotateX(-0.6));
      eyes(0.78, 0.83);
      legs(-0.32, 0.32, 0.38, mix(c, PAL.white, 0.2));
      break;
    case 'cat':
      L.push(box(0.4, 0.4, 0.85, c, 0, 0.33, 0), box(0.38, 0.34, 0.36, c, 0, 0.58, 0.55), box(0.12, 0.16, 0.1, a, -0.13, 0.9, 0.55), box(0.12, 0.16, 0.1, a, 0.13, 0.9, 0.55), box(0.08, 0.08, 0.6, c, 0, 0.5, -0.5).rotateX(0.9));
      eyes(0.7, 0.74);
      legs(-0.28, 0.28, 0.35);
      break;
    case 'bird':
      L.push(box(0.5, 0.5, 0.5, c, 0, 0.08, 0), box(0.34, 0.34, 0.34, c, 0, 0.5, 0.15), box(0.18, 0.1, 0.2, a, 0, 0.58, 0.4), box(0.08, 0.2, 0.08, a, -0.1, -0.05, 0), box(0.08, 0.2, 0.08, a, 0.1, -0.05, 0), box(0.1, 0.3, 0.3, mix(c, PAL.orange, 0.3), -0.3, 0.2, 0), box(0.1, 0.3, 0.3, mix(c, PAL.orange, 0.3), 0.3, 0.2, 0));
      eyes(0.62, 0.33);
      break;
    case 'robot':
      L.push(box(0.55, 0.45, 0.95, c, 0, 0.4, 0), box(0.44, 0.4, 0.44, mix(c, PAL.white, 0.3), 0, 0.62, 0.6), box(0.06, 0.34, 0.06, a, 0, 1.0, 0.55), box(0.14, 0.35, 0.14, PAL.slate, -0.17, 0, 0.32), box(0.14, 0.35, 0.14, PAL.slate, 0.17, 0, 0.32), box(0.14, 0.35, 0.14, PAL.slate, -0.17, 0, -0.32), box(0.14, 0.35, 0.14, PAL.slate, 0.17, 0, -0.32));
      G.push(box(0.1, 0.1, 0.05, a, -0.12, 0.78, 0.83), box(0.1, 0.1, 0.05, a, 0.12, 0.78, 0.83), box(0.12, 0.12, 0.12, a, 0, 1.3, 0.55));
      break;
    case 'dragon':
      L.push(box(0.6, 0.55, 1.0, c, 0, 0.4, 0), box(0.46, 0.44, 0.5, c, 0, 0.75, 0.62), box(0.3, 0.2, 0.28, mix(c, PAL.lime, 0.3), 0, 0.75, 0.98), box(0.4, 0.3, 0.9, a, 0, 0.38, 0.02).rotateX(0), box(0.1, 0.3, 0.1, a, -0.15, 1.15, 0.5), box(0.1, 0.3, 0.1, a, 0.15, 1.15, 0.5), box(0.2, 0.2, 0.8, c, 0, 0.45, -0.85), box(0.12, 0.3, 0.2, a, 0, 0.7, -1.2), box(0.5, 0.06, 0.6, mix(c, PAL.violet, 0.4), -0.55, 0.95, -0.1).rotateZ(0.5), box(0.5, 0.06, 0.6, mix(c, PAL.violet, 0.4), 0.55, 0.95, -0.1).rotateZ(-0.5));
      eyes(0.92, 0.88, 0.14);
      legs(-0.3, 0.3, 0.4);
      G.push(box(0.1, 0.1, 0.1, PAL.orange, 0, 0.72, 1.16));
      break;
  }
  const g = new THREE.Group();
  rigPet(L, g, k);
  if (G.length) g.add(new THREE.Mesh(mergeGeometries(G), glowMat()));
  const s = k === 'dragon' ? 1.1 : 1;
  g.scale.setScalar(s);
  return g;
}
