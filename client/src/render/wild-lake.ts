// 호숫가 장식: 호수 둘레 도로(아스팔트 띠 + 흰 갓길선 + 노란 점선, 지형을 눌러 평평하게 한 길 위에 깐다), 큰 호수 북안 선착장과 보트, 호숫가 갈대·바위.
// 전부 병합 메시. 충돌체 없음(길은 평지라 그냥 걷고 달린다).
import {addDeck} from '../core/deck.js';
import {groundH} from '../core/terrain.js';
import {LAKES} from '../data/wild.js';
import {ROAD_LINES, roadNear, type RoadPt} from '../data/wild-road.js';
import {lakeT, shorePoint} from '../core/lake-shape.js';
import {terrainRibbon, type PathPoint} from './landscape-surface.js';
import {landscapeBatch, landscapeForest} from './landscape-batch.js';
import {worldPart} from './rural-fields.js';
import {walkway} from './rural-models.js';
import {benchGeo, roundTreeGeo} from './city/props.js';
import {PAL, NEUTRAL, ACCENT, mix, rgb} from './lowpoly/palette.js';
import {box, cone, cyl, ico, type Geo} from './lowpoly/prim.js';
import {hash2} from './lowpoly/rng.js';
import {lowMat, mergePlaced, type Inst, type Placed} from './lowpoly/merge.js';

/** 길 한 줄의 띠들을 pos/col 배열에 쌓는다. off = 중심선에서 옆으로, hw = 반폭 */
function ribbon(P: RoadPt[], closed: boolean, off: number, hw: number, dy: number, color: number, pos: number[], col: number[], dash = 0) {
  const n = P.length, [r, g, b] = rgb(color);
  const side = (i: number) => {
    const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], c = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)],
      dx = c.x - a.x, dz = c.z - a.z, l = Math.hypot(dx, dz) || 1;
    return [-dz / l, dx / l];
  };
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    if (dash && Math.floor(i / dash) % 2) continue;
    const j = (i + 1) % n, si = side(i), sj = side(j), p = P[i], q = P[j];
    const v = (pt: RoadPt, s: number[], o: number) => [pt.x + s[0] * o, pt.y + dy, pt.z + s[1] * o];
    const A = v(p, si, off - hw), B = v(p, si, off + hw), C = v(q, sj, off - hw), D = v(q, sj, off + hw);
    // 윗면(+y)이 앞이 되게: A,C,B / B,C,D
    for (const t of [A, B, C, B, D, C]) {
      pos.push(...t);
      col.push(r, g, b);
    }
  }
}

function roadMesh(): any {
  const pos: number[] = [], col: number[] = [];
  for (const L of ROAD_LINES) {
    const P = L.pts, W = L.w;
    ribbon(P, L.closed, 0, W / 2, 0.1, L.id === 'farm' ? mix(PAL.clay, PAL.bone, 0.35) : PAL.asphalt, pos, col);
    ribbon(P, L.closed, -(W / 2 - 0.9), 0.14, 0.13, PAL.white, pos, col);
    ribbon(P, L.closed, W / 2 - 0.9, 0.14, 0.13, PAL.white, pos, col);
    if (W > 8) ribbon(P, L.closed, 0, 0.12, 0.13, PAL.yellow, pos, col, 3);
  }
  const g = new THREE.BufferGeometry(),
    nor = new Float32Array(pos.length);
  for (let i = 1; i < nor.length; i += 3) nor[i] = 1;
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, lowMat());
  m.name = 'lakeRoad';
  return m;
}

export function buildLakeside(): any {
  const grp = new THREE.Group();
  grp.name = 'lakeside';
  grp.add(roadMesh());
  const S: Placed[] = [],
    L = LAKES[0],
    wood = PAL.wood;
  // --- 선착장: 북안에서 호수 쪽(+z)으로 뻗는 널빤지 길 + 보트 ---
  let zs = L.z - L.rz * 1.5;
  const dx = L.x - 30;
  while (zs < L.z && groundH(dx, zs) > L.level + 0.1) zs += 1;
  for (let k = 0; k < 9; k++) {
    const z = zs - 6 + k * 3.6;
    S.push({g: box(3, 0.35, 3.6, wood), x: dx, y: L.level + 0.55, z});
    if (k % 2 === 0) for (const sx of [-1.3, 1.3]) S.push({g: box(0.4, 3.2, 0.4, NEUTRAL.coal), x: dx + sx, y: L.level - 2.4, z});
  }
  addDeck({id: 'rural-grand-dock', ax: dx, az: zs - 7.8, bx: dx, bz: zs + 24.6, hw: 1.5, h0: L.level + 0.9, h1: L.level + 0.9});
  const landZ = zs - 21, landY = groundH(dx, landZ) + 0.15, dockZ = zs - 7.8, dockY = L.level + 0.9;
  S.push({g: walkway(3, dockZ - landZ, dockY - landY), x: dx, y: landY - 0.22, z: (landZ + dockZ) / 2});
  addDeck({id: 'rural-grand-gangway', ax: dx, az: landZ, bx: dx, bz: dockZ, hw: 1.5, h0: landY, h1: dockY});
  S.push({g: mergeBoat(), x: dx + 7, y: L.level + 0.05, z: zs + 22, ry: 0.5});
  // --- 호숫가 갈대·바위 ---
  for (const lk of LAKES)
    for (let k = 0; k < 120; k++) {
      const a = hash2(k, 3, lk.rx | 0) * 6.283,
        t = 1.0 + (hash2(k, 4, lk.rx | 0) - 0.3) * 0.08,
        c = Math.cos(lk.rot), s = Math.sin(lk.rot),
        u = Math.cos(a) * lk.rx * t, v = Math.sin(a) * lk.rz * t,
        x = lk.x + u * c - v * s, z = lk.z + u * s + v * c,
        y = groundH(x, z);
      if (y === -Infinity || y < lk.level - 0.3 || lakeT(lk, x, z) < 0.95) continue;
      if (k % 4 === 0) S.push({g: ico(0.7 + hash2(k, 5, 2) * 1.1, 0, mix(NEUTRAL.stone, PAL.clay, 0.3), 0, 0.2, 0, 0, 0.7), x, y, z, ry: k});
      else S.push({g: reed(), x, y, z, ry: k * 2.1});
    }
  // --- 벚꽃 둑길: 순환로와 물가 사이 산책로(+ 벤치)와 벚나무 ---
  const cherry: Inst[] = [], pk: Placed[] = [];
  let walk: PathPoint[] = [];
  const flush = () => {
    if (walk.length > 1) pk.push(worldPart(terrainRibbon(walk, 2.4, mix(PAL.bone, PAL.clay, 0.15), 0.18), walk[0][0], walk[0][1]));
    walk = [];
  };
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2, [wx, wz] = shorePoint(L, a, 8);
    if (groundH(wx, wz) > L.level + 0.4) walk.push([wx, wz]);
    else flush();
  }
  flush();
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2, [x, z] = shorePoint(L, a + 0.02, 13), y = groundH(x, z);
    if (!Number.isFinite(y) || y < L.level + 0.4 || lakeT(L, x, z) < 1.04 || roadNear(x, z).d < roadNear(x, z).hw + 3) continue;
    cherry.push({x, y, z, s: 1.25 + hash2(i, 0, 333) * 0.5, ry: hash2(i, 0, 334) * 6});
    if (i % 17 === 0) S.push({g: benchGeo(), x: x + Math.cos(a) * -3, y: groundH(x, z), z: z - Math.sin(a) * 3, ry: -a - Math.PI / 2, s: 1.3});
  }
  const cherryGeo = mergePlaced([{g: cyl(0.25, 2.6, PAL.wood, 0, 0, 0, 0, 5)}, {g: ico(2, 0, mix(PAL.pink, PAL.white, 0.4), 0, 3.6, 0)}, {g: ico(1.2, 0, PAL.pink, 1, 3.6, 0.4)}]);
  grp.add(new THREE.Mesh(mergePlaced(S), lowMat()), landscapeBatch(pk, 'lake-promenade', 400), landscapeForest(cherryGeo, cone(2.3, 4.5, PAL.pink, 0, 0, 0, 0, 5), cherry, 'lake-cherries'));
  void roundTreeGeo;
  return grp;
}
function reed(): Geo {
  return mergePlaced([{g: cone(0.18, 2.4, ACCENT.lime, -0.3, 0, 0, 0, 4)}, {g: cone(0.16, 3, ACCENT.green, 0.2, 0, 0.1, 0, 4)}, {g: cone(0.15, 2.1, ACCENT.lime, 0, 0, -0.3, 0, 4)}]);
}
function mergeBoat(): Geo {
  return mergePlaced([{g: box(2.6, 0.8, 6, PAL.red)}, {g: box(2.1, 0.3, 5.2, PAL.bone, 0, 0.8)}, {g: box(0.2, 3.2, 0.2, PAL.wood, 0, 0.8, -0.5)}, {g: box(1.6, 1.6, 0.1, PAL.white, 0.8, 1.6, -0.5)}]);
}
