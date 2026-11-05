// 북서 분수 공원: 기존 연못·자전거 순환로를 보존한 방사형 산책 정원.
// 낮은 화단과 포장만 추가하고 충돌체는 만들지 않아 기존 놀이·산책 동선을 유지한다.
import {POND, BIKE} from '../data/city-w5.js';
import {PAL, mix, rgb} from './lowpoly/palette.js';
import {box, ico} from './lowpoly/prim.js';
import {landscapeBatch} from './landscape-batch.js';
import type {Placed} from './lowpoly/merge.js';

/** 위를 향한 정점색 평면. 고리와 부채꼴을 같은 포맷으로 병합한다. */
function arc(r0: number, r1: number, a0: number, a1: number, color: number, y: number, segments: number) {
  const pos: number[] = [], col: number[] = [], [r, g, b] = rgb(color);
  const point = (radius: number, a: number) => [Math.cos(a) * radius, y, Math.sin(a) * radius];
  for (let i = 0; i < segments; i++) {
    const a = a0 + (a1 - a0) * i / segments, n = a0 + (a1 - a0) * (i + 1) / segments;
    const q = [point(r0, a), point(r1, a), point(r0, n), point(r1, n)];
    for (const k of [0, 2, 1, 1, 2, 3]) { pos.push(...q[k]); col.push(r, g, b); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

export function buildCityGardens() {
  const parts: Placed[] = [], at = (g: any) => parts.push({g, x: POND.x, z: POND.z});
  const paving = mix(PAL.bone, PAL.paving, 0.2), border = mix(PAL.bone, PAL.white, 0.25), tau = Math.PI * 2;
  // 자전거 순환로는 기존 규격을 따라 포장하고, 바깥쪽에는 보행 순환로를 둔다.
  at(arc(BIKE.r0, BIKE.r1, 0, tau, paving, 0.08, 64));
  at(arc(46.6, 49.4, 0, tau, paving, 0.07, 64));
  at(arc(23.1, 24, 0, tau, border, 0.06, 64));
  at(arc(49.4, 50.1, 0, tau, border, 0.075, 64));
  // 여덟 방사형 길은 연못 안으로 들어가지 않고 외부 정원으로 이어진다.
  for (let i = 0; i < 8; i++) {
    const a = i * tau / 8, mid = (BIKE.r1 + 51.5) / 2, length = 51.5 - BIKE.r1;
    at(box(length, 0.06, 2.4, paving, Math.cos(a) * mid, 0.04, Math.sin(a) * mid, -a));
  }
  // 세부 시설이 이미 놓인 동남쪽·소풍 구역은 낮은 면 화단만 사용한다.
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * tau / 8, gap = 0.16, start = i * tau / 8 + gap, end = (i + 1) * tau / 8 - gap;
    at(arc(40.3, 44.8, start, end, mix(PAL.green, PAL.wood, 0.3), 0.08, 5));
    at(arc(40.8, 44.2, start + 0.03, end - 0.03, mix(PAL.green, PAL.lime, 0.18), 0.095, 5));
    // 고운 색 점을 낮게 모아 심어 큰 색 타일 대신 꽃 띠로 읽히게 한다.
    for (let k = 0; k < 5; k++) {
      const t = start + (end - start) * (k + 0.5) / 5, radius = 42.5;
      at(box(0.55, 0.18, 0.55, [PAL.pink, PAL.amber, PAL.cloud][(i + k) % 3], Math.cos(t) * radius, 0.1, Math.sin(t) * radius));
    }
    if (i === 0 || i === 2) continue;
    at(ico(0.85, 0, mix(PAL.green, PAL.wood, 0.2), Math.cos(a) * 35.5, 0.35, Math.sin(a) * 35.5, 0, 0.55));
  }
  const group = landscapeBatch(parts, 'fountain-gardens', 150);
  group.userData = {radialPaths: 8, outerRadius: 50.1, bikeRadius: BIKE.rm};
  return group;
}
