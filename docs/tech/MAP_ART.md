# 참조 지도 기반 전역 경관 (2026-11-05)

참조: `client/tests/reference/Snowy Mountain Island Cityscape.png`, `Pastoral Island Mountain and Lakes Map.png`. 외부 3D·텍스처 파일을 추가하지 않고 기존 정점색 로우폴리 방식으로 도시·시골 섬을 다시 구성했다. 핵심 목적지·문·도로·게임 좌표·세이브 키는 유지한다.

## 구성과 파일

- `render/island-landscape.ts`: 북서~북~북동 설산의 침엽수 숲, 설선 위 눈 덮인 나무, 해안 바위, 동쪽 반도 산책로·천문대, 북쪽 항법 안테나, 남쪽 해안 야자수.
- `render/city-natural.ts`: 빈 시가지 블록에 72채의 낮은 주택·상점 전면·작은 사무실. 기존 건물/문/차도/광장/예약 구역과 여유를 두고 생성한다. 배경 건축물에는 새로운 상점·퀘스트를 추가하지 않는다. 충돌체는 외형 발자국과 일치한다.
- `render/city-gardens.ts`: 북서 분수 공원의 8개 방사형 산책로, 자전거 순환로, 바깥 동심원 보행로·화단.
- `render/city-waterfront.ts`: 실제 남동 해안 밖 요트항·잔교·계류장·L자 방파제·항구 표지, 남쪽 모래 해변의 파라솔·선베드. 육지 쪽 연결 잔교와 보행 가능한 부두는 표시 모델과 같은 좌표/높이의 데크로 등록한다.
- `render/rural-landscape.ts`: 불규칙한 농지 패치·둑·과수원, 작은 호수 마을·온실·농가, 중앙 산 나선형 등산로·정자, 큰 호수 벚꽃·해안 바위. 교도소·수면·도로를 비운다.
- `render/landscape-surface.ts`: 지형 높이를 따라가는 포장 띠·밭·원형 초지. `rural-art.ts`의 정자·온실·허수아비·바위를 함께 사용한다.
- `render/landscape-batch.ts`: 정적 경관 병합 및 숲 LOD. 가까운 숲은 100u 청크, 원경 표본은 300u 청크에 병합한다. LOD가 바뀐 청크만 인스턴스 행렬을 갱신하며 전체 지도 촬영 시 근거리 모델을 모두 표시한다.
- `render/terrain.ts`: 원경 땅을 320u 청크로 나눠 시야 밖 섬을 컬링한다. 면별 거친 색 노이즈와 기존 농지 체크색을 제거했다. 코어 높이·지형 판정은 그대로다.
- `render/city/layout.ts`: 잔디를 연속 면으로 병합한다. 질감 변화는 실제 조경으로 만든다.
- `render/wild-lake.ts`: 기존 큰 호수 선착장 상면과 동일한 보행 데크를 등록했다.

## 도시 쪽 다리 진입부

[연결부 수정](../BRIDGE_APPROACH.md) 참고. 짧고 급한 S자 대신 도시 도로 z=272에서 다리 램프 z=372까지 100u에 걸쳐 중심선과 차로 폭을 옮긴다. 양끝 접선·곡률을 직선에 맞추고, 경로와 겹치는 주차·컨테이너·수목·가로등·울타리를 정리했다. 세단 주행 중 충돌·침수 0회를 확인했다.

## 검수

- 모델 부품·예산·관절 계약·실내 50종: `tests/e2e/modeling.spec.ts`.
- 기존 문/도로 보존·경관 분포·초기 시야 95k 예산: `tests/e2e/landscape.spec.ts`.
- 진입 곡률·보도 여유·연결부 이미지: `tests/e2e/bridge-approach.spec.ts`.
- 기존 도시/월드/다리/차량 파손/포탈/실내·축구 동작은 관련 E2E로 검증한다.
- 검수 이미지: `client/tests/out/landscape-{city,rural,islands}.png`, `bridge-approach-{top,oblique}.png`, `model-{gallery,interiors}.png`.
- 계측: `client/tests/out/landscape-stats.json`, `model-stats.json`. 전역 경관 추가 후 초기 시야 101.5k → 원경/바닥 최적화 후 88.6k tris(최종 통합 결과는 모델링 로그에 기록).

최종 통합: 농지 62개, 농촌 건물 35채(온실 3동 포함), 벚꽃 77그루. 초기 시야 90,218 tris / 197 calls. 타입 검사와 관련 E2E 33개 통과, 마지막 경관 3개 재검증 통과.
