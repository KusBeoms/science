// 도시 산악 부품 (W7): 정상 철탑(격자 탑), 천문대 광장, 눈 지붕 바위, 설산 침엽수. 전부 코드 생성 로우폴리 정점색, 병합/인스턴싱 전제.
import {PAL, mix} from './lowpoly/palette.js';
import {box, cone, cyl, ico, wobble} from './lowpoly/prim.js';
import {keep, mergeGeometries, type Placed} from './lowpoly/merge.js';
import {beam, type V3} from './lowpoly/structure.js';
import {observatory} from './city/landmarks2.js';

/** 정상 철탑: 4다리 격자 탑(높이 H), 적백 띠, 꼭대기 안테나·경고구. 원점 = 바닥 중심 */
export function peakTower(H = 36): any {
  const base = 3.4, top = 0.9, levels = 4,
    p: any[] = [box(base * 2 + 2, 1.2, base * 2 + 2, PAL.stone, 0, -0.6, 0)];
  const at = (corner: number, t: number): V3 => {
    const r = base + (top - base) * t, sx = corner & 1 ? 1 : -1, sz = corner & 2 ? 1 : -1;
    return [sx * r, t * H, sz * r];
  };
  for (let c = 0; c < 4; c++) p.push(beam(at(c, 0), at(c, 1), 0.42, PAL.steel));
  for (let l = 0; l < levels; l++) {
    const t0 = l / levels, t1 = (l + 1) / levels, col = l % 2 ? PAL.white : PAL.red;
    for (const [a, b] of [[0, 1], [1, 3], [3, 2], [2, 0]]) {
      p.push(beam(at(a, t1), at(b, t1), 0.3, col));
      p.push(beam(at(a, t0), at(b, t1), 0.22, PAL.ash)); // 대각 보강
    }
  }
  p.push(box(2.6, 0.5, 2.6, PAL.steel, 0, H, 0), cyl(0.18, 9, PAL.steel, 0, H, 0, 0, 5), ico(0.7, 0, PAL.red, 0, H + 9.3, 0));
  for (const s of [-1, 1]) p.push(beam([0, H + 3, 0], [s * 1.6, H + 6, 0], 0.12, PAL.ash));
  return keep(mergeGeometries(p));
}

/** 천문대 광장: 돌 원형 광장 + 낮은 난간 말뚝 고리 + 천문대 돔(solid 만 — 낮에 보이는 기본재질 없음) + 작은 관리동 */
export function observatoryPlaza(r: number): Placed[] {
  const obs = observatory(),
    out: Placed[] = [
      {g: cyl(r, 1.4, mix(PAL.stone, PAL.bone, 0.3), 0, -1.3, 0, 0, 16)},
      {g: cyl(r - 3, 0.2, PAL.paving, 0, 0.12, 0, 0, 16)},
      {g: obs.solid, s: 1.25},
      {g: mergeGeometries([box(9, 4, 6, PAL.plaster), box(9.8, 0.6, 6.8, PAL.slate, 0, 4, 0), box(1.6, 2.4, 0.2, PAL.wood, 0, 0, 3.05)]), x: 0, z: r - 9, ry: 0},
    ];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.2;
    if (Math.cos(a - 1.2) > 0.82) continue; // 도로가 들어오는 서쪽 입구는 비운다
    out.push({g: mergeGeometries([cyl(0.2, 1.1, PAL.steel, 0, 0, 0, 0, 5), box(0.5, 0.15, 0.5, PAL.red, 0, 1.1, 0)]), x: Math.cos(a) * (r - 1), z: Math.sin(a) * (r - 1)});
  }
  return out;
}

/** 눈 지붕 바위: 회색 바위 + 흰 눈 덮개 */
export function snowRock(seed: number, snowy: boolean): any {
  const body = wobble(ico(2.4, 0, mix(PAL.stone, PAL.steel, 0.4 + (seed % 3) * 0.1), 0, 0.6, 0, 0, 0.8), 0.5, seed);
  const parts = [body];
  if (snowy) parts.push(wobble(ico(1.9, 0, mix(PAL.white, PAL.cloud, 0.3), 0, 1.5, 0, 0, 0.5), 0.3, seed + 5));
  return keep(mergeGeometries(parts));
}

/** 눈 쌓인 소나무 (설선 아래 비탈 위쪽) */
export function snowPine(): any {
  return keep(mergeGeometries([
    cyl(0.28, 1.8, PAL.wood, 0, 0, 0, 0, 5),
    cone(2, 2.6, PAL.green, 0, 1.4, 0, 0, 7),
    cone(1.5, 2.3, PAL.cloud, 0, 3.2, 0, 0, 7),
    cone(1, 2, PAL.white, 0, 4.9, 0, 0, 7),
  ]));
}
/** 원경 나무: 한 덩어리 원뿔(10 tris) */
export const farPine = (): any => keep(mergeGeometries([cone(2.2, 6.5, mix(PAL.green, PAL.ink, 0.35), 0, 0, 0, 0, 4)]));
