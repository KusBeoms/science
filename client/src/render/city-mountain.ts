// 도시 둘레 산악 렌더 (W7 CITY_SURROUND): 동쪽 반도의 산악 도로(노면·중앙선·가드레일) + 정상 천문대, 북쪽 주봉의 철탑, 눈 지붕 바위, 비탈 숲.
// 높이·도로 선은 core/belt-height.ts·data/mountain-road.ts 를 읽기만 한다. 숲은 landscapeForest(근거리 100u/원경 300u 청크 LOD), 나머지는 칸 병합.
import {groundH, addSolid} from '../core/terrain.js';
import {CITY_POLY, BRIDGE_ENDS} from '../data/outline.js';
import {CITY_HALF, SEA_Y} from '../data/world-map.js';
import {MOUNTAIN_ROAD, MROAD_W, OBS, mroadNear} from '../data/mountain-road.js';
import {fringeKeepOut} from '../data/city-fringe.js';
import {PAL, mix} from './lowpoly/palette.js';
import {box} from './lowpoly/prim.js';
import {instancedChunks, lowMat, type Inst, type Placed} from './lowpoly/merge.js';
import {beam} from './lowpoly/structure.js';
import {hash2, fbm} from './lowpoly/rng.js';
import {landscapeBatch, landscapeForest} from './landscape-batch.js';
import {terrainRibbon, type PathPoint} from './landscape-surface.js';
import {pineGeo} from './city/props.js';
import {farPine, observatoryPlaza, peakTower, snowPine, snowRock} from './city-mountain-parts.js';

/** 북쪽 주봉(철탑 자리)을 찾는다: 후보 구역에서 가장 높은 지점 */
export function findNorthPeak(): {x: number; y: number; z: number} {
  let best = {x: 140, y: -1e9, z: -640};
  for (let x = 60; x <= 260; x += 4)
    for (let z = -720; z <= -560; z += 4) {
      const y = groundH(x, z);
      if (y > best.y) best = {x, y, z};
    }
  return best;
}

/** 도로 한 구간(점 목록)에서 일정 간격으로 (위치, 접선) 표본 */
function roadSamples(step: number) {
  const out: {x: number; z: number; tx: number; tz: number; y: number}[] = [];
  let next = 0;
  for (let i = 1; i < MOUNTAIN_ROAD.length - 1; i++) {
    const p = MOUNTAIN_ROAD[i];
    if (p.s < next) continue;
    next = p.s + step;
    const a = MOUNTAIN_ROAD[i - 1], b = MOUNTAIN_ROAD[i + 1], l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    out.push({x: p.x, z: p.z, tx: (b.x - a.x) / l, tz: (b.z - a.z) / l, y: p.y});
  }
  return out;
}

function roadParts(): Placed[] {
  const parts: Placed[] = [],
    pts: PathPoint[] = MOUNTAIN_ROAD.filter(p => Math.abs(p.x) > CITY_HALF - 3 || Math.abs(p.z) > CITY_HALF - 3).map(p => [p.x, p.z] as PathPoint);
  parts.push({g: terrainRibbon(pts, MROAD_W + 3.4, mix(PAL.paving, PAL.stone, 0.3), 0.07)});
  parts.push({g: terrainRibbon(pts, MROAD_W, PAL.asphalt, 0.13)});
  // 중앙선: 노란 점선(8u 도막, 8u 간격)
  for (let i = 0; i + 2 < pts.length; i += 4) parts.push({g: terrainRibbon(pts.slice(i, i + 3), 0.32, PAL.yellow, 0.2)});
  // 가드레일: 낭떠러지 쪽(옆 6u 지면이 길보다 1.4u 이상 낮은 곳)에만 말뚝 + 레일
  const posts: Placed[] = [],
    rail = (a: [number, number, number], b: [number, number, number]) => parts.push({g: beam(a, b, 0.18, PAL.ash, 0.5)});
  for (const side of [-1, 1]) {
    let prev: [number, number, number] | null = null;
    for (const s of roadSamples(5)) {
      if (Math.abs(s.x) < CITY_HALF + 6 && Math.abs(s.z) < CITY_HALF + 6) { prev = null; continue; }
      const off = MROAD_W / 2 + 1.6,
        x = s.x - s.tz * off * side,
        z = s.z + s.tx * off * side,
        gy = groundH(x, z),
        drop = groundH(s.x - s.tz * (off + 5) * side, s.z + s.tx * (off + 5) * side);
      if (!Number.isFinite(gy) || !Number.isFinite(drop) || s.y - drop < 1.4) { prev = null; continue; }
      const y = Math.max(gy, s.y);
      posts.push({g: box(0.22, 1.1, 0.22, PAL.steel), x, y, z});
      const top: [number, number, number] = [x, y + 0.85, z];
      if (prev) rail(prev, top);
      prev = top;
    }
  }
  return [...parts, ...posts];
}

export function buildCityMountain() {
  const root = new THREE.Group();
  root.name = 'city-mountain';
  const landmarks: Placed[] = [...roadParts()];
  // 정상 천문대 광장 (충돌: 돔 기단)
  const oy = groundH(OBS.x, OBS.z);
  if (Number.isFinite(oy)) {
    for (const p of observatoryPlaza(OBS.r)) landmarks.push({...p, x: OBS.x + (p.x ?? 0), y: oy + (p.y ?? 0), z: OBS.z + (p.z ?? 0)});
    addSolid(OBS.x - 12, OBS.z - 12, OBS.x + 12, OBS.z + 12);
  }
  // 북쪽 주봉 철탑
  const pk = findNorthPeak();
  landmarks.push({g: peakTower(36), x: pk.x, y: pk.y, z: pk.z});
  addSolid(pk.x - 3.4, pk.z - 3.4, pk.x + 3.4, pk.z + 3.4);
  root.add(landscapeBatch(landmarks, 'mountain-landmarks', 100));
  root.userData.peak = pk;

  // 비탈 숲·눈 지붕 바위: 지면 높이·경사·도로·다리 진입로·시가지를 읽어 배치
  const pines: Inst[] = [], snowy: Inst[] = [], rocksBare: Inst[] = [], rocksSnow: Inst[] = [];
  const bx = CITY_POLY.x0 + 8, bz = CITY_POLY.z0 + 8;
  for (let gx = bx; gx < CITY_POLY.x1; gx += 13.5)
    for (let gz = bz; gz < CITY_POLY.z1; gz += 13.5) {
      const x = gx + (hash2(gx, gz, 310) - 0.5) * 9, z = gz + (hash2(gx, gz, 311) - 0.5) * 9;
      if (Math.max(Math.abs(x), Math.abs(z)) < CITY_HALF + 12 || !CITY_POLY.inside(x, z)) continue;
      const y = groundH(x, z);
      if (!Number.isFinite(y) || y < SEA_Y + 2.2) continue;
      if (z > CITY_HALF && Math.abs(x - BRIDGE_ENDS.x) < 55) continue;
      if (mroadNear(x, z).d < MROAD_W / 2 + 6 || Math.hypot(x - OBS.x, z - OBS.z) < OBS.r + 6) continue;
      if (fringeKeepOut(x, z, 3)) continue;
      if (x > 330 && x < 440 && z > 300) continue; // 남동 요트항 배후
      const slope = Math.max(Math.abs(groundH(x + 3, z) - y), Math.abs(groundH(x, z + 3) - y)) / 3,
        r = hash2(gx, gz, 312),
        line = 52 + 12 * (fbm(x * 0.03, z * 0.03, 2, 8) - 0.5);
      if (y > 1.5 && slope < 0.95) {
        const dens = y < 30 ? 0.62 : 0.62 * (1 - (y - 30) / (line - 30));
        if (y < line && r < dens) {
          (y > line - 14 ? snowy : pines).push({x, y, z, s: 1.4 + hash2(gx, gz, 313) * 1.3, ry: hash2(gx, gz, 314) * 6});
          continue;
        }
      }
      if (y > 22 && slope > 0.3 && r > 0.945) {
        const snowed = y > 56 + 10 * (fbm(x * 0.03, z * 0.03, 2, 8) - 0.5);
        (snowed ? rocksSnow : rocksBare).push({x, y: y - 0.5, z, s: 0.8 + hash2(gx, gz, 315) * 1.6, ry: hash2(gx, gz, 316) * 6});
      }
    }
  root.add(
    landscapeForest(pineGeo(), farPine(), pines, 'mountain-pines'),
    landscapeForest(snowPine(), farPine(), snowy, 'mountain-snow-pines'),
    instancedChunks(snowRock(1, false), lowMat(), rocksBare, 120, 8),
    instancedChunks(snowRock(2, true), lowMat(), rocksSnow, 120, 8),
  );
  root.userData.counts = {pines: pines.length, snowy: snowy.length, rocks: rocksBare.length + rocksSnow.length};
  return root;
}
