# CITY_RENDER — CityCompiled → 장면 (render/citygen)

계획: `design/CITY_REDESIGN_PLAN.md` 13절·8-2 ④⑤⑥, 계약: `client/src/data/city-compiled.ts`, 충돌 API: `tech/CLIENT.md`(ownerId/OBB). 이 문서는 **소비 측**(렌더·충돌 등록)만 다룬다. 빌더(`client/src/citygen/*`)는 별도.
구 도심(`render/city/index.ts`)은 그대로 켜져 있다. 이 렌더는 전환 시점에 `boot.ts`·`main.ts`가 연결한다(아직 아무도 호출하지 않음).

## 사용
```ts
// boot.ts (소유자가 연결): source 검증 직후
const c = await loadCompiled({expectSourceHash});   // data/city-compiled-store.ts — 오류 분류는 boot.ts 와 같다 + 'stale'
if (!c.ok) { showBootError(c); return; }             // 폴백 없음
setCityCompiled(c.compiled);                         // 한 번만
// 게임(장면 생성 시점)
const city = buildCityFromCompiled(getCityCompiled(), G.scene);  // render/citygen/index.ts
city.update(G.me.pos);       // 프레임마다: 청크 LOD·가시성·야간 조명 (플레이어 위치 전, 최초 호출 전에는 전부 근거리)
city.setNight(true|false|null); // null = G.night > 0 을 따름
city.stats();                // drawCalls / tris / meshes / residentTris / ribbons / props / buildings / colliders / decks
city.dispose();              // 장면에서 떼고 지오메트리·충돌체·데크 모두 해제
```
옵션: `ns`(충돌·데크 소유자 접두, 기본 `'city-v2:'`, 같은 접두의 핸들이 둘이면 throw), `buildings`(BuildingSource[] 또는 함수; 생략 시 `getCitySource().buildings`), `ribbonRange`(600)/`propRange`(110)/`buildingRange`(120), `deriveColliders`(true), `physics`(false면 충돌·데크 미등록).

## 모듈
| 파일 | 역할 |
|---|---|
| `data/city-compiled-store.ts` | 단일 보관소(set 1회)·`checkCompiled`(버전 3종·chunkSize·필수 배열)·`loadCompiled(url)` |
| `render/citygen/ribbons.ts` + `surfaces.ts` | RibbonChunk → (청크, 층, 재질종류)별 병합 메시. 표면 색은 palette 토큰, 무늬는 `SURFACE` 태그 |
| `render/citygen/placements.ts` + `assets.ts` | 소품 → 청크×에셋 InstancedMesh. `ASSETS` 레지스트리·`registerAsset()` |
| `render/citygen/buildings.ts` | `BuildingSource → CityBuilding` 어댑터, 청크 병합(근/원/조명), 고층은 항상 근거리 모델 |
| `render/citygen/colliders.ts` | Collider[] → `replaceSolids`(소유자 단위), 필수 충돌 파생 |
| `render/citygen/decks.ts` | 다리·램프 구간 → `replaceDecks`(직선 구간 병합) |
| `render/citygen/lod.ts` | 핸들별 `LodSet`(전역 배열 없음) |
| `render/city/building.ts` | `rotRad`, `placeBuilt`, `rotatedDoor` 추가(rot=0·y=0이면 기존과 같은 정점) |
| `render/crosswalks.ts` | `signal()`에 `export`만 추가(동작 불변) → 신호기 에셋이 같은 모양을 쓴다 |

## 각도·축 규약 (빌더가 지켜야 하는 부분)
- `Placement.rot`, `BuildingSource.rot`, `Collider.obb.rotDeg`는 **모두 도(°), three `rotation.y`**: 양의 방향은 로컬 +z가 +x(동)로 도는 쪽. 렌더는 그대로 쓰고, `core/solids`(수학 각)에는 **부호를 뒤집어** 등록한다.
- 로컬 축: 건물·벤치 정면 +z / 가로등 팔 +x / 울타리 길이 z / 모든 모델 발밑이 y=0. 높이 y는 항상 compiled 값(지형을 다시 묻지 않음).
- OBB `hw`는 로컬 x 반폭(건물 w/2), `hd`는 로컬 z 반폭(d/2).
- 리본 인덱스는 **위에서 볼 때 반시계(윗면 +y)**. 윗면 전용 표면(asphalt/sidewalk/marking/crosswalk/median/shoulder)에서 아래를 보는 삼각형은 되돌리고 `stats.ribbons.flippedTris`에 센다(0이어야 정상). `curb`/`deck`은 그대로 둔다. 범위 밖 인덱스·NaN·모르는 surface는 그 청크를 버리고 `stats.ribbons.bad[]`에 사유를 남긴다. `uv`는 쓰지 않는다.
- 건물 `Placement`에는 w·d·floors·style이 없다 → `BuildingSource`를 `id`로 찾는다. 못 찾으면 `stats.buildings.unresolved[]`(조용히 버리지 않음). *계약 보강 필요*: 컴파일 결과가 건물 치수를 싣거나 `buildings`를 옵션으로 줘야 한다.

## 충돌 등록
- 소유자 = `${ns}${collider.owner}`; `replaceSolids`로 소유자별 일괄. `handle.colliders.replaceOwner(owner, list)`로 한 소유자만 원자적으로 교체. dispose는 접두의 모든 소유자를 제거.
- aabb/obb는 그대로. **원은 정팔각형(내접 정사각형 2개, 0°·45°)**으로 근사(외접 1.082r, 원보다 항상 크거나 같다) → circle 1개 = 솔리드 2개.
- 층: y 범위가 데크 위(`deckHeights(cx,cz)` 중 하나 −1.5 이상)면 `up`(고가 전용: y 없는 질의는 무시), 아니면 지상 층 `lo=y0−0.6, hi=y1`.
- **파생(`deriveColliders`)**: 컴파일 충돌체가 (x,z,y)를 덮지 않는 필수 소품(tree/lamp/signal/sign/bench/bin/bollard/울타리, 에셋 기본값: 줄기 r0.35·기둥 r0.3·벤치 OBB 2.4×0.7 등)과 모든 건물(회전 OBB, y0=y−4 … 지붕)에 기본 충돌을 만든다. 숫자는 `stats.colliders.derivedProps/derivedBuildings`. 예외 종류(관목·풀·도로 표시)는 만들지 않는다. 빌더가 직접 충돌을 주면 파생은 건너뛴다.
- 데크: 다리·램프 구간(`kind bridge|ramp` 또는 `layer>0`) 표본을 같은 직선·경사(오차 xz 0.12m·y 0.06m, 최대 40m)로 합쳐 `replaceDecks('${ns}deck:${roadId}')`. 폭은 구간 평균 (hwL+hwR)/2의 **대칭 띠**(좌우 비대칭 단면은 근사).

## LOD·가시성
- 리본: 청크 표면에서 600m 안이면 그림(+프러스텀 컬링).
- 소품: 64m 청크 × 에셋. 근거리(110m) 모델 ↔ 원거리 단순 모델(500m까지), 가로등 전구는 근거리·밤에만.
- 건물: 70m 청크. 근거리(120m) ↔ 상자+창띠 단순 모델(멀어도 유지), 창문(lit)은 근거리·밤에만, 고층은 항상 근거리 모델.
- 정사영 카메라(지도 촬영)면 모두 근거리 모델. 야간: 모든 조명 메시는 `handle.nightMeshes`(기존 nightMeshes 패턴).

## 비용 (손으로 쓴 고정 데이터 기준, 시험 출력)
고정 데이터: 십자 교차로 + 언덕길 + 다리(지상 도로 0.4km), 소품 35, 건물 3.
- 리본 1,320 tris / 메시 18 → **약 3,300 tris/도로km**(차도·보도·연석·도료 포함, 표본 간격 4m, 면마다 정점 비공유). 표본을 1m로 촘촘히 하면 약 4배.
- 소품 인스턴스 35 → 메시 28, 상주 2,576 tris(근/원/조명 모델 합). 건물 3채 696 tris. 합계 상주 4,592, 근처에서 그려지는 것 3,716 tris / 36 메시. 빌드 약 9~11ms.
- 메시 수는 **청크 수 × (리본 ≤2 + 소품 에셋 수 × 1~2 + 건물 2~3)**로 늘어난다. 지름 1.2km(청크 약 350개) 안을 전부 그리면 드로우콜이 수천이 될 수 있다 → 아래 한계의 "청크 크기·원거리 병합" 참조.
- 100회 build/dispose 후 솔리드·격자 칸·데크·장면 자식·GPU 지오메트리·텍스처·프로그램 수가 시작값과 같다(`tests/e2e/city-render.spec.ts`).

## 한계 (정직하게)
- 이후 작업: 실내, 창문 개구부, 문 열림, 문 위치(`interior.door`는 아직 모델에 반영 안 됨), 도로 위 소품 필터는 빌더 몫.
- 건물 모델은 구 도심 치수 그대로(층고 약 5u). `SCALE.md`의 3.0m 층고·1.0m 문과 어긋난다. 모델 재작성(I 담당)이 필요하다.
- 드로우콜: 청크 64m·소품 에셋별 메시라 도시 규모에서 위험. 해결안: 청크를 128~256m로, 원거리 소품 모델을 청크당 1메시로 병합, 리본 반경 축소. 아직 실제 도시 규모로 측정하지 못했다.
- 리본의 연석 옆면·중앙분리대 정점이 면마다 분리돼 정점 수가 많다(빌더가 정점을 공유하면 줄어듦). 인덱스 `Uint16` 한도(청크당 65,535 정점)는 넘으면 자동 `Uint32`.
- 지면(지형 메시)과의 틈·z-fighting은 지형 평탄화(P3/P4 다른 담당)에 달려 있고 여기서는 도료만 polygonOffset으로 처리했다.
- 충돌: 원은 8각형 근사. 파생 충돌의 크기는 에셋 기본값이라 빌더가 실제 점유 범위를 주는 것이 낫다. 차량 충돌의 상세 규약(vehicle.ts)은 건드리지 않았다.
- 구 도심 `cityDetail` 전역 배열은 해제할 수 없어 쓰지 않았다(같은 모양의 LodSet을 따로 둠).

## 시험
`client/tests/e2e/city-render.spec.ts` 7개(고정 데이터 `city-render-fixture.ts`, 빌더 비의존): 예산·구성 / 충돌(소품 중심 차단, 회전 건물 안·밖·AABB 모서리, 보도·차도·언덕길 통행, 차량 반경, 다리 난간 층) / 데크 / 거리 LOD·밤 / 100회 누수 / 로더 오류 분류 / 스크린샷(`client/tests/out/city-render/{aerial,hill-street,bridge,junction,night}.png`).
통행 시험은 `systems/move.ts`가 쓰는 판정(`solidAt(x,z,0.42,y)` + `walkable`)을 그대로 걸음 단위로 재현한다(실제 입력 프레임을 돌리지는 않음).
