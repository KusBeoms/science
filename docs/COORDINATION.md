# AI 작업 조율

> `CLAUDE.md` 규칙: 작업 전 확인, 담당 파일 기록, 다른 담당 파일 수정 금지, 중복은 이 문서에서 조율, 완료 시 상태 갱신.

## Codex — 모델링 → 모델링 커밋 → 참조 지도 전역 아트 (진행 중, 2026-11-05)

사용자 요청: `MODELING_HANDOFF.md` 모델링을 마무리해 본인 변경을 커밋한 다음, `client/tests/reference/` 2장의 지도에 맞춰 맵 전역을 자연스럽게 재구현.

### 담당 / 수정 파일

- 신규 모델: `client/src/render/{animals,pet-rig,portal-art,vehicle-art,interior-art,sector-art,rural-art,shoreline,uniform}.ts`, `render/lowpoly/structure.ts`, `render/city/{facade-art,stadium-art}.ts`.
- 모델 연결: `render/{characters,vehicle,pets,plaza,portals,interior,landmarks,wild}.ts`, `render/city/{index,props,landmarks3}.ts`. `systems/wildlife.ts`의 모델 생성만 `render/animals.ts`로 추출, `soccer/{team,rules}.ts`는 유니폼 호출만 추가.
- `render/terrain.ts`: 정점색 노이즈 부분만 변경. `render/world.ts`: shoreline import/호출만 추가. **이 두 파일의 지형·다리 통합은 다른 AI 담당으로 보고 추가 수정하지 않는다.**
- 테스트: `client/tests/e2e/modeling.spec.ts` 및 맵 전역 아트용 신규 테스트.
- 문서: `docs/{MODELING_LOG,COORDINATION}.md`, README 색인 항목, WEB_ROOT_README 모델링 상태.
- 다음 지도 아트 담당 예정: 신규 `render/{island-landscape,rural-landscape,city-natural}.ts` 및 필요 부품 분리 파일. 기존 땅 높이/물 판정/도로/상호작용 좌표를 읽어 모델을 배치하고, 도시 코어·산악 외곽·해변·요트항·시골 농경지·마을·정상 정자·호숫가·해안 소품을 보강한다. 연결은 본인 담당 `render/city/index.ts`, `render/wild.ts`에서 한다.

### 중복 감지 및 조율 요청 — 다리 담당 AI가 확인할 것

- 작업 도중 다른 AI가 `data/bridge.ts`, `render/bridge-parts.ts`, `render/bridge.ts`, `core/heightmap.ts`, `data/wild-road.ts`, `systems/index.ts` 및 world의 다리 연결을 작성하는 것을 확인. 사용자도 다른 AI 동시 작업을 확인함.
- Codex의 최초 현수교 시각 모델은 `/tmp/science-modeling-owned/bridge.ts`에 보존하고, 작업 트리는 다른 AI의 현수교로 전환했다. **도시 index에 추가했던 중복 buildBridge 호출은 제거했다.** 다리는 world에서 한 번만 생성한다.
- **위 다리·지형·도로·데크 파일은 Codex가 수정/커밋하지 않는다.**
- 다리 담당에게 요청: `modeling.spec.ts`에서 현재 bridge 12,256 tris가 측정됨(목표 ≤12,000). 256 tris 이상 줄여 달라. `wild-jail.spec.ts` 첫 테스트의 평지 다리 높이 가정(0)이 새 상판/해저와 맞지 않으니 담당 쪽에서 갱신해 달라.
- 지형/지도 데이터 재배치도 다른 AI가 진행한다면 **예정 파일·좌표 변경을 아래에 기록**해 달라. Codex는 현재 좌표를 읽는 렌더 아트를 진행한다.

### 현재 검증

- 타입 검사 통과. 도시/월드 테스트 8/8 통과.
- 확장 21개 테스트 중 19개 통과; 위의 현수교 예산 및 야생지 다리 가정 2건은 다른 AI 통합 중에 발견.
- 실내 50종/차량 15종/동물 5종/포탈 12종 검수 이미지: `client/tests/out/model-{interiors,gallery}.png`, 계측 `model-stats.json`.
- 모델링 커밋 준비 중: 시작 시점의 다른 변경은 baseline에 따로 보관했으며, index에 본인 패치만 분리해 넣는다. 미추적이던 `render/plaza.ts`·`render/pets.ts`는 기존 구현 위에서 모델을 갱신했으므로 파일 추가 시 기존 본문도 포함된다.

## 다른 AI 작업 영역 / 답변

아래에 담당 파일·진행 상태·요청 답변을 추가해 주세요.
