// W5 상점 거리 앞마당 소품(전시 차·자전거 거치대·마네킹·주유 캐노피 …): 건물마다 로컬 좌표(정면 +z, 발자국 앞 가장자리 = d/2)로 만든 뒤 병합 2 메시(solid + 밤에 켜지는 lit)로 올린다.
// 충돌은 소품마다 작은 사각형 하나. 문 앞 통로(|x|<2.6)는 비워 둔다.
import {G} from '../../core/runtime.js';
import {addSolid} from '../../core/terrain.js';
import {BUILDINGS_W4} from '../../data/city-w4.js';
import type {CityBuilding, Facing} from '../../data/city.js';
import {PAL, mix} from '../lowpoly/palette.js';
import {box, cyl, cone, type Geo} from '../lowpoly/prim.js';
import {glowMat, lowMat, mergePlaced, type Placed} from '../lowpoly/merge.js';
import type {GameSystem} from '../../core/types.js';

const FACE_RY: Record<Facing, number> = {s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2};
const car = (c: number, len = 3.6): Geo[] => [
  box(len, 0.9, 1.8, c, 0, 0.35),
  box(len * 0.52, 0.7, 1.6, PAL.glass, -0.1, 1.25),
  ...[-0.33, 0.33].flatMap(f => [-0.95, 0.95].map(dz => box(0.7, 0.7, 0.28, PAL.ink, len * f, 0, dz))),
  box(0.2, 0.25, 1.3, PAL.yellow, len / 2, 0.7), // 헤드라이트 자리
];
const bike = (c: number): Geo[] => [box(0.12, 0.9, 0.9, PAL.ink, 0, 0, -0.7), box(0.12, 0.9, 0.9, PAL.ink, 0, 0, 0.7), box(0.12, 0.12, 1.5, c, 0, 0.65, 0), box(0.12, 0.7, 0.12, c, 0, 0.5, -0.4), box(0.6, 0.1, 0.1, PAL.ink, 0, 1.0, 0.8)];
const flagLine = (x0: number, x1: number, y: number, z: number, n: number): {solid: Geo[]; lit: Geo[]} => ({
  solid: [box(0.15, y, 0.15, PAL.steel, x0, 0, z), box(0.15, y, 0.15, PAL.steel, x1, 0, z)],
  lit: Array.from({length: n}, (_, i) => box(0.5, 0.7, 0.1, [PAL.red, PAL.yellow, PAL.cyan, PAL.lime, PAL.pink][i % 5], x0 + ((i + 0.5) * (x1 - x0)) / n, y - 0.9, z)),
});

interface Part {
  /** 로컬 지오메트리와 위치(x, z = 정면에서 바깥쪽 거리), 충돌 반폭(없으면 충돌 없음) */
  g: Geo[];
  lit?: Geo[];
  x: number;
  z: number;
  hx?: number;
  hz?: number;
}
function partsOf(b: CityBuilding): Part[] {
  const w = b.w,
    z0 = b.d / 2;
  const at = (x: number, dz: number, g: Geo[], hx?: number, hz?: number, lit?: Geo[]): Part => ({g, lit, x, z: z0 + dz, hx, hz});
  const pad = (ww: number, dd: number, c = PAL.cloud) => box(ww, 0.2, dd, c);
  switch (b.purpose) {
    case 'autoshop': {
      const f = flagLine(-w / 2 + 0.6, w / 2 - 0.6, 6.4, 0.6, 12);
      return [
        at(-4.2, 2.6, [pad(4.8, 3), ...car(PAL.red).map(g => g.translate(0, 0.2, 0))], 2.4, 1.5),
        at(4.2, 2.6, [pad(4.8, 3), ...car(PAL.blue).map(g => g.translate(0, 0.2, 0))], 2.4, 1.5),
        at(0, 0, f.solid, 0.1, 0.1, f.lit),
        at(-6.4, 1, [box(0.8, 2.4, 0.8, PAL.cyan)], 0.4, 0.4, [box(0.5, 1.6, 0.1, PAL.cyan, 0, 0.4, 0.45)]),
      ];
    }
    case 'usedcar': {
      const f = flagLine(-w / 2 + 0.6, w / 2 - 0.6, 5.6, 0.6, 10);
      return [at(-3.9, 2.4, car(PAL.stone, 3.4), 1.8, 1.1), at(3.9, 2.4, car(PAL.amber, 3.4), 1.8, 1.1), at(0, 0, f.solid, 0.1, 0.1, f.lit), at(0, 4.2, [box(2.2, 0.15, 0.1, PAL.red, 0, 1, 0)], undefined, undefined, [box(2.2, 0.5, 0.1, PAL.red, 0, 1.4, 0)])];
    }
    case 'bikeshop': {
      const rack = (cs: number[]) => [box(3.8, 0.2, 0.2, PAL.steel, 0, 0.3, 0.9), ...cs.flatMap((cc, i) => bike(cc).map(g => g.translate(-1.3 + i * 1.3, 0, 0)))];
      return [
        at(-4.3, 2.6, rack([PAL.blue, PAL.orange, PAL.green]), 2, 0.9),
        at(4.3, 2.6, rack([PAL.red, PAL.cyan, PAL.violet]), 2, 0.9),
        at(-1.0, 6.5, [box(3, 0.6, 2.4, PAL.wood), box(3, 0.1, 0.2, PAL.yellow, 0, 0.6, 1.1)], 1.5, 1.2),
      ];
    }
    case 'clothes':
      return [-3.4, 3.4].flatMap((x, i) => [
        at(x, 2, [box(1.6, 0.25, 1.6, PAL.stone), box(0.55, 1.4, 0.5, PAL.ink, 0, 0.25), box(1.0, 1.3, 0.55, i ? PAL.cyan : PAL.magenta, 0, 1.0), box(0.5, 0.55, 0.5, PAL.bone, 0, 2.25), box(0.4, 0.3, 0.55, PAL.amber, 0, 2.7)], 0.8, 0.8),
        at(x + (i ? 2.2 : -2.2), 1.2, [box(0.12, 2.2, 0.12, PAL.steel), box(0.12, 2.2, 0.12, PAL.steel, 0, 0, 1.5), box(0.12, 0.12, 1.7, PAL.steel, 0, 2.2, -0.1), ...[0, 1, 2].map(k => box(0.1, 0.9, 0.4, [PAL.red, PAL.lime, PAL.violet][k], 0, 1.3, 0.2 + k * 0.5))], 0.2, 0.9),
      ]);
    case 'mart24':
      return [
        at(-3.8, 1.8, [box(2.4, 1.4, 1.2, PAL.white), box(2.2, 0.1, 1.0, PAL.cyan, 0, 1.4)], 1.2, 0.6, [box(2.0, 0.8, 0.1, PAL.cyan, 0, 0.3, 0.65)]),
        at(3.9, 1.8, [0, 1, 2].flatMap(k => [box(1.0, 0.9, 1.0, [PAL.red, PAL.blue, PAL.green][k], k * 0.7 - 0.7, k % 2 ? 0.9 : 0), box(1.0, 0.9, 1.0, PAL.amber, k * 0.7 - 0.7, 0)]), 1.2, 0.6),
        at(-4.9, 0.8, [box(0.3, 4, 0.3, PAL.steel)], 0.15, 0.15, [box(0.9, 1.4, 0.2, PAL.lime, 0, 3.2, 0), box(0.5, 0.5, 0.1, PAL.orange, 0, 2.5, 0.05)]),
      ];
    case 'florist':
      return [-3.1, 3.1].map((x, i) =>
        at(x, 1.8, [box(2.2, 0.8, 1.2, PAL.wood), ...[0, 1, 2, 3, 4].map(k => box(0.28, 0.8 + (k % 2) * 0.4, 0.28, [PAL.red, PAL.pink, PAL.yellow, PAL.violet, PAL.orange][(k + i * 2) % 5], -0.9 + k * 0.45, 0.8, (k % 2) * 0.3 - 0.15))], 1.1, 0.6)
      );
    case 'bakery':
      return [at(3.2, 1.8, [box(1.8, 1.0, 1.2, PAL.wood), ...[0, 1, 2].map(k => box(0.5, 0.35, 0.5, PAL.amber, -0.55 + k * 0.55, 1.0, 0))], 0.9, 0.6), at(-3.2, 1.2, [box(1.4, 2.2, 0.15, PAL.coal, 0, 0.5), box(0.12, 0.6, 0.5, PAL.wood, -0.5, 0, -0.2), box(0.12, 0.6, 0.5, PAL.wood, 0.5, 0, -0.2), box(1.0, 0.08, 0.05, PAL.white, 0, 2.0, 0.1)], 0.7, 0.4)];
    case 'petshop':
      return [at(3.4, 2.4, [box(1.9, 1.2, 1.9, PAL.clay), cone(1.7, 1.1, PAL.red, 0, 1.2, 0, Math.PI / 4, 4), box(0.9, 0.8, 0.1, PAL.ink, 0, 0, 0.96)], 1, 1), at(-3.4, 1.6, [box(0.9, 0.35, 0.9, PAL.pink), box(0.4, 0.3, 0.4, PAL.white, 0, 0.35, 0)], 0.5, 0.5)];
    case 'electro':
      return [at(3.4, 1.8, [0, 1, 2].map(k => box(1.4, 1.0, 0.5, PAL.ink, 0, k * 1.05, 0)), 0.7, 0.3, [0, 1, 2].map(k => box(1.1, 0.8, 0.1, [PAL.cyan, PAL.magenta, PAL.lime][k], 0, k * 1.05 + 0.1, 0.3))), at(-3.4, 1.8, [box(1.0, 1.6, 0.8, PAL.coal), box(1.0, 1.6, 0.8, PAL.coal, 1.1, 0, 0)], 1.1, 0.4)];
    case 'bookshop':
      return [at(3.2, 1.8, [box(2.2, 0.9, 1.0, PAL.wood), ...[0, 1, 2, 3, 4].map(k => box(0.4, 0.55, 0.7, [PAL.red, PAL.blue, PAL.green, PAL.amber, PAL.violet][k], -0.85 + k * 0.42, 0.9, 0))], 1.1, 0.5), at(-3.2, 1.6, [box(0.6, 3.2, 0.6, PAL.brick), box(1.6, 0.7, 0.3, PAL.bone, 0, 3.0, 0.3)], 0.3, 0.3)];
    case 'pharmacy':
      return [at(3.2, 1.4, [box(0.4, 3, 0.4, PAL.steel)], 0.2, 0.2, [box(0.7, 2.2, 0.3, PAL.lime, 0, 3.2, 0), box(2.2, 0.7, 0.3, PAL.lime, 0, 3.95, 0)]), at(-3.0, 1.6, [box(1.8, 0.5, 0.8, PAL.wood), box(0.4, 0.5, 0.4, PAL.green, -0.5, 0.5, 0), box(0.4, 0.5, 0.4, PAL.cloud, 0.4, 0.5, 0)], 0.9, 0.4)];
    case 'gasstation': {
      // 캐노피: 문(정면) 앞에 지붕 + 기둥 4 + 주유기 2대
      const cz = 8.4,
        cw = 7;
      return [
        at(0, cz, [box(cw * 2, 0.5, 11, PAL.red, 0, 5), box(cw * 2 + 0.4, 0.2, 11.4, PAL.cloud, 0, 5.5)], undefined, undefined, [box(cw * 2 - 1, 0.15, 10, PAL.white, 0, 4.8)]),
        ...[-cw + 0.5, cw - 0.5].flatMap(x => [-4.6, 4.6].map(dz => at(x, cz + dz, [box(0.7, 5, 0.7, PAL.cloud)], 0.35, 0.35))),
        ...[-3.6, 3.6].map(x => at(x, cz, [box(0.8, 0.3, 2, PAL.stone), box(0.8, 1.9, 0.9, PAL.red, 0, 0.3), box(0.6, 0.5, 0.1, PAL.cyan, 0, 1.5, 0.5), box(0.15, 1.0, 0.15, PAL.ink, 0.5, 0.6)], 0.4, 1, [box(0.5, 0.35, 0.1, PAL.lime, 0, 1.55, 0.52)])),
      ];
    }
    case 'carwash': {
      const cz = 5.6;
      return [
        at(-4.6, cz, [box(0.8, 5, 1.2, PAL.steel)], 0.4, 0.6),
        at(4.6, cz, [box(0.8, 5, 1.2, PAL.steel)], 0.4, 0.6),
        at(0, cz, [box(10, 0.9, 1.4, PAL.cyan, 0, 4.4), ...[-3, -1, 1, 3].map(x => cyl(0.35, 3, PAL.pink, x, 1.5, 0, 0, 8)), box(8, 0.2, 2.6, PAL.stone)], undefined, undefined, [box(8, 0.2, 0.1, PAL.cyan, 0, 4.5, 0.75)]),
      ];
    }
    default:
      return [];
  }
}

const rot = (b: CityBuilding, lx: number, lz: number): [number, number] => {
  const ry = FACE_RY[b.face],
    c = Math.cos(ry),
    s = Math.sin(ry);
  return [b.x + lx * c + lz * s, b.z - lx * s + lz * c];
};
let grp: any = null,
  litMesh: any = null;
function build() {
  const solid: Placed[] = [],
    lit: Placed[] = [];
  for (const b of BUILDINGS_W4) {
    const ry = FACE_RY[b.face];
    for (const p of partsOf(b)) {
      const [wx, wz] = rot(b, p.x, p.z);
      p.g.forEach(g => solid.push({g, x: wx, z: wz, ry}));
      p.lit?.forEach(g => lit.push({g, x: wx, z: wz, ry}));
      if (p.hx) {
        const hx = p.hx,
          hz = p.hz!,
          xs = [rot(b, p.x - hx, p.z - hz), rot(b, p.x + hx, p.z + hz)];
        addSolid(Math.min(xs[0][0], xs[1][0]), Math.min(xs[0][1], xs[1][1]), Math.max(xs[0][0], xs[1][0]), Math.max(xs[0][1], xs[1][1]));
      }
    }
  }
  grp = new THREE.Group();
  grp.name = 'shopstreet';
  grp.add(new THREE.Mesh(mergePlaced(solid), lowMat()));
  litMesh = new THREE.Mesh(mergePlaced(lit), glowMat());
  litMesh.visible = false;
  grp.add(litMesh);
  G.scene.add(grp);
}
void mix;
export const shopStreetSystem: GameSystem = {
  id: 'shopstreet',
  update() {
    if (!grp && G.scene) build();
    if (litMesh) litMesh.visible = G.night > 0;
  },
};
