// CityCompiled → 장면. 도로 리본·소품 인스턴싱·건물·충돌체·데크를 한 핸들로 묶는다.
//   const city = buildCityFromCompiled(getCityCompiled(), G.scene);   // 장면에 붙임
//   city.update(G.me.pos);                                             // 프레임마다(또는 이동 시): 청크 LOD·가시성·밤 조명
//   city.dispose();                                                    // 장면에서 떼고 지오메트리·충돌체·데크를 모두 해제
// 구 도심(render/city/index.ts)과 별개이며 아무 전역 상태도 건드리지 않는다(핸들 안에서만 소유). 전환 시점은 이후 작업(boot.ts·main.ts 연결).
import {G} from '../../core/runtime.js';
import type {BuildingSource} from '../../data/city-schema.js';
import type {CityCompiled, Placement} from '../../data/city-compiled.js';
import {getCitySource, hasCitySource} from '../../data/city-source.js';
import {buildRibbons} from './ribbons.js';
import {buildPlacements} from './placements.js';
import {buildBuildings} from './buildings.js';
import {planColliders, registerColliders, type ColliderReg} from './colliders.js';
import {registerDecks} from './decks.js';
import {shown, type Pos} from './lod.js';

export interface CityRenderOptions {
  /** 충돌체·데크 소유자 접두. 기본 'city-v2:'. 같은 접두의 핸들이 둘 살아 있으면 던진다 */
  ns?: string;
  /** 건물 원본: 배열이거나 placement→BuildingSource 함수. 생략하면 getCitySource().buildings 를 id 로 찾는다 */
  buildings?: readonly BuildingSource[] | ((p: Placement) => BuildingSource | undefined);
  /** 도로 리본을 그리는 반경(m, 청크 표면 기준). 기본 600 */
  ribbonRange?: number;
  /** 소품·건물 근거리 모델 반경. 기본 110 / 120 */
  propRange?: number;
  buildingRange?: number;
  /** 컴파일 충돌체가 덮지 않은 필수 소품·건물에 기본 충돌을 만든다. 기본 true */
  deriveColliders?: boolean;
  /** false 면 충돌체·데크를 등록하지 않는다(렌더만 시험). 기본 true */
  physics?: boolean;
}
export interface CityRenderStats {
  /** 현재 보이는 메시 수(= 드로우콜 상한, 프러스텀 컬링 전) */
  drawCalls: number;
  /** 현재 보이는 삼각형(인스턴스 포함, 프러스텀 컬링 전) */
  tris: number;
  /** 메모리에 올라 있는 전체 메시/삼각형 */
  meshes: number;
  residentTris: number;
  geometries: number;
  ribbons: {inputChunks: number; meshes: number; tris: number; verts: number; flippedTris: number; bad: {key: string; surface: string; reason: string}[]; bySurface: Record<string, {chunks: number; tris: number}>};
  props: {instances: number; meshes: number; tris: number; byAsset: Record<string, number>; unknownAssets: Record<string, number>; bad: number};
  buildings: {buildings: number; meshes: number; tris: number; unresolved: string[]; byStyle: Record<string, number>};
  colliders: ColliderReg['stats'];
  decks: {decks: number; samples: number};
  /** 빌더가 배치하지 못한 항목 수(compiled.rejected) */
  rejected: number;
  buildMs: number;
}
export interface CityRender {
  group: any;
  /** 밤에만 켜지는 메시(가로등 전구·창문). 기존 nightMeshes 패턴 */
  nightMeshes: any[];
  colliders: ColliderReg | null;
  /** 플레이어 위치(생략 시 G.me.pos)로 청크 LOD·가시성·조명 갱신 */
  update(pos?: Pos): void;
  /** true/false 로 밤을 강제, null 이면 G.night > 0 을 따른다 */
  setNight(on: boolean | null): void;
  stats(): CityRenderStats;
  dispose(): void;
}

const active = new Set<string>();
const resolverOf = (o: CityRenderOptions): ((p: Placement) => BuildingSource | undefined) => {
  if (typeof o.buildings === 'function') return o.buildings;
  const src = o.buildings ?? (hasCitySource() ? getCitySource().buildings : []);
  const map = new Map<string, BuildingSource>();
  for (const b of src) map.set(b.id, b);
  return p => map.get(p.id);
};

export function buildCityFromCompiled(compiled: CityCompiled, scene: any, opt: CityRenderOptions = {}): CityRender {
  const ns = opt.ns ?? 'city-v2:';
  if (active.has(ns)) throw new Error(`citygen 핸들(ns=${ns})이 이미 살아 있습니다 — 먼저 dispose 하세요`);
  const t0 = performance.now();
  const rib = buildRibbons(compiled.ribbons, {range: opt.ribbonRange});
  const props = buildPlacements(compiled.placements, {range: opt.propRange});
  const bld = buildBuildings(compiled.placements, resolverOf(opt), {range: opt.buildingRange});
  const group = new THREE.Group();
  group.name = 'citygen';
  group.add(rib.group, props.group, bld.group);
  const nightMeshes = [...props.nightMeshes, ...bld.nightMeshes];
  const geometries = [...rib.geometries, ...props.geometries, ...bld.geometries];
  const physics = opt.physics !== false;
  const decks = physics ? registerDecks(compiled.roads, ns) : {owners: [], decks: 0, samples: 0, dispose() {}};
  let colliders: ColliderReg | null = null;
  if (physics) {
    const plan = planColliders(compiled.colliders, props.resolved, bld.built, opt.deriveColliders !== false);
    colliders = registerColliders(plan.list, ns, {derivedProps: plan.derivedProps, derivedBuildings: plan.derivedBuildings, input: compiled.colliders.length});
  }
  scene.add(group);
  active.add(ns);
  const buildMs = performance.now() - t0;

  let forced: boolean | null = null,
    last: Pos | null = null,
    disposed = false;
  const lods = [rib.lod, props.lod, bld.lod];
  const apply = () => {
    const ortho = !last || !!G.camera?.isOrthographicCamera,
      night = forced ?? G.night > 0;
    for (const l of lods) l.update(last ?? {x: 0, z: 0}, night, ortho);
  };
  apply(); // 플레이어 위치를 알기 전에는 전부 근거리 모델로 보인다
  const handle: CityRender = {
    group,
    nightMeshes,
    colliders,
    update(pos) {
      if (disposed) return;
      const p = pos ?? G.me?.pos;
      if (p) last = {x: p.x, y: p.y, z: p.z};
      apply();
    },
    setNight(on) {
      forced = on;
      apply();
    },
    stats() {
      let drawCalls = 0, tris = 0, meshes = 0, residentTris = 0;
      group.traverse((o: any) => {
        if (!o.isMesh) return;
        const g = o.geometry,
          t = ((g.index ? g.index.count : g.attributes.position.count) / 3) * (o.isInstancedMesh ? o.count : 1);
        meshes++;
        residentTris += t;
        if (shown(o)) (drawCalls++, (tris += t));
      });
      return {
        drawCalls, tris, meshes, residentTris, geometries: geometries.length,
        ribbons: rib.stats, props: props.stats, buildings: bld.stats,
        colliders: colliders?.stats ?? ({input: 0, aabb: 0, obb: 0, circle: 0, solids: 0, required: 0, derivedProps: 0, derivedBuildings: 0, elevated: 0, bad: 0, owners: 0}),
        decks: {decks: decks.decks, samples: decks.samples},
        rejected: compiled.rejected?.length ?? 0,
        buildMs,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(group);
      // 공유 지오메트리(keep)는 복제본만 만들어 쓰므로 여기서 가진 것은 모두 우리 것이다. 재질은 전부 공유 싱글턴이라 해제하지 않는다.
      for (const g of geometries) g.dispose();
      geometries.length = 0;
      group.clear();
      colliders?.dispose();
      decks.dispose();
      nightMeshes.length = 0;
      active.delete(ns);
    },
  };
  return handle;
}
