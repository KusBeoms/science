# 참조 지도 기반 전역 경관

참조는 `client/tests/reference/Snowy Mountain Island Cityscape.png`와 `Pastoral Island Mountain and Lakes Map.png`이다. W7은 Claude가 중단 전에 만든 도시·농촌 변경을 인수하여 통합하고, 도시 경계와 지형 해상도를 추가로 개선한 작업이다. 외부 모델·이미지 텍스처를 추가하지 않고 TypeScript/Three.js 정점색 모델을 사용한다. 기존 기지·건물·호수·섹터의 저장 ID와 로블록스풍 캐릭터는 유지한다.

## 도시와 산기슭

- `data/city-w7.ts`, `data/roads-w7.ts`: 기존 블록의 주택·상가·업무 건물, 중앙 광장 동쪽 고층 군집, 방사형 길과 시설 구획. 추가 건물도 기존 실내 시스템을 사용한다. 다리 진입 곡선과 보도를 건축 금지 영역으로 공유한다.
- `render/city/w7*.ts`, `residential.ts`: 원형 광장, 육상 트랙, 저장 탱크, 체육공원, 원형 아레나와 경량 건물 모델.
- `core/belt-height.ts`: 높이와 폭이 다른 여러 능선과 계곡. 사각 시가지 밖에서 일정하게 솟던 비탈을 없애고, 위치마다 폭이 다른 저지와 완만한 산기슭으로 전환한다. 사과 행성 시선 축은 낮은 안부로 남긴다.
- `render/belt-color.ts`: 시가지 잔디→산기슭 초지→숲→암석·눈을 높이·경사·위치에 따라 연속 보간한다.
- `data/city-fringe.ts`, `render/city-fringe.ts`: 서쪽 주거·북쪽 마을·과수 농가·동쪽 구릉·남서 해안으로 이어지는 8개 비정형 골목. 지형·수면·도로·다른 건물과 겹치지 않는 필지만 집을 세운다. 각 집의 기초·회전 충돌체·진입 데크는 같은 좌표를 읽는다. 텃밭·산장·옹벽·정류장을 함께 배치하며 외곽 숲도 같은 `fringeKeepOut()`으로 생활권을 비운다.
- `data/mountain-road.ts`, `render/city-mountain*.ts`: 시가지에서 동쪽 반도 천문대까지 높이를 공유하는 산악 도로, 북쪽 봉우리 철탑과 산림.
- `render/city/detail-lod.ts`: 먼 건물·가로수·가로등의 수를 유지하고 작은 창틀·설비 등의 지오메트리만 간략화한다. 고층 실루엣은 유지한다. 교외 집은 수평 거리 기준 LOD를 사용한다.
- `data/citygraph-routes.ts`: 새 건물과 겹친 기존 보행 노드·간선만 건물 바깥으로 우회한다. 군중 그래프의 단일 연결과 최소 차수 2를 유지한다.

## 농촌

- `data/wild-mountain.ts`, `core/wild-{base,mountain,trail,height}.ts`: 비대칭 산체·계곡·유한 스위치백·정상 부지. 주차장·길·밭·마을 부지의 높이 우선순위를 공유한다.
- `data/wild-road.ts`: 북쪽 다리에서 동부 간선, 큰 호수 순환로, 작은 호수 마을, 서부·목장 농로로 이어지는 망. 확정된 곡선 표본을 높이 계산과 렌더가 함께 사용한다.
- `data/wild-fields.ts`, `render/rural-{fields,village,models}.ts`: 불규칙 농지·둑·과수·농가·온실·마을 골목. 차도·갓길은 도로 높이를, 그 바깥 경작지는 밭 단 높이를 유지한다.
- `render/wild-{forest,mountain,coast,prison,lake}.ts`: 혼합 숲·등산로·정상 정자·동쪽 모래 곶·해안 바위·교도소·호수 시설. 교도소는 게임 로직과 같은 y=0 부지다. 선착장과 전망 쉼터의 경사 연결판은 실제 보행 데크로 등록한다. 호수 메시와 바다 셰이더도 섬 윤곽을 공유하여 해안 밖 담수 패치와 바다 수면 구멍을 방지한다.

## 실제 지형 정밀도와 지도 촬영

물 셰이더용 기존 5u 격자는 보존한다. 지상은 `core/heightmap.ts`의 **native 2.5u 표본**을 필요할 때 계산·캐시한다. 기존 5u 면을 단순 분할한 결과가 아니다. 근거리 높이·충돌·메시는 같은 표본과 같은 대각선의 삼각 보간을 사용한다.

`render/terrain.ts`, `terrain-mesh.ts`, `terrain-color.ts`는 다음을 담당한다.

- 근거리 2.5u, 중거리 5u, 원경의 거리별 지형 청크.
- 같은 월드 정점에 공통 법선과 색을 적용하여 면별 삼각 체크와 경계 조명 차이를 줄임.
- 근경·원경을 겹쳐 그리던 방식과 원경의 이웃 최솟값 변형을 제거. 준비된 하위 청크를 한 묶음으로 교체하고 경계를 stitch 처리.
- 실제 전체 지도용 `setTerrainOverview(true, 5 | 2.5, bounds)` 지원. 촬영 후 false로 일반 LOD 복귀.

`tests/e2e/map-review.ts`는 지형·숲·도시·교외에 실제 직교 카메라를 전달하고 이름표 없이 촬영한다. 전체 지도는 `setSectorOverview()`로 12개 섬의 시설까지 준비한다. 플레이어가 마지막으로 방문한 위치나 일반 플레이 LOD가 지도 사진을 좌우하지 않는다.

```sh
cd client
npx tsc
npx playwright test tests/e2e/landscape.spec.ts tests/e2e/fringe.spec.ts
WORLDMAP=1 npx playwright test tests/e2e/zz-worldmap.spec.ts
CITYTOP=1 CITYTOP_Z='200,-200,850' npx playwright test tests/e2e/zz-citytop.spec.ts
```

검수 산출물: `client/tests/out/landscape-{city,rural,islands}.png`, `fringe-{west,north,east}.png`, `worldmap-top.png`, `docs/assets/world-map.jpg`. 산출물은 재생성할 수 있어 git에서 제외한다.

## 다리와 검증 계약

[다리 진입부](../BRIDGE_APPROACH.md)의 긴 곡선과 공유 중심선을 유지한다. 새 건물·나무·차량·컨테이너가 보도와 차도를 침범하지 않아야 한다. 다리 야생지 접속면은 y=0으로 이어진다.

검증은 타입 검사, 기존 문·도로·저장 ID, 군중 경로, 산악 도로·농촌 도로·등산로, 집 진입로·선착장 보행, 낮밤 조명, 실제 시야 삼각형 및 참조 사진과 나란히 보는 화면 검수로 구성한다. 스폰의 95k 삼각형 기준을 유지하며 정밀도 증가분은 LOD와 보이지 않는 지형 컬링으로 줄인다.

`terrainStats()`의 `tris`/`farTris`는 메모리에 남아 있는 활성 청크 총량이다. `drawnTris`/`drawnFarTris`는 부모 visibility와 현재 카메라 frustum을 적용한 화면 기여량이다. W7에서 원경 표본이20u에서10u로 늘었으므로 원경 화면 예산은 후자로 검증하고, 기존 총량 지표도 디버그용으로 유지한다. 삼각형 예산 수치 자체는 높이지 않았다.

참조와 차이는 남아 있다. 기존 기능을 담은 중심 시가지의 직교 블록, 간략화한 요트항과 단독주택, 넓은 모래 곶과 호안은 원본보다 도식적이다. 지형의 정밀화와 코드 기반 로우폴리 모델은 사진의 실사 수목·암석 질감을 복제하는 작업과 구분한다.


## 최종 검증 (2026-11-06)

도시330채(기존134+W7 추가196), 교외90채·골목8개, 농촌55동(주택44·온실5·농가시설6), 유효 농지113필지. 등산로 약1058u. 최신 스폰 시야94,320 tris /392 calls로95k 삼각형 기준을 유지했다. 일반 GPU의60fps를 보증하는 측정은 아니다.

타입 검사와 기능 스펙106개를 분할 검증했다. 첫 전체 실행은 저장 공간 ENOSPC로 중단되어 단일 브라우저로 남은 검사를 재개했다. 확인된 밭·정상 경사·보행 경로 문제를 수정하고 관련 스펙을 다시 통과했다. 최종 지도/수면 재검증9개도 통과했다. 검사 도구6개는 기능 스펙 수에 포함하지 않는다.
