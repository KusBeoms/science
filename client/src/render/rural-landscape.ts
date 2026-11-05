// 시골 섬: 경작지·호숫가 마을·산기슭 숲·정상 정자·벚꽃길. 땅 높이/물/도로는 공유 데이터를 읽는다.
import {groundH, addSolid, solidAt} from '../core/terrain.js';
import {WILD_POLY} from '../data/outline.js';
import {LAKES, MOUNTAIN, JAIL, DESERT, type Lake} from '../data/wild.js';
import {roadNear} from '../data/wild-road.js';
import {lakeT} from '../core/lake-shape.js';
import {PAL, mix} from './lowpoly/palette.js';
import {box, cone, cyl, gable, ico} from './lowpoly/prim.js';
import {hash2} from './lowpoly/rng.js';
import {mergeGeometries, type Placed, type Inst} from './lowpoly/merge.js';
import {landscapeBatch, landscapeForest} from './landscape-batch.js';
import {terrainPatch, terrainRibbon, terrainDisk, type PathPoint} from './landscape-surface.js';
import {roundTreeGeo, benchGeo} from './city/props.js';
import {greenhouse, gazebo, scarecrow, coastalRock} from './rural-art.js';

interface Plot {x: number; z: number; w: number; d: number; angle: number}
const plots: Plot[] = [];
const FARM_COLORS = [
  mix(PAL.lime, PAL.green, 0.2), mix(PAL.amber, PAL.yellow, 0.45),
  mix(PAL.green, PAL.lime, 0.4), mix(PAL.bone, PAL.clay, 0.45),
];
const world = (g: any, x: number, z: number): Placed => {
  g.translate(-x, 0, -z);
  return {g, x, z};
};
const inJail = (x: number, z: number, m = 15) =>
  x > JAIL.flat[0] - m && x < JAIL.flat[2] + m && z > JAIL.flat[1] - m && z < JAIL.flat[3] + m;

/** 기존 숲 배치에서도 필요하면 같은 밭 여유를 확인할 수 있다. */
export function ruralFieldAt(x: number, z: number, margin = 0) {
  return plots.some(p => {
    const dx = x - p.x, dz = z - p.z, c = Math.cos(p.angle), s = Math.sin(p.angle);
    return Math.abs(dx * c + dz * s) < p.w / 2 + margin && Math.abs(-dx * s + dz * c) < p.d / 2 + margin;
  });
}

function cottage(color: number) {
  return mergeGeometries([
    box(9, 4.6, 7, PAL.plaster), gable(10, 3, 8, color, 0, 4.6),
    box(1.4, 2.8, 0.15, PAL.wood, 0, 0, 3.6),
    box(1.6, 1.4, 0.1, PAL.glass, -2.7, 1.6, 3.6), box(1.6, 1.4, 0.1, PAL.glass, 2.7, 1.6, 3.6),
    box(0.6, 2, 0.6, PAL.brick, 2, 5.5, -1.5),
  ]);
}

/** 불규칙한 호안까지 실제 lakeT로 찾는다. extra는 물가 밖으로 떨어지는 거리. */
function shorePoint(L: Lake, angle: number, extra: number): PathPoint {
  const dx = Math.cos(angle), dz = Math.sin(angle);
  let distance = 10;
  while (distance < L.rx * 2.5 && lakeT(L, L.x + dx * distance, L.z + dz * distance) < 1) distance += 2;
  return [L.x + dx * (distance + extra), L.z + dz * (distance + extra)];
}

function linePoints(a: PathPoint, b: PathPoint, step = 5): PathPoint[] {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  return Array.from({length: n + 1}, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
}

export function buildRuralLandscape() {
  plots.length = 0;
  const root = new THREE.Group(); root.name = 'rural-landscape';
  const fields: Placed[] = [], village: Placed[] = [], details: Placed[] = [];
  const orchard: Inst[] = [], cherry: Inst[] = [], groves: Inst[] = [];
  const M = MOUNTAIN, pond = LAKES[1];
  let fieldCount = 0, cottages = 0, greenhouses = 0;
  const path = (points: readonly PathPoint[], width = 2.2, lift = 0.22) => {
    if (!points.length) return;
    fields.push(world(terrainRibbon(points, width, PAL.bone, lift), points[0][0], points[0][1]));
  };
  const openGround = (x: number, z: number, radius: number) => {
    const y = groundH(x, z);
    return Number.isFinite(y) && y > -2.4 && !inJail(x, z) && !solidAt(x, z, radius)
      && roadNear(x, z).d > radius + 7 && LAKES.every(L => lakeT(L, x, z) > 1.12);
  };
  // 모든 건물의 회전한 외곽과 네 모서리를 검사해 기존 농가·길·물가의 빈틈에만 둔다.
  const building = (g: any, x: number, z: number, w: number, d: number, ry = 0) => {
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
    const corner = [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]];
    if (!openGround(x, z, Math.max(hw, hd) + 1)
      || corner.some(([dx, dz]) => !openGround(x + dx, z + dz, 0.6))) return false;
    const heights = corner.map(([dx, dz]) => groundH(x + dx, z + dz));
    const y0 = Math.min(...heights), y1 = Math.max(...heights);
    if (y1 - y0 > 1.8 || y1 > 19) return false;
    const y = y1 + 0.06;
    village.push({g: box(hw * 2 + 0.4, y - y0 + 0.12, hd * 2 + 0.4, PAL.stone), x, y: y0 - 0.1, z});
    village.push({g, x, y, z, ry}); addSolid(x - hw, z - hd, x + hw, z + hd);
    return true;
  };

  // 크기·방향이 조금씩 다른 밭. 흙 둑은 두 변만 둘러 농로와 출입 여유를 남긴다.
  for (let z = WILD_POLY.z0 + 100; z < WILD_POLY.z1 - 80; z += 48) {
    for (let x = WILD_POLY.x0 + 35; x < WILD_POLY.x1 - 40; x += 56) {
      const px = x + (hash2(x, z, 301) - 0.5) * 9, pz = z + (hash2(x, z, 302) - 0.5) * 9;
      const y = groundH(px, pz);
      if (!Number.isFinite(y) || y < -2.4 || y > 18 || inJail(px, pz, 30) || roadNear(px, pz).d < 32) continue;
      if (px > DESERT.x0 && pz > DESERT.z0) continue;
      if (Math.hypot(px - M.x, pz - M.z) < M.r * 0.95 || LAKES.some(L => lakeT(L, px, pz) < 1.55)) continue;
      const w = 34 + hash2(x, z, 303) * 12, d = 25 + hash2(x, z, 304) * 12;
      const angle = (hash2(x, z, 305) - 0.5) * 0.12, c = Math.cos(angle), s = Math.sin(angle);
      const at = (u: number, v: number): PathPoint => [px + u * c - v * s, pz + u * s + v * c];
      const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].map(([u, v]) => at(u, v));
      if (corners.some(([cx, cz]) => !Number.isFinite(groundH(cx, cz)) || groundH(cx, cz) < -2.4
        || Math.abs(groundH(cx, cz) - y) > 3.5 || solidAt(cx, cz, 1))) continue;
      const geo = terrainPatch(px, pz, w, d, FARM_COLORS[Math.floor(hash2(x, z, 306) * 4)], angle);
      if (!geo.attributes.position.count) continue;
      fields.push(world(geo, px, pz)); fieldCount++; plots.push({x: px, z: pz, w, d, angle});
      const edge: PathPoint[] = [at(-w / 2 - 1, -d / 2 - 1), at(-w / 2 - 1, d / 2 + 1), at(w / 2 + 1, d / 2 + 1)];
      fields.push(world(terrainRibbon(edge, 0.9, mix(PAL.bone, PAL.clay, 0.2), 0.18), px, pz));
      if (hash2(x, z, 307) < 0.11) details.push({g: scarecrow(), x: px, y, z: pz});
      if (hash2(x, z, 308) < 0.22) for (let i = 0; i < 5; i++) {
        const [tx, tz] = at(-w / 2 + 4 + i * (w - 8) / 4, -d / 2 + 3);
        if (openGround(tx, tz, 1.3)) orchard.push({x: tx, y: groundH(tx, tz), z: tz, s: 1.05});
      }
    }
  }

  // 작은 호수 마을: 불규칙한 호안 밖 순환 산책로와, 호수를 바라보는 주택·온실.
  const pondWalk: PathPoint[] = [];
  for (let i = 0; i <= 80; i++) pondWalk.push(shorePoint(pond, i / 80 * Math.PI * 2, 19));
  path(pondWalk, 2.6);
  for (let i = 0; i < 20; i++) {
    const a = 0.4 + i / 20 * Math.PI * 2, [x, z] = shorePoint(pond, a, 35);
    const ry = -a - Math.PI / 2, roof = [PAL.tileRed, PAL.slate, PAL.tileBlue][i % 3];
    if (!building(cottage(roof), x, z, 9, 7, ry)) continue;
    cottages++;
    const start: PathPoint = [x - Math.cos(a) * 5.2, z - Math.sin(a) * 5.2];
    path(linePoints(start, shorePoint(pond, a, 19)), 1.7);
    if (i % 5 === 0) {
      const gx = x + Math.cos(a) * 16, gz = z + Math.sin(a) * 16;
      if (building(greenhouse(), gx, gz, 10, 18, ry)) greenhouses++;
    }
  }
  // 마을에서 동쪽 간선까지 가는 낮은 농로. 기존 간선의 높이를 그대로 따라 만난다.
  const villageExit = shorePoint(pond, -0.52, 19);
  path(linePoints(villageExit, [145, 945]), 2.6);

  // 산 서쪽 농가 군집. 기존 교도소와 기존 농가 충돌을 검사하므로 탈출 동선을 침범하지 않는다.
  for (const [cx, cz] of [[-325, 1190], [-235, 1455], [120, 1135]]) {
    for (let i = 0; i < 4; i++) {
      const x = cx + (i % 2) * 23, z = cz + Math.floor(i / 2) * 23;
      if (!building(cottage(i % 2 ? PAL.tileRed : PAL.slate), x, z, 9, 7)) continue;
      cottages++;
      path(linePoints([x, z + 5], [cx + 11, z + 12]), 1.8);
    }
  }

  // 호안의 좁은 부지에서 온실이 빠져도 평탄한 경작지에 세 동을 확보한다.
  for (const plot of plots) {
    if (greenhouses >= 3) break;
    if (building(greenhouse(), plot.x, plot.z, 10, 18, plot.angle)) greenhouses++;
  }

  // 초지보다 등산로를 높여 정상까지 보이게 한다. 끝부분 반경을 남겨 보도가 뒤집히지 않게 한다.
  fields.push(world(terrainDisk(M.x, M.z, 80, mix(PAL.green, PAL.wood, 0.18)), M.x, M.z));
  const trail: PathPoint[] = [];
  for (let k = 0; k <= 160; k++) {
    const t = k / 160, a = 1.4 + t * 14, r = M.r * 0.92 * (1 - t) + 5 * t;
    trail.push([M.x + Math.cos(a) * r, M.z + Math.sin(a) * r * 0.9]);
  }
  trail.push([M.x, M.z], [M.x + 14, M.z]); path(trail, 2.4, 0.3);
  const sx = M.x + 14, sz = M.z, sy = groundH(sx, sz);
  details.push({g: gazebo(), x: sx, y: sy, z: sz});
  for (const z of [-9, 9]) details.push({g: benchGeo(), x: sx + 8, y: groundH(sx + 8, sz + z), z: sz + z, ry: -Math.PI / 2, s: 1.3});

  // 산기슭의 숲은 농지·도로·등산로·정자 주변을 비우고 작은 군락으로만 보강한다.
  for (let z = M.z - 210; z <= M.z + 210; z += 18) for (let x = M.x - 230; x <= M.x + 230; x += 18) {
    const px = x + (hash2(x, z, 341) - 0.5) * 13, pz = z + (hash2(x, z, 342) - 0.5) * 13;
    const distance = Math.hypot(px - M.x, pz - M.z), y = groundH(px, pz);
    if (distance < 62 || distance > 235 || y < 2 || y > 76 || !openGround(px, pz, 2.8) || ruralFieldAt(px, pz, 3)) continue;
    if (hash2(x, z, 343) > 0.62 || trail.some(([tx, tz]) => Math.hypot(tx - px, tz - pz) < 5)) continue;
    groves.push({x: px, y, z: pz, s: 1.8 + hash2(x, z, 344) * 0.9, ry: hash2(x, z, 345) * 6});
  }

  // 실제 큰 호숫가와 도로 사이에 벚꽃을 배치한다. 오목한 만에서도 물 위로 나가지 않는다.
  const L = LAKES[0];
  for (let i = 0; i < 120; i++) {
    const a = i / 120 * Math.PI * 2, [x, z] = shorePoint(L, a, 9), y = groundH(x, z);
    if (!Number.isFinite(y) || y < L.level + 0.5 || roadNear(x, z).d < 8 || lakeT(L, x, z) < 1.04) continue;
    cherry.push({x, y, z, s: 1.25 + hash2(i, 0, 333) * 0.5, ry: hash2(i, 0, 334) * 6});
    if (i % 18 === 0) details.push({g: benchGeo(), x, y, z, ry: -a - Math.PI / 2, s: 1.3});
  }

  // 해안 바위. 바다·절벽의 기존 높이를 바꾸지 않고 저지대 해안만 따른다.
  for (let i = 0; i < 110; i++) {
    const a = i / 110 * Math.PI * 2, cx = (WILD_POLY.x0 + WILD_POLY.x1) / 2, cz = (WILD_POLY.z0 + WILD_POLY.z1) / 2;
    let last: PathPoint | null = null;
    for (let r = 180; r < 950; r += 8) {
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (WILD_POLY.inside(x, z)) last = [x, z];
    }
    if (!last) continue;
    const [x, z] = last, y = groundH(x, z);
    if (Number.isFinite(y) && y > -9 && y < 8) details.push({g: coastalRock(i), x, y: y - 0.6, z, s: 0.7 + hash2(i, 1, 335) * 0.9});
  }
  const cherryGeo = mergeGeometries([
    cyl(0.25, 2.6, PAL.wood, 0, 0, 0, 0, 5), ico(2, 0, mix(PAL.pink, PAL.white, 0.4), 0, 3.6, 0), ico(1.2, 0, PAL.pink, 1, 3.6, 0.4),
  ]);
  const farTree = cone(2.3, 4.5, PAL.green, 0, 0, 0, 0, 5);
  root.add(landscapeBatch(fields, 'terraced-fields', 180), landscapeBatch(village, 'country-villages'), landscapeBatch(details, 'rural-details'));
  root.add(landscapeForest(roundTreeGeo(), farTree, orchard, 'orchards'));
  root.add(landscapeForest(roundTreeGeo(), farTree, groves, 'rural-copses'));
  root.add(landscapeForest(cherryGeo, cone(2.3, 4.5, PAL.pink, 0, 0, 0, 0, 5), cherry, 'lake-cherries'));
  root.userData.counts = {fields: fieldCount, villageBuildings: cottages + greenhouses, cottages, greenhouses, cherries: cherry.length, orchardTrees: orchard.length, groveTrees: groves.length};
  return root;
}
