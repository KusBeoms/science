// RibbonChunk[] → (청크, 층, 표면)마다 병합 메시 1개. 정점 y 는 컴파일 데이터 그대로(지형 높이를 다시 묻지 않는다).
// 계약: 인덱스는 윗면이 +y 를 보도록 감는다(반시계, 위에서 볼 때). 윗면 전용 표면에서 아래를 보는 삼각형은 되돌리고 flippedTris 로 보고한다.
// 메시는 (청크, 층, 재질 종류) 단위: 재질 종류는 'solid'(표면 무늬 재질: 차도·보도·연석·중앙분리대·갓길·데크)와 'decal'(도료: 차선·횡단보도) 둘뿐이다.
// 표면별 색·무늬는 정점에 굽기 때문에 표면 수가 늘어도 드로우콜은 청크×층×2 를 넘지 않는다.
import type {RibbonChunk} from '../../data/city-compiled.js';
import {surfaceMaterial} from '../surface-detail.js';
import {STYLE, decalMat, isSurface, surfaceRgb, type Surface} from './surfaces.js';
import {LodSet, sphereOf} from './lod.js';

export interface BadRibbon {
  key: string;
  surface: string;
  reason: string;
}
export interface RibbonBuild {
  group: any;
  lod: LodSet;
  geometries: any[];
  stats: {inputChunks: number; meshes: number; verts: number; tris: number; flippedTris: number; bad: BadRibbon[]; bySurface: Record<string, {chunks: number; tris: number}>};
}
export interface RibbonOptions {
  /** 청크 표면에서 이 거리(m) 안이면 그린다. 기본 600 */
  range?: number;
}

/** 입력 한 건 검사. 문제가 있으면 사유 문자열 */
function problem(c: RibbonChunk): string | null {
  if (!c || typeof c.key !== 'string') return 'key 없음';
  if (!isSurface(c.surface)) return `알 수 없는 surface "${String(c.surface)}"`;
  if (!Array.isArray(c.positions) || !Array.isArray(c.indices)) return 'positions/indices 가 배열이 아님';
  if (c.positions.length % 3 || c.indices.length % 3) return 'positions/indices 길이가 3의 배수가 아님';
  if (c.positions.length === 0 || c.indices.length === 0) return '빈 메시';
  const n = c.positions.length / 3;
  for (let i = 0; i < c.positions.length; i++) if (!Number.isFinite(c.positions[i])) return `positions[${i}] 가 유한하지 않음`;
  for (let i = 0; i < c.indices.length; i++) {
    const v = c.indices[i];
    if (!Number.isInteger(v) || v < 0 || v >= n) return `indices[${i}]=${v} 가 범위 밖(정점 ${n}개)`;
  }
  return null;
}

export function buildRibbons(chunks: readonly RibbonChunk[], opt: RibbonOptions = {}): RibbonBuild {
  const group = new THREE.Group();
  group.name = 'citygen-ribbons';
  const lod = new LodSet(),
    geometries: any[] = [],
    bad: BadRibbon[] = [],
    by = new Map<string, RibbonChunk[]>(),
    range = opt.range ?? 600;
  for (const c of chunks) {
    const why = problem(c);
    if (why) {
      bad.push({key: String(c?.key), surface: String(c?.surface), reason: why});
      continue;
    }
    const k = `${c.key}|${c.layer}|${STYLE[c.surface as Surface].decal ? 'decal' : 'solid'}`;
    (by.get(k) || by.set(k, []).get(k)!).push(c);
  }
  const stats: RibbonBuild['stats'] = {inputChunks: chunks.length, meshes: 0, verts: 0, tris: 0, flippedTris: 0, bad, bySurface: {}};
  by.forEach(list => {
    const decalGroup = STYLE[list[0].surface as Surface].decal;
    let nv = 0,
      ni = 0;
    for (const c of list) (nv += c.positions.length / 3), (ni += c.indices.length);
    const pos = new Float32Array(nv * 3),
      idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni),
      col = new Float32Array(nv * 3),
      sd = new Float32Array(nv * 3);
    let vo = 0,
      io = 0;
    for (const c of list) {
      const surface = c.surface as Surface,
        style = STYLE[surface],
        [r, g, b] = surfaceRgb(surface),
        n = c.positions.length / 3,
        t0 = io / 3;
      pos.set(c.positions, vo * 3);
      for (let i = 0; i < c.indices.length; i += 3) {
        let a = c.indices[i] + vo,
          bb = c.indices[i + 1] + vo,
          cc = c.indices[i + 2] + vo;
        if (style.topOnly) {
          // 면 법선의 y 성분 = ((b−a)×(c−a)).y = (bz−az)(cx−ax) − (bx−ax)(cz−az)  (three 의 반시계 정면 규약)
          const ax = pos[a * 3], az = pos[a * 3 + 2];
          const ny = (pos[bb * 3 + 2] - az) * (pos[cc * 3] - ax) - (pos[bb * 3] - ax) * (pos[cc * 3 + 2] - az);
          if (ny < -1e-9) {
            [bb, cc] = [cc, bb];
            stats.flippedTris++;
          }
        }
        idx[io++] = a;
        idx[io++] = bb;
        idx[io++] = cc;
      }
      for (let i = 0; i < n; i++) {
        const o = (vo + i) * 3;
        (col[o] = r), (col[o + 1] = g), (col[o + 2] = b);
        if (style.tag) sd.set(style.tag, o);
      }
      const s2 = (stats.bySurface[surface] ||= {chunks: 0, tris: 0});
      s2.chunks++;
      s2.tris += io / 3 - t0;
      vo += n;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    if (!decalGroup) geo.setAttribute('surfaceDetail', new THREE.BufferAttribute(sd, 3));
    const sph = sphereOf(geo)!,
      mesh = new THREE.Mesh(geo, decalGroup ? decalMat() : surfaceMaterial());
    mesh.name = `ribbon:${list[0].key}:L${list[0].layer}:${decalGroup ? 'decal' : 'solid'}`;
    mesh.frustumCulled = true;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
    geometries.push(geo);
    lod.add({cx: sph.center.x, cz: sph.center.z, near: mesh, range: range + sph.radius, cull: range + sph.radius});
    const t = ni / 3;
    stats.meshes++;
    stats.verts += nv;
    stats.tris += t;
  });
  return {group, lod, geometries, stats};
}
