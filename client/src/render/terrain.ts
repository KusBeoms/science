// 지형 메시 (docs/design/WORLD.md 7.1): 굽어 둔 높이 격자(core/heightmap.ts)에서 면마다 색을 칠한 플랫 셰이딩 메시를 뽑는다.
// 근거리 = 160u 타일(5u 격자, 플레이어 주변만 만들고 멀어지면 해제, 프레임당 1개) / 원경 = 대륙 전체를 10u 격자로 한 번에 1개.
// 면 색 = ramp(바이옴, 높이, 경사) + 면별 밝기 흔들림. 아직 잠긴 구역의 분지는 안개색으로 가려진다 (능선은 그대로 보임).
import {G} from '../core/runtime.js';
import {locked} from '../core/progress.js';
import {GX0, GZ0, NX, NZ, REG_CITY, REG_PASS, REG_WILD, STEP, bakeContinent, beachW, gridOf, CLIFF1} from '../core/heightmap.js';
import {BRIDGE_ENDS} from '../data/outline.js';
import {SECTORS} from '../data/sectors.js';
import {COUNTRY, DESERT, LAKES, LAKE_ROAD_W} from '../data/wild.js';
import {roadNear} from '../data/wild-road.js';
import {lakeT} from '../core/lake-shape.js';
import {CITY_HALF, SEA_Y, TERRAIN} from '../data/world-map.js';
import {registerLandmarkSolids} from './landmarks.js';
import {PAL, TINT, mix, ramp, rgb, type Biome} from './lowpoly/palette.js';
import {hash2} from './lowpoly/rng.js';
import {lowMat} from './lowpoly/merge.js';

/** 타일 한 변(샘플 칸 수 × STEP) */
const TCELLS = 32,
  TILE = TCELLS * STEP,
  TX = Math.ceil((NX - 1) / TCELLS),
  TZ = Math.ceil((NZ - 1) / TCELLS),
  /** 지형 전체를 이만큼 내려 기지 타일(윗면 y=0) 과 겹쳐 깜빡이지 않게 한다 */
  LOWER = 0.08,
  /** 원경 메시를 근거리 타일보다 더 내리는 양 */
  FAR_DROP = 0.35;

let root: any,
  farMesh: any,
  farMat: any,
  lockSig = '';
const tiles = new Map<number, {mesh: any; dirty: boolean}>();
/** 땅(또는 첫 낭떠러지 겹)이 있는 타일만 만든다 */
let hasLand: Uint8Array;

const GRASS = mix(PAL.green, PAL.ink, 0.5),
  CITY_GROUND = mix(PAL.slate, PAL.steel, 0.4),
  PASS_STONE = mix(PAL.paving, PAL.clay, 0.3);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const SAND = mix(PAL.bone, PAL.amber, 0.25),
  WET_SAND = mix(SAND, PAL.clay, 0.45);
/** 도시 둘레 띠: 남쪽 해변은 모래(물가는 젖은 모래), 나머지는 풀 → 바위 → 눈 */
function beltColor(cx: number, cz: number, y: number, slope: number): number {
  const bw = beachW(cx, cz);
  if (bw > 0.5 || y < SEA_Y + 1.5) return y < SEA_Y + 1.2 ? WET_SAND : SAND;
  let c = y < 9 ? mix(GRASS, PAL.stone, smooth(0, 9, y) * 0.5) : mix(PAL.stone, PAL.steel, smooth(9, 30, y));
  if (y > 33) c = mix(c, PAL.white, smooth(33, 41, y));
  return mix(c, PAL.stone, smooth(0.45, 0.8, slope) * 0.7);
}

const SANDY = mix(PAL.bone, PAL.amber, 0.45),
  DUNE = mix(SANDY, PAL.orange, 0.25),
  WHEAT = mix(PAL.yellow, PAL.amber, 0.4),
  TILLED = mix(PAL.clay, PAL.green, 0.2),
  MEADOW = mix(PAL.green, PAL.lime, 0.45);
/** 남부 야생지 색: 호수 바닥·물가 모래, 사막, 산(숲→바위→눈), 시골 농지 격자, 평야 */
const MUD = mix(PAL.clay, PAL.slate, 0.45),
  DEEP_BED = mix(PAL.slate, PAL.teal, 0.35),
  PEBBLE = mix(SANDY, PAL.stone, 0.35),
  VERGE = mix(PAL.clay, PAL.stone, 0.5);
/** 호수 바닥·물가 색 (호수 근처가 아니면 null): 깊을수록 모래 → 진흙 → 어두운 청회색, 수면 위 0.9u 는 젖은 자갈, 그 위 2u 는 풀과 섞인 모래 */
function lakeColor(cx: number, cz: number, y: number): {c: number; w: number} | null {
  for (const L of LAKES) {
    if (Math.abs(cx - L.x) > L.rx * 1.5 || Math.abs(cz - L.z) > L.rx * 1.5) continue;
    if (lakeT(L, cx, cz) > 1.4) continue;
    const dep = L.level - y;
    if (dep > 0.3) return {c: mix(mix(SANDY, MUD, smooth(0.3, 4, dep)), DEEP_BED, smooth(4, 13, dep)), w: 1};
    if (dep > -0.9) return {c: PEBBLE, w: 1};
    if (dep > -2.6) return {c: SANDY, w: 0.7 * (1 - (-dep - 0.9) / 1.7)};
  }
  return null;
}
function wildColor(cx: number, cz: number, y: number, slope: number): number {
  const lk = lakeColor(cx, cz, y);
  if (lk && lk.w >= 1) return lk.c;
  if (!lk && y < SEA_Y - 1.5) return mix(PAL.slate, PAL.teal, 0.4);
  if (!lk && y < SEA_Y + 1) return SANDY;
  const rd = roadNear(cx, cz).d;
  if (rd < LAKE_ROAD_W / 2 + 3.5) return mix(mix(PAL.asphalt, PAL.stone, 0.45), VERGE, smooth(LAKE_ROAD_W / 2 - 1, LAKE_ROAD_W / 2 + 3, rd));
  const desert = smooth(DESERT.x0 - 30, DESERT.x0 + 30, cx) * smooth(DESERT.z0 - 30, DESERT.z0 + 30, cz);
  let c = MEADOW; // 농지는 rural-landscape의 실제 패치로 배치하고 바탕은 연속 초지로 둔다.
  if (hash2(Math.floor(cx / 7), Math.floor(cz / 7), 9) < 0.25) c = mix(c, PAL.green, 0.25);
  c = mix(c, hash2(Math.floor(cx / 5), Math.floor(cz / 5), 3) < 0.5 ? SANDY : DUNE, desert);
  if (y > 6) c = mix(c, GRASS, smooth(6, 26, y));
  if (y > 36) c = mix(c, PAL.stone, smooth(36, 60, y));
  if (y > 68) c = mix(c, PAL.white, smooth(68, 80, y));
  if (lk) c = mix(c, lk.c, lk.w);
  return mix(c, PAL.stone, smooth(0.5, 0.85, slope) * 0.6);
}
/** 면(중심 cx,cz · 평균 높이 y · 경사 slope=sin각) 의 색 */
function faceColor(reg: number, cx: number, cz: number, y: number, slope: number): number {
  let c: number;
  if (reg === REG_CITY) {
    if (Math.max(Math.abs(cx), Math.abs(cz)) > CITY_HALF) return beltColor(cx, cz, y, slope);
    // 도시 안에서는 북서 언덕과 낭떠러지 경사면만 그려진다 (평지는 render/city 지면)
    c = y > 0.4 ? mix(CITY_GROUND, GRASS, Math.min(1, y / 4)) : CITY_GROUND;
    c = mix(c, PAL.stone, smooth(0.35, 0.75, slope) * 0.8);
  } else if (reg === REG_WILD) {
    c = wildColor(cx, cz, y, slope);
  } else if (reg === REG_PASS) {
    // 임시 다리: 중심선은 아스팔트 (BRIDGE 에이전트가 금문교로 대체)
    c = mix(Math.abs(cx - BRIDGE_ENDS.x) < 8 ? PAL.asphalt : PASS_STONE, PAL.stone, smooth(0.35, 0.75, slope) * 0.8);
  } else {
    const i = reg - 1,
      s = SECTORS[i],
      m = TERRAIN[s.id],
      stripe = m.stripe ? Math.sin(cz * 0.22) * m.stripe : 0;
    c = ramp(s.id as Biome, (y + 3) / (m.ridge.h + 6) + stripe, slope);
    if (locked(i)) {
      const ds = s.size / 2 - Math.max(Math.abs(cx - s.center.x), Math.abs(cz - s.center.z));
      c = mix(c, TINT.day.fog, 0.8 * smooth(m.ridge.w * 0.5, m.ridge.w * 1.3, ds)); // 잠긴 분지는 안개 속
    }
  }
  return y < -2 ? mix(c, PAL.ink, Math.min(0.75, (-y - 2) / 30)) : c; // 낭떠러지 아래는 허공 쪽으로 어두워진다
}

/** 샘플 격자 [i0,i1]×[j0,j1] 을 k 칸 간격으로 훑어 플랫 셰이딩 지오메트리를 만든다. far 면 이웃 중 낮은 값을 써서 근거리 메시를 뚫지 않게 한다 */
function buildGeo(i0: number, j0: number, i1: number, j1: number, k: number, far: boolean): any {
  const {h, reg} = gridOf(),
    at = (i: number, j: number) => {
      const v = h[j * NX + i];
      if (!far || v < CLIFF1 + 1) return v;
      let m = v;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const a = Math.min(NX - 1, Math.max(0, i + di)),
            b = Math.min(NZ - 1, Math.max(0, j + dj)),
            w = h[b * NX + a];
          if (w > CLIFF1 + 1 && w < m) m = w;
        }
      return m;
    };
  const cells: number[] = [];
  for (let j = j0; j < j1; j += k)
    for (let i = i0; i < i1; i += k) {
      const b = Math.min(i + k, i1),
        d = Math.min(j + k, j1);
      const ha = h[j * NX + i], hb = h[j * NX + b], hc = h[d * NX + i], hd = h[d * NX + b];
      if (Math.max(ha, hb, hc, hd) < CLIFF1) continue;
      // 도시의 평평한 안쪽은 render/city 의 지면이 덮으므로 만들지 않는다
      const inCity = (v: number, o: number) => v >= -CITY_HALF && o <= CITY_HALF;
      if (!ha && !hb && !hc && !hd && inCity(GX0 + i * STEP, GX0 + b * STEP) && inCity(GZ0 + j * STEP, GZ0 + d * STEP)) continue;
      cells.push(i, j, b, d);
    }
  const n = cells.length / 4,
    pos = new Float32Array(n * 18),
    nor = new Float32Array(n * 18),
    col = new Float32Array(n * 18);
  let o = 0;
  const tri = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, r: number, seed: number) => {
    // 윗면(+y) 이 앞이 되게 감는다
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (ny < 0) {
      [bx, by, bz, cx, cy, cz] = [cx, cy, cz, bx, by, bz];
      nx = -nx; ny = -ny; nz = -nz;
    }
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    const slope = Math.sqrt(Math.max(0, 1 - ny * ny));
    for (const [px, py, pz] of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]]) {
      pos[o] = px; pos[o + 1] = py; pos[o + 2] = pz;
      nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
      // 같은 월드 정점은 같은 색: 타일 경계와 삼각형 대각선의 얼룩을 줄인다.
      const c = faceColor(r, px, pz, py, slope), jitter = (hash2(Math.floor(px / 18), Math.floor(pz / 18), 5) - 0.5) * 0.025;
      const [cr, cg, cb] = rgb(mix(c, jitter > 0 ? PAL.white : PAL.ink, Math.abs(jitter)));
      col[o] = cr; col[o + 1] = cg; col[o + 2] = cb;
      o += 3;
    }
  };
  for (let c = 0; c < cells.length; c += 4) {
    const [i, j, b, d] = [cells[c], cells[c + 1], cells[c + 2], cells[c + 3]],
      x0 = GX0 + i * STEP, x1 = GX0 + b * STEP, z0 = GZ0 + j * STEP, z1 = GZ0 + d * STEP,
      ha = at(i, j), hb = at(b, j), hc = at(i, d), hd = at(b, d),
      r = reg[j * NX + i],
      seed = i * 977 + j;
    if (((i + j) / k) & 1) {
      tri(x0, ha, z0, x1, hb, z0, x1, hd, z1, r, seed);
      tri(x0, ha, z0, x1, hd, z1, x0, hc, z1, r, seed + 1);
    } else {
      tri(x0, ha, z0, x1, hb, z0, x0, hc, z1, r, seed);
      tri(x1, hb, z0, x1, hd, z1, x0, hc, z1, r, seed + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}

const sig = () => SECTORS.map((_, i) => (locked(i) ? 1 : 0)).join('');

function makeTile(ti: number, tj: number) {
  const g = buildGeo(ti * TCELLS, tj * TCELLS, Math.min(NX - 1, (ti + 1) * TCELLS), Math.min(NZ - 1, (tj + 1) * TCELLS), 1, false),
    mesh = new THREE.Mesh(g, lowMat());
  mesh.name = `terrain-near-${ti},${tj}`;
  mesh.position.y = -LOWER;
  root.add(mesh);
  return mesh;
}
function makeFar() {
  if (farMesh) {
    farMesh.traverse((m: any) => { if (m.geometry) m.geometry.dispose(); });
    root.remove(farMesh);
  }
  // 세계 전체를 한 구로 컬링하면 화면 밖 섬까지 늘 그린다. 320u 청크로 나눠 시야별로 거절한다.
  farMesh = new THREE.Group();
  farMesh.name = 'terrain-distant';
  for (let j = 0; j < NZ - 1; j += 64) for (let i = 0; i < NX - 1; i += 64) {
    const g = buildGeo(i, j, Math.min(NX - 1, i + 64), Math.min(NZ - 1, j + 64), 4, true);
    if (!g.attributes.position.count) { g.dispose(); continue; }
    const mesh = new THREE.Mesh(g, farMat);
    mesh.name = `terrain-distant-${i},${j}`;
    mesh.position.y = -LOWER - FAR_DROP;
    farMesh.add(mesh);
  }
  root.add(farMesh);
}

/** 지형 준비: 높이 굽기 → 타일 목록 → 원경 메시. initWorld 에서 한 번 */
export function initTerrain() {
  bakeContinent();
  const {h} = gridOf();
  hasLand = new Uint8Array(TX * TZ);
  for (let tj = 0; tj < TZ; tj++)
    for (let ti = 0; ti < TX; ti++)
      for (let j = tj * TCELLS; j <= Math.min(NZ - 1, (tj + 1) * TCELLS) && !hasLand[tj * TX + ti]; j++)
        for (let i = ti * TCELLS; i <= Math.min(NX - 1, (ti + 1) * TCELLS); i++)
          if (h[j * NX + i] >= CLIFF1) {
            hasLand[tj * TX + ti] = 1;
            break;
          }
  root = new THREE.Group();
  root.name = 'terrain';
  G.scene.add(root);
  farMat = new THREE.MeshLambertMaterial({vertexColors: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2});
  farMat.userData.keep = true;
  lockSig = sig();
  makeFar();
  registerLandmarkSolids();
}

/** 매 프레임: 플레이어 주변 타일을 만들고(프레임당 1개) 멀어진 타일은 해제한다. 해금 상태가 바뀌면 색을 다시 칠한다 */
export function streamTerrain(load: number, unload: number) {
  const p = G.me.pos,
    now = sig();
  if (now !== lockSig) {
    lockSig = now;
    tiles.forEach(t => (t.dirty = true));
    makeFar();
  }
  let busy = false;
  for (let tj = 0; tj < TZ; tj++)
    for (let ti = 0; ti < TX; ti++) {
      const x0 = GX0 + ti * TILE,
        z0 = GZ0 + tj * TILE,
        d = Math.hypot(Math.max(x0 - p.x, 0, p.x - (x0 + TILE)), Math.max(z0 - p.z, 0, p.z - (z0 + TILE))),
        key = tj * TX + ti,
        t = tiles.get(key);
      if (t && d > unload) {
        root.remove(t.mesh);
        t.mesh.geometry.dispose();
        tiles.delete(key);
      } else if (t && t.dirty && !busy) {
        t.mesh.geometry.dispose();
        root.remove(t.mesh);
        t.mesh = makeTile(ti, tj);
        t.dirty = false;
        busy = true;
      } else if (!t && d < load && hasLand[key] && !busy) {
        tiles.set(key, {mesh: makeTile(ti, tj), dirty: false});
        busy = true;
      }
    }
}

/** 디버그·검증용: 로드된 근거리 타일 수와 그 삼각형 수 (원경 포함 전체는 renderer.info) */
export function terrainStats() {
  let tris = 0;
  tiles.forEach(t => (tris += t.mesh.geometry.attributes.position.count / 3));
  let farTris = 0;
  if (farMesh) farMesh.traverse((m: any) => { if (m.geometry) farTris += m.geometry.attributes.position.count / 3; });
  return {tiles: tiles.size, tris, farTris};
}
