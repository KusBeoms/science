// 시골 섬 농지 렌더(W7 RURAL): data/wild-fields.ts 의 패치 하나하나를 지형 위에 깐다 — 지형은 패치 자리가 이미 평평한 단(core/wild-height.ts)이라 밭면이 지면에 딱 붙는다.
// 패치(노랑·연두·갈색 줄무늬) + 흙 둑 + 수로 + 허수아비·건초 더미·비닐하우스 + 과수원 나무. 병합(칸 180u) · 과수원은 landscapeForest LOD.
import {groundH, addSolid} from '../core/terrain.js';
import {PARCELS, type Parcel, type CropKind} from '../data/wild-fields.js';
import {PAL, mix, rgb} from './lowpoly/palette.js';
import {cyl} from './lowpoly/prim.js';
import {hash2} from './lowpoly/rng.js';
import {mergeGeometries, type Placed, type Inst} from './lowpoly/merge.js';
import {terrainRibbon, type PathPoint} from './landscape-surface.js';
import {greenhouse, scarecrow} from './rural-art.js';

const CROP: Record<CropKind, number> = {
  rice: mix(PAL.amber, PAL.clay, 0.1),
  paddy: mix(PAL.lime, PAL.green, 0.45),
  pale: mix(PAL.yellow, PAL.lime, 0.45),
  soil: mix(PAL.clay, PAL.green, 0.18),
  meadow: mix(PAL.green, PAL.lime, 0.3),
  orchard: mix(PAL.green, PAL.lime, 0.5),
};
const BUND = mix(PAL.clay, PAL.bone, 0.3),
  DITCH = mix(PAL.blue, PAL.teal, 0.3);

/** 월드 좌표 지오메트리를 (x,z) 기준으로 되돌려 칸 병합에 넘긴다 */
export const worldPart = (g: any, x: number, z: number): Placed => {
  g.translate(-x, 0, -z);
  return {g, x, z};
};

/** 밭 한 조각: ≤8u 칸으로 나눠 지면 높이를 따라가며, 짧은 변 방향 줄마다 명암을 번갈아 이랑 느낌을 낸다 */
function fieldGeo(p: Parcel) {
  const pos: number[] = [], col: number[] = [], base = rgb(CROP[p.kind]);
  const n = Math.max(1, Math.ceil(p.w / 8)), m = Math.max(1, Math.ceil(p.d / 8));
  const at = (i: number, j: number) => {
    const u = (i / n - 0.5) * p.w, v = (j / m - 0.5) * p.d, x = p.x + u * p.c - v * p.s, z = p.z + u * p.s + v * p.c;
    return [x, groundH(x, z) + 0.14, z];
  };
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const q = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)];
    if (q.some(a => !Number.isFinite(a[1]) || a[1] < -2.6)) continue;
    const k = i % 2 ? 0.93 : 1.04;
    for (const t of [0, 2, 1, 1, 2, 3]) {
      pos.push(...q[t]);
      col.push(base[0] * k, base[1] * k, base[2] * k);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}
/** 패치 둘레를 감싸는 둑 점들(닫힌 사각형, 7u 간격) */
function bundPts(p: Parcel, grow: number): PathPoint[] {
  const out: PathPoint[] = [], hw = p.w / 2 + grow, hd = p.d / 2 + grow;
  const corners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [-hw, -hd]];
  for (let k = 0; k < 4; k++) {
    const [a, b] = [corners[k], corners[k + 1]], len = Math.hypot(b[0] - a[0], b[1] - a[1]), c = Math.max(1, Math.ceil(len / 7));
    for (let i = 0; i < c; i++) {
      const u = a[0] + ((b[0] - a[0]) * i) / c, v = a[1] + ((b[1] - a[1]) * i) / c;
      out.push([p.x + u * p.c - v * p.s, p.z + u * p.s + v * p.c]);
    }
  }
  out.push(out[0]);
  return out;
}

export interface FieldBuild {
  fields: Placed[];
  details: Placed[];
  orchard: Inst[];
  counts: {fields: number; greenhouses: number; scarecrows: number; bales: number};
}
export function buildFields(): FieldBuild {
  const fields: Placed[] = [], details: Placed[] = [], orchard: Inst[] = [];
  const counts = {fields: 0, greenhouses: 0, scarecrows: 0, bales: 0};
  const gh = greenhouse(), sc = scarecrow();
  const bale = mergeGeometries([cyl(1.3, 1.6, PAL.amber, 0, 0, 0, 0, 7)]);
  PARCELS.forEach((p, i) => {
    const geo = fieldGeo(p);
    if (!geo.attributes.position.count) return;
    fields.push(worldPart(geo, p.x, p.z));
    counts.fields++;
    fields.push(worldPart(terrainRibbon(bundPts(p, 0.9), 1.1, BUND, 0.2), p.x, p.z));
    // 수로: 벼논·논밭 긴 변 한쪽에 가는 물줄기 띠
    if ((p.kind === 'paddy' || p.kind === 'rice') && hash2(i, 5, 71) < 0.45) {
      const hw = p.w / 2 + 2.2, pts: PathPoint[] = [];
      for (let k = 0; k <= 4; k++) {
        const v = (k / 4 - 0.5) * (p.d + 3);
        pts.push([p.x - hw * p.c - v * p.s, p.z - hw * p.s + v * p.c]);
      }
      fields.push(worldPart(terrainRibbon(pts, 0.9, DITCH, 0.12), p.x, p.z));
    }
    const y = groundH(p.x, p.z);
    if (p.kind === 'soil' && p.w > 15 && p.d > 21 && counts.greenhouses < 9 && hash2(i, 6, 72) < 0.75) {
      details.push({g: gh, x: p.x, y, z: p.z, ry: -p.ang});
      const hx = Math.abs(p.c) * 5 + Math.abs(p.s) * 9, hz = Math.abs(p.s) * 5 + Math.abs(p.c) * 9;
      addSolid(p.x - hx, p.z - hz, p.x + hx, p.z + hz);
      counts.greenhouses++;
    } else if (p.kind === 'orchard') {
      for (let a = 5; a < p.w - 2; a += 6) for (let b = 5; b < p.d - 2; b += 6) {
        const u = a - p.w / 2, v = b - p.d / 2, x = p.x + u * p.c - v * p.s, z = p.z + u * p.s + v * p.c;
        orchard.push({x, y: groundH(x, z), z, s: 0.95 + hash2(a, b, 73) * 0.25, ry: hash2(a, b, 74) * 6});
      }
    } else if (hash2(i, 7, 75) < 0.14) {
      details.push({g: sc, x: p.x, y, z: p.z});
      counts.scarecrows++;
    } else if (p.kind === 'pale' && hash2(i, 8, 76) < 0.5) {
      for (let k = 0; k < 4; k++) {
        const bx = p.x - p.w * 0.3 + k * 3.4, bz = p.z + p.d * 0.25;
        details.push({g: bale, x: bx, y: groundH(bx, bz), z: bz});
        counts.bales++;
      }
    }
  });
  return {fields, details, orchard, counts};
}
