# citygen — 도시 빌더 (도로·교차로·리본·지형)

`client/src/citygen/*`: `CitySource`(city.source.json)를 `CityCompiled`의 **도로+지형 부분**으로 바꾸는 **순수 라이브러리**. DOM·THREE·게임 런타임 모듈을 import 하지 않는다(`data/city-schema|compiled|validate|terrain-codec`만 사용). 게임·에디터·Node CLI 가 같은 코드를 쓴다. 계획: `design/CITY_REDESIGN_PLAN.md` 13절, 축척: `SCALE.md`. 구현 기록: `work-logs/W8_CITYGEN_CORE.md`.

## 파이프라인 (build.ts `buildRoadsAndTerrain`)
| 단계 | 내용 | 모듈 |
|---|---|---|
| 0 | `validateCitySource` 통과 확인(실패 시 `BuildError`), `sourceHash`(정규 JSON FNV 16hex) | bytes.ts |
| 1 | 기본 높이 해독: 인라인 `grid.data` 또는 호출자가 준 `baseHeights`(ref 파일을 CLI 가 해독). `grid.hash` 있으면 체크섬 검증 | terrain.ts |
| 2 | **1차 편집** `pad`·`brush` 를 배열 순서대로 | terrain.ts |
| 3 | 도로마다: 조밀 표본 → 종단 풀이 → 단면 해석. **한도 위반은 거부(rejected)** | roads.ts, road-profile.ts, geom.ts |
| 4 | 노드 검출(자동 교차 + NodeSource + RampSource) → 팔(arm) 생성 | junctions.ts |
| 5 | 교차로 형상: 포장 다각형·모서리·트림·횡단보도·정지선·회전교차로 | junction-geom.ts |
| 6 | **corridor 편집** + 모든 채택 도로의 자동 회랑(지상·낮은 램프) + 교차로 포장 평탄화 | terrain.ts |
| 7 | 리본 메시(조각 단면 슬라이스 → 표면별 → 청크 클리핑) | ribbons.ts, ribbon-mesh.ts |
| 8 | 출력: header(버전 3종+sourceHash+chunkSize)·bounds·terrain·roads·ribbons·junctions·rejected | build.ts |
| ▶ 6.5 | (placement 에이전트) 앵커 평탄화 패드, 필지 대지·건물 배치. `terrain.ts` 의 `siteReport`/`applyPad` 사용 | — |
| ▶ 7.5 | (placement 에이전트) 소품·건물·주차칸·충돌체·길찾기 그래프. 입력은 `result.debug.roads/junctions`(해석된 도로·교차로) | — |
`build.ts` 머리 주석에 같은 순서가 있다. 확장은 단계 6 뒤·7 앞(지형 영향), 7 뒤(placements/colliders/graph/parking)에 끼운다. `compiled` 는 `Partial<CityCompiled>` 이며 placements/colliders/graph/parking 은 비어 있다(빌더가 채울 자리).

## 규칙·약속 (코드가 지키는 것)
- 좌표 x 동+, z 남+. 접선 t, **오른쪽 법선 nR=(-tz,tx)**, 왼쪽 (tz,-tx). `ParcelSource.side` 의 left/right 도 도로 진행 방향 기준이며 위 규칙과 같다. 가로 위치 `lat>0` = 오른쪽. 곡률 부호 + = 오른쪽으로 도는 중. 우측통행.
- `HeightKey.s` 는 **도로 시작점부터 누적거리**(구간 시작이 아님). 키 밖은 끝값 유지.
- `corridor` 편집의 `cut`/`fill` = 비탈 **수평:수직 비**(3 이면 3:1, 최소 0.5), `shoulder` = 도로 바깥 평탄 어깨 폭(m). 편집이 없는 도로도 기본값(3,3,1.5)으로 자동 회랑을 판다.
- `pad`: 반경 r 안은 y(없으면 적용 시점 중심 높이)로 평지. 바깥은 y 에서 **경사 10/falloff**(상승/수평)의 포락선으로 높이를 clamp(깎기·쌓기). clamp 라서 **멱등**.
- corridor: 노면 구간은 `노면 y − 0.12`(PAVE_DROP), 보도·식재대는 `y + 0.05`, 그 밖은 cut/fill 비탈. 칸마다 **가장 가까운 구간**이 결정한다.
- 일방통행 차도 폭 = `max(3.5, lanes*laneW)`. 중앙분리대 < 1.0m 는 노란 이중 중앙선(표시), ≥ 1.0m 는 돌출 중앙분리대(+0.15, 연석 면).
- 단면 `lanes` 덮어쓰기는 구간 경계에서 `sectionBlend`(12m) 동안 smoothstep 으로 전이(차로 수는 절반 지점에서 계단식 전환).
- 연석 = 높이 0.15 의 수직 면(`curb` 표면), 보도는 +0.15 평면. 마킹 y +0.012. 표지: 노란 이중선, 흰 점선(3m/9m 주기, **도로 전역 s 위상**), 주차대·갓길 경계 실선, 정지선, 횡단보도(제브라).
- 교량·램프 상판 두께 0.8m(램프는 지면 위 높이에 비례해 0 부터), 끝 면 포함(`deck` 표면). 터널은 상판·지형 절개 없음.
- uv = (가로 m 또는 높이 m, 도로 전역 s m). 교차로 포장은 (x, z). `uv:false` 옵션이면 생략.

## 종단(세로 단면)
모드 0 = 지형 추종, 1 = 명시 HeightKey, 2 = 키 없는 교량/램프/터널(양 끝 사이 직선).
- 명시: 키 사이 직선 보간 → 이동평균(창 16m, 끝점 홀수 반사로 고정, 최대 경사 비증가).
- 추종: 지형 이동평균(창 expressway 80 / 간선 50 / 그 외 30m) → 양 끝 고정점과 40m 이음 → 등급 한도×0.97 로 앞뒤 제한 → 20m 평활. 제한이 실제로 걸리면 경고 `grade-limited`.
- **거부 코드**(해당 도로는 compiled 에서 빠지고 `rejected` 에 사유): `grade-exceeded`(종단 경사 > 등급 한도×1.02 — 명시 키 등), `earthwork-exceeded`(지형 추종 종단이 지형에서 10m 초과로 벗어남), `segment-overlap`. 조용한 보정은 지형 추종의 ×0.97 제한뿐이며 보고된다.
- 경고(`warnings`): `grade-limited`, `tight-curve`(곡률 반경 < 포장 반폭), `sample-cap`, `node-road-far`·`node-road-missing`·`node-layer-mismatch`, `junction-warning`.

## 교차로
- 후보: ① 같은 층·램프 아님 중심선 교차 ② 도로 끝이 다른 도로 옆면 2m 이내 ③ 끝-끝 접촉 ④ NodeSource(도로 12m 이내) + RampSource 의 램프 도로. 반경 3m(자동)/8m(NodeSource)로 합쳐 군집 = 노드. **층이 다르면 절대 합치지 않는다**(`node-layer-mismatch` 경고). 램프 구간 표본은 자동 교차에서 제외, 명시 노드로만 연결.
- 팔: 도로가 노드를 지나면 2개, 끝이면 1개. 방향은 노드에서 8m 떨어진 점의 현. 같은 도로의 팔만 있으면(통과) 폴리곤 없음(`passThrough`), signal 이면 횡단보도만.
- 포장 다각형: 팔을 각도순으로 정렬해 이웃 팔 가장자리 직선의 교점 C 를 구한다. φ<180° 오목 모서리는 반경(국지 6/집산 8/간선 12/고속 15)의 이차 베지어, 접선 길이는 `min(r/tan(φ/2), 1.6r)`(예각 마이터 한계). φ>180° 볼록 모서리는 마이터 꼭짓점, φ≈180° 는 직선. 팔 트림 = 모서리가 요구하는 최대값, **상한 60m**(넘으면 경고). 팔은 노드 부근에서 직선이라고 가정한다.
- 삼각분할: 중심(팔 원점 평균, y=팔 y 평균) 부채꼴, 별 모양이 아니면 귀 자르기. 꼭짓점 y 는 팔 트림 위치의 종단 y.
- 보도 모서리 띠 + 연석 면, 지형 평탄화(포장·띠 삼각형 래스터).
- 회전교차로(`kind:'roundabout'`, 팔 ≥ 2): 바깥 반경 `max(13, 최대반폭+4)`, 링 폭 7.5, 중앙섬 `median` 원판+연석. 팔 입구는 현(트림 상수), 사이는 호.
- 신호(`signal`): 팔마다 횡단보도(폭 3.0, 줄무늬 0.5/0.5, 트림+0.5 부터), 진입 차로 정지선(횡단보도에서 1.5m 후퇴).
- 도로 끝(교차로 없음): 포장 끝 연석 면 + 보도 마감 띠.
- 출력 `junctions[]`(additive): id·kind·layer·위치·포장 외곽선·팔(road,dir,s,trim)·섬·횡단보도 수·정지선 수. **그래프/신호/횡단보도 배치는 이 노드를 기준으로** 확장.

## 리본·청크
- 도로 조각 = 도로에서 교차로 트림 구간을 뺀 나머지. 슬라이스는 조밀 표본을 허용 오차(위치 4cm, 높이 2.5cm, 폭 5cm)로 솎되 최대 간격 12m, 구간 경계·차로 수 변화·제어점은 유지. 양 끝은 정확한 트림 위치.
- 가로 위치 벌어짐은 안쪽 급커브에서 곡률 반경의 0.8 로 제한(꼬임 방지). `geom.offsetPolyline/offsetPolygon` 은 마이터 한계(2.5)·자기교차 정리를 지원하는 일반 도구(리본 본체는 슬라이스 방식).
- 표면: asphalt, shoulder, median, sidewalk, curb, marking, crosswalk, deck. 청크 키 `"cx,cz"` = `floor(x/chunkSize)`. **삼각형은 청크 경계에서 잘려** 모든 정점이 해당 청크 안(반올림 1cm 이내). 정점은 (방향 태그, 위치 cm, uv) 값으로 중복 제거. 출력 좌표는 소수 2자리, uv 1자리.
- `maxVertices`(기본 400만)를 넘으면 `ribbon-overflow` 거부 항목과 `stats.overflow`.

## 지형 API (terrain.ts)
`makeTerrain`, `terrainFromSource(src, base?)`, `sampleBilinear/sampleBicubic`, `slopeAt/slopeMap`, `applyPad/applyBrush/applyPreEdits`, `carveCorridor`, `rasterTriangles`, `encodeTerrainCompiled`(높이 cm delta-b64 + `surfaceMask`).
- `surfaceMask` 비트(1바이트/칸, RLE-b64): 0~1 경사등급(0 <3%, 1 <12%, 2 <30%, 3 ≥30%), 2 고도>건축 상한(40), 3 도로·패드 평탄 구역.
- **`siteReport(t, cx, cz, w, d, rotDeg, maxSlope=0.12, maxAlt=40)`** → `{maxSlope, meanSlope, planeSlope(최소제곱 평면 경사), minH, maxH, relief, centerH, okSlope, okAlt, ok}`. 부지 배치(필지/건물)가 쓴다. `rotDeg` 는 `BuildingSource.rot` 규칙(로컬 +z 가 +x 로 도는 방향).
- 붓: raise/lower(`strength` m 가중), flatten(획 평균 높이로), smooth(3×3 평균, 스냅샷 기준). 가중치 smoothstep(1−d/r).

## 결정성 규칙
난수·시계·Map/객체 키 순서에 의존하지 않는다. 같은 `source`+`seed`+`generatorVersion` → 같은 `compiled`(`stats.timingsMs` 제외). 입력 키 순서가 달라도 `sourceHash` 동일(정규 JSON). 모든 정렬은 안정적 비교자, 출력 직전 반올림(`rnd`). 거부·경고 순서는 원본 도로 순서.

## 한도 (`city-schema.ts` LIMITS 와 이 문서의 값)
`curveMaxErr` 0.1m(Catmull 평탄화 오차), `samplesPerRoad` 20000(초과 시 간격을 늘려 `sample-cap` 경고), `sampleStep` 1m(조밀), 슬라이스 최대 12m, 트림 상한 60m, 지형 추종 최대 절토·성토 10m, 종단 한도 ROAD_CLASS_DEFAULTS.maxGrade(+2% 허용), 교차 군집 반경 3m, 노드 합류 8m, 노드-도로 탐색 12m, 도로 끝 접촉 2m, 리본 정점 400만.

## CLI
```
cd client && npx tsc && node --no-warnings tools/city-build.mjs [--src 파일] [--out 파일] [--pub 폴더] [--chunk 64] [--no-uv] [--no-mask] [--strict] [--quiet]
```
기본 입출력 `public/data/city.source.json` → `public/data/city.compiled.json`. `grid.ref` 가 있고 `data` 가 없으면 `public/<ref>`(city-terrain/1 파일)를 `decodeTerrain` 해 기본 높이로 쓴다(격자가 원본 grid 와 다르면 오류). 보고: 도로 채택/거부, 연장, 교차로, 리본 정점·삼각형, 전체·부분 크기(raw/gzip), 단계별 ms, 거부·경고 목록. 종료 코드 0/1(입력·검증 오류)/2(`--strict` 이고 거부 있음).

## 규모 추정 (60km 격자 합성 시험, 시스템 노트북 Node)
도로 30개·60km·교차 169, 완만한 가상 지형: 빌드 약 0.5~0.7초. `compiled.json` **8.9MB (gzip 1.7MB)**, 그중 리본 7.5MB(gz 1.4MB), 지형(601²) 0.6MB, 도로 표본 0.6MB, 교차로 0.16MB. 정점 219k·삼각형 178k(표면별 asphalt 38k, sidewalk 51k, curb 61k, marking 70k). `--no-uv` 면 약 6.6MB(gz 1.3MB). 실제 도시는 곡선·횡단보도·고가가 늘어 20~30% 더 클 수 있다(추정).

## 테스트
`tests/e2e/citygen-core.spec.ts`(+`citygen-fixtures.ts`): 십자·예각 T·언덕(성공/거부)·고가+램프·회전교차로·지형 편집·기하 도우미·60km 스모크. 결정성(2회·키 순서·seed), NaN/인덱스/청크 경계, 교차로 겹침 면적·틈·자기교차·보도 이음, 등급 한도, 층 분리, 패드 평지(≤0.01)·멱등, 음성 대조(검사가 실제로 잡는지). WebGL 불필요.
