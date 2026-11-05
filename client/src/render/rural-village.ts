// 시골 섬 마을 렌더(W7 RURAL): 서쪽 마을(광장·십자 골목), 북서 호수 마을(호안 순환 산책로·선착장·보트), 간선 옆 마을, 남서·목장 농가(헛간·사일로·풍차·창고·건초).
// 모든 건물은 열린 땅(경사·도로·호수·개울·밭·교도소 회피)에만 앉고 기단을 깔며 충돌체를 등록한다. 병합 — 칸(100u) 단위 메시.
import {groundH, addSolid, solidAt} from '../core/terrain.js';
import {addDeck} from '../core/deck.js';
import {lakeT, shorePoint} from '../core/lake-shape.js';
import {JAIL, LAKES, COUNTRY} from '../data/wild.js';
import {STREAMS, STREAM_W, LOT} from '../data/wild-mountain.js';
import {WEST_PLAZA, ROAD_LINES, roadLine, roadNear} from '../data/wild-road.js';
import {inParcel} from '../data/wild-fields.js';
import {trailNear} from '../core/wild-trail.js';
import {segDist} from '../core/wild-base.js';
import {PAL, mix} from './lowpoly/palette.js';
import {box} from './lowpoly/prim.js';
import {hash2} from './lowpoly/rng.js';
import {type Placed, type Inst} from './lowpoly/merge.js';
import {terrainRibbon, type PathPoint} from './landscape-surface.js';
import {greenhouse} from './rural-art.js';
import {barn, boat, cottage, dockPost, haystack, silo, smallHouse, warehouse, well, walkway} from './rural-models.js';
import {worldPart} from './rural-fields.js';

const ROOFS = [PAL.tileRed, PAL.tileRed, PAL.brick, PAL.tileBlue, PAL.slate];
const PATH = mix(PAL.bone, PAL.clay, 0.55);
const POND = LAKES[1];

export interface VillageBuild {
  village: Placed[];
  details: Placed[];
  paths: Placed[];
  lamps: Inst[];
  counts: {cottages: number; farmBuildings: number; greenhouses: number};
}

const inJail = (x: number, z: number, m = 12) => x > JAIL.flat[0] - m && x < JAIL.flat[2] + m && z > JAIL.flat[1] - m && z < JAIL.flat[3] + m;

export function buildVillages(): VillageBuild {
  const village: Placed[] = [], details: Placed[] = [], paths: Placed[] = [], lamps: Inst[] = [];
  const counts = {cottages: 0, farmBuildings: 0, greenhouses: 0};
  const path = (pts: readonly PathPoint[], w = 2.6, lift = 0.2) => {
    if (pts.length > 1) paths.push(worldPart(terrainRibbon(pts, w, PATH, lift), pts[0][0], pts[0][1]));
  };
  const line = (a: PathPoint, b: PathPoint, step = 6): PathPoint[] => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    return Array.from({length: n + 1}, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n] as PathPoint);
  };
  const open = (x: number, z: number, r: number) => {
    const y = groundH(x, z);
    if (!Number.isFinite(y) || y < -1.6 || inJail(x, z, r + 6) || solidAt(x, z, r)) return false;
    const rd = roadNear(x, z);
    if (rd.d < rd.hw + r + 2 || LAKES.some(L => lakeT(L, x, z) < 1.12) || trailNear(x, z).d < r + 3 || inParcel(x, z, r * 0.5)) return false;
    if (Math.hypot(x - LOT.x, z - LOT.z) < 32) return false;
    return !STREAMS.some(s => s.pts.some((p, i) => i < s.pts.length - 1 && segDist(x, z, p[0], p[1], s.pts[i + 1][0], s.pts[i + 1][1]) < STREAM_W + r + 1));
  };
  /** 건물 한 동: 모서리 4곳이 열린 땅이고 높이 차 ≤ 1.9 이면 기단 + 모델 + 충돌체 */
  const building = (g: any, x: number, z: number, w: number, d: number, ry = 0, kind: 'house' | 'farm' = 'house') => {
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)), hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
    const corner = [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]];
    if (!open(x, z, Math.max(hw, hd) * 0.8) || corner.some(([dx, dz]) => !open(x + dx, z + dz, 0.8))) return false;
    const hs = corner.map(([dx, dz]) => groundH(x + dx, z + dz)), y0 = Math.min(...hs), y1 = Math.max(...hs);
    if (y1 - y0 > 1.9) return false;
    const y = y1 + 0.06;
    village.push({g: box(hw * 2 + 0.5, y - y0 + 0.15, hd * 2 + 0.5, PAL.stone), x, y: y0 - 0.1, z});
    village.push({g, x, y, z, ry});
    addSolid(x - hw, z - hd, x + hw, z + hd);
    kind === 'house' ? counts.cottages++ : counts.farmBuildings++;
    return true;
  };
  const roadPoint = (x: number, z: number): PathPoint => {
    let out: PathPoint = [x, z], best = Infinity;
    for (const rd of ROAD_LINES) for (let i = 0; i < rd.pts.length - (rd.closed ? 0 : 1); i++) {
      const a = rd.pts[i], b = rd.pts[(i + 1) % rd.pts.length], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      const px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < best) { best = d; out = [px, pz]; }
    }
    return out;
  };
  const access = (x: number, z: number, ry: number, target: PathPoint) => {
    const pts = line([x + Math.sin(ry) * 6.7, z + Math.cos(ry) * 6.7], target, 3);
    if (Math.hypot(target[0] - x, target[1] - z) > 65 || pts.some(([px, pz]) => LAKES.some(L => lakeT(L, px, pz) < 1.08) || inJail(px, pz, 2) || inParcel(px, pz, 0.3))) return;
    path(pts, 1.8);
  };
  const house = (x: number, z: number, ry: number, k: number, target?: PathPoint) => {
    const roof = ROOFS[Math.floor(hash2(Math.round(x), Math.round(z), 11 + k) * ROOFS.length)];
    const placed = hash2(Math.round(x), Math.round(z), 12) < 0.45 ? building(smallHouse(roof), x, z, 8, 7, ry) : building(cottage(roof), x, z, 10, 8, ry);
    if (placed) access(x, z, ry, target ?? roadPoint(x, z));
    return placed;
  };
  const doorTo = (hx: number, hz: number, tx: number, tz: number) => Math.atan2(tx - hx, tz - hz); // 로컬 +z(문)가 (tx,tz) 쪽
  const lamp = (x: number, z: number) => lamps.push({x, y: groundH(x, z), z});

  // ---- 서쪽 마을: 광장 + 십자 골목 + 양쪽 집 ----
  const [px, pz] = WEST_PLAZA;
  path(line([px - 56, pz], [px + 58, pz]), 3.2);
  path(line([px, pz - 60], [px, pz + 34]), 3.2);
  details.push({g: well(), x: px + 7, y: groundH(px + 7, pz - 7), z: pz - 7});
  addSolid(px + 5.5, pz - 8.5, px + 8.5, pz - 5.5);
  for (let t = -48; t <= 52; t += 15) {
    if (Math.abs(t) < 11) continue;
    house(px + t, pz - 13, 0, 1, [px + t, pz]);
    house(px + t + 5, pz + 13, Math.PI, 2, [px + t + 5, pz]);
  }
  for (let t = -52; t <= -18; t += 15) {
    house(px - 13, pz + t, Math.PI / 2, 3, [px, pz + t]);
    house(px + 13, pz + t - 4, -Math.PI / 2, 4, [px, pz + t - 4]);
  }
  for (const [lx, lz] of [[px - 9, pz - 9], [px + 9, pz + 9], [px - 30, pz + 9], [px + 30, pz - 9]]) lamp(lx, lz);
  // 마을 변두리 창고 + 비닐하우스 두 동
  building(warehouse(), px - 40, pz + 38, 20, 10, 0.1, 'farm');
  for (const [gx, gz] of [[px + 44, pz + 36], [px + 62, pz + 34]]) if (building(greenhouse(), gx, gz, 10, 18, 0.1, 'farm')) counts.greenhouses++;

  // ---- 북서 호수 마을: 순환 산책로 · 호안 집 · 선착장 ----
  const walk: PathPoint[] = [];
  for (let i = 0; i <= 90; i++) walk.push(shorePoint(POND, (i / 90) * Math.PI * 2, 19));
  path(walk, 2.8, 0.22);
  for (let i = 0; i < 22; i++) {
    const a = 0.25 + (i / 22) * Math.PI * 2, [x, z] = shorePoint(POND, a, 36);
    if (!house(x, z, doorTo(x, z, POND.x, POND.z), 5, shorePoint(POND, a, 19))) continue;
    if (i % 6 === 0) lamp(...shorePoint(POND, a + 0.05, 16));
  }
  // 선착장: 동쪽 물가에서 호수 안으로 뻗는 데크(걸어 올라갈 수 있다) + 말뚝 + 보트 둘
  const [sx, sz] = shorePoint(POND, 0.02, 0), dy = POND.level + 0.9, dx0 = sx + 10, dx1 = sx - 24;
  for (let x = dx0; x > dx1; x -= 3.2) details.push({g: box(3.2, 0.35, 3, PAL.wood), x: x - 1.6, y: dy - 0.35, z: sz});
  for (let x = dx0; x > dx1; x -= 6.4) for (const k of [-1.3, 1.3]) details.push({g: dockPost(), x, y: POND.level - 2.4, z: sz + k});
  addDeck({id: 'rural-pond-dock', ax: dx0, az: sz, bx: dx1, bz: sz, hw: 1.5, h0: dy, h1: dy});
  const landingX = sx + 21, landingY = groundH(landingX, sz) + 0.15, rampLen = landingX - dx0;
  details.push({g: walkway(3, rampLen, dy - landingY), x: (landingX + dx0) / 2, y: landingY - 0.22, z: sz, ry: -Math.PI / 2});
  addDeck({id: 'rural-pond-gangway', ax: landingX, az: sz, bx: dx0, bz: sz, hw: 1.5, h0: landingY, h1: dy});
  path(line([landingX + 3, sz], [landingX, sz]), 2.8, 0.2);
  details.push({g: boat(), x: dx1 + 8, y: POND.level + 0.05, z: sz + 5.5, ry: 1.6}, {g: boat(), x: dx1 + 16, y: POND.level + 0.05, z: sz - 6, ry: 1.2});
  lamp(sx + 6, sz + 3);
  lamp(sx - 10, sz - 2.4);

  // ---- 간선 옆 마을(호수 마을 길 따라) ----
  const vr = roadLine('village').pts;
  let spacing = 0;
  for (let i = 1; i < vr.length - 1; i++) {
    const a = vr[i], b = vr[i + 1], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    spacing += l;
    if (spacing < 28) continue;
    spacing = 0;
    for (const side of [-1, 1]) {
      const tx = (a.x + b.x) / 2, tz = (a.z + b.z) / 2, x = tx - dz / l * 16 * side, z = tz + dx / l * 16 * side;
      house(x, z, doorTo(x, z, tx, tz), 6, [tx, tz]);
    }
  }

  // ---- 남서 농가 마당 + 목장 농가 ----
  const sw: [number, number] = [-318, 1598];
  building(barn(), sw[0], sw[1], 14, 10, 0.2, 'farm');
  building(silo(), sw[0] + 14, sw[1] - 4, 6, 6, 0, 'farm');
  house(sw[0] - 18, sw[1] + 4, 0.3, 7);
  for (let k = 0; k < 4; k++) details.push({g: haystack(), x: sw[0] - 6 + k * 3.8, y: groundH(sw[0] - 6 + k * 3.8, sw[1] + 15), z: sw[1] + 15});
  path(line([sw[0], sw[1] + 8], [sw[0] + 28, sw[1] + 8]), 3.2);
  path(line([sw[0] + 28, sw[1] + 8], [-292, 1552]), 2.6);
  const [cx0, cz0, cx1] = COUNTRY;
  building(barn(), cx0 + 22, cz0 - 14, 14, 10, 0, 'farm');
  building(silo(), cx0 + 38, cz0 - 12, 6, 6, 0, 'farm');
  house(cx0 + 62, cz0 - 12, 0, 8);
  building(barn(), cx1 + 16, cz0 + 40, 14, 10, Math.PI / 2, 'farm');
  house(cx1 + 16, cz0 + 72, Math.PI / 2, 9, [cx1 + 26, cz0 + 72]);
  for (let k = 0; k < 5; k++) details.push({g: haystack(), x: cx0 + 14 + k * 4, y: groundH(cx0 + 14 + k * 4, cz0 - 28), z: cz0 - 28});
  // 목장 울타리 바깥 농가를 농로에 잇는 마당. 소 방목 공간은 통과하지 않는다.
  path(line([cx0 + 14, cz0 - 5], [cx0 + 72, cz0 - 5]), 3.2);
  path(line([cx0 + 72, cz0 - 5], [cx0 + 72, cz0 - 28]), 2.4);
  path(line([cx1 + 26, cz0 + 26], [cx1 + 26, cz0 + 82]), 3.2);
  path(line([cx1 + 26, cz0 + 82], [-148, cz0 + 82]), 2.4);
  path(line([cx0 + 14, cz0 - 5], [cx0 - 14, cz0 - 5]), 2.4);
  path(line([cx0 - 14, cz0 - 5], [cx0 - 14, 1180]), 2.4);
  path(line([cx0 - 14, 1180], [-332, 1185]), 2.4);

  return {village, details, paths, lamps, counts};
}
