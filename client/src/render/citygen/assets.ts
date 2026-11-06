// 에셋 레지스트리: asset ID → 지오메트리 공장·원거리 단순 모델·야간 조명·기본 충돌(필수 종류).
// 새 에셋은 registerAsset({...}) 한 번이면 된다. Placement.asset 이 모르는 ID 면 kind 의 기본 에셋(KIND_DEFAULT)을 쓰고, 그것도 없으면 건너뛰며 통계(unknownAssets)에 남긴다.
// 로컬 축 규약(placement.rot 은 도, 양의 방향 = 로컬 +z 가 +x 로 도는 쪽 = three rotation.y):
//   가로등 팔 +x · 벤치/표지판 앞면 +z · 울타리 길이 z · 나머지 대칭. 모든 지오메트리는 발밑 원점(y=0)이다.
import type {Placement} from '../../data/city-compiled.js';
import {ACCENT, NEUTRAL, PAL, mix} from '../lowpoly/palette.js';
import {box, cyl, ico, type Geo} from '../lowpoly/prim.js';
import {keep, mergeGeometries} from '../lowpoly/merge.js';
import {barrierGeo, benchGeo, lampGeo, pineGeo, roundTreeGeo} from '../city/props.js';
import {distantBench, distantLamp, distantTree} from '../city/detail-lod.js';
import {Buf} from '../overpass-buf.js';
import {signal} from '../crosswalks.js';

/** 기본 충돌(필수 종류): 원(줄기/기둥) 또는 로컬 회전 박스(벤치/울타리). h 는 높이(m) */
export type AssetCollide = {t: 'circle'; r: number; h: number} | {t: 'obb'; hw: number; hd: number; h: number};
export interface AssetDef {
  id: string;
  kind: Placement['kind'];
  near: () => Geo;
  /** 먼 거리용 단순 모델(없으면 near 만 쓰고 근거리 반경 밖에서는 숨김) */
  far?: () => Geo;
  /** 밤에만 켜지는 조명 모델(가로등 전구) */
  glow?: () => Geo;
  collide?: AssetCollide;
  /** 모델의 최대 반경(m): 청크 경계구 여유 */
  reach: number;
}

const memo = <T>(f: () => T): (() => T) => {
  let v: T | undefined;
  return () => (v ??= f());
};
const kept = (f: () => Geo): (() => Geo) => memo(() => keep(f()));

const lamp = memo(lampGeo);
const signalGeo = kept(() => {
  const pole = new Buf(),
    head = new Buf();
  signal(pole, head, 0, 0);
  return mergeGeometries([pole.geo(), head.geo()]);
});

export const ASSETS: Record<string, AssetDef> = {};
export function registerAsset(d: AssetDef): void {
  ASSETS[d.id] = d;
}
for (const d of [
  {id: 'lamp.street', kind: 'lamp', near: () => lamp().pole, far: kept(distantLamp), glow: () => lamp().bulb, collide: {t: 'circle', r: 0.3, h: 6}, reach: 2.4},
  {id: 'tree.round', kind: 'tree', near: roundTreeGeo, far: kept(() => distantTree(false)), collide: {t: 'circle', r: 0.35, h: 3}, reach: 3.4},
  {id: 'tree.pine', kind: 'tree', near: pineGeo, far: kept(() => distantTree(true)), collide: {t: 'circle', r: 0.32, h: 3}, reach: 2.4},
  {id: 'bench.wood', kind: 'bench', near: benchGeo, far: kept(distantBench), collide: {t: 'obb', hw: 1.2, hd: 0.35, h: 1}, reach: 1.4},
  {id: 'signal.pole', kind: 'signal', near: signalGeo, collide: {t: 'circle', r: 0.25, h: 5.6}, reach: 0.6},
  {id: 'sign.road', kind: 'sign', near: kept(() => mergeGeometries([cyl(0.07, 2.6, NEUTRAL.steel, 0, 0, 0, 0, 5), box(0.9, 0.9, 0.08, mix(ACCENT.blue, NEUTRAL.white, 0.1), 0, 2.2, 0)])), collide: {t: 'circle', r: 0.15, h: 3}, reach: 0.6},
  {id: 'bin.street', kind: 'bin', near: kept(() => mergeGeometries([cyl(0.32, 0.9, NEUTRAL.slate, 0, 0, 0, 0, 7), cyl(0.36, 0.1, NEUTRAL.coal, 0, 0.9, 0, 0, 7)])), collide: {t: 'circle', r: 0.34, h: 1}, reach: 0.5},
  {id: 'bollard.short', kind: 'bollard', near: kept(() => mergeGeometries([cyl(0.12, 0.8, NEUTRAL.stone, 0, 0, 0, 0, 6), cyl(0.13, 0.12, ACCENT.amber, 0, 0.8, 0, 0, 6)])), collide: {t: 'circle', r: 0.16, h: 0.9}, reach: 0.3},
  {id: 'shrub.round', kind: 'shrub', near: kept(() => ico(0.7, 0, mix(PAL.green, PAL.lime, 0.2), 0, 0.55, 0, 0, 0.8)), reach: 0.9},
  {id: 'barrier.fence', kind: 'other', near: kept(() => barrierGeo(4.5)), collide: {t: 'obb', hw: 0.3, hd: 2.3, h: 1.6}, reach: 2.6},
] as AssetDef[])
  registerAsset(d);

/** asset ID 를 모를 때 kind 별 기본 에셋 */
export const KIND_DEFAULT: Partial<Record<Placement['kind'], string>> = {
  lamp: 'lamp.street', tree: 'tree.round', bench: 'bench.wood', sign: 'sign.road', signal: 'signal.pole', bin: 'bin.street', bollard: 'bollard.short', shrub: 'shrub.round',
};
/** 짧은 별칭: 빌더가 'lamp', 'pine' 처럼 써도 받는다 */
const ALIAS: Record<string, string> = {lamp: 'lamp.street', tree: 'tree.round', round: 'tree.round', pine: 'tree.pine', bench: 'bench.wood', signal: 'signal.pole', sign: 'sign.road', bin: 'bin.street', bollard: 'bollard.short', shrub: 'shrub.round', barrier: 'barrier.fence'};

/** Placement → 에셋 정의(없으면 null). 건물(kind 'building')은 여기서 다루지 않는다 */
export function assetOf(p: Pick<Placement, 'asset' | 'kind'>): AssetDef | null {
  return ASSETS[p.asset] ?? ASSETS[ALIAS[p.asset]] ?? ASSETS[KIND_DEFAULT[p.kind] ?? ''] ?? null;
}
/** 필수 충돌 종류(줄기·기둥·울타리·벤치·표지판 등). 풀·꽃·도로 표시는 예외 */
export const REQUIRED_KINDS: ReadonlySet<string> = new Set(['tree', 'lamp', 'signal', 'sign', 'bench', 'bin', 'bollard', 'other']);
