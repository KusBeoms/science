# 클라이언트 구조 (`client/`)

원본 단일 파일 `index.html`(약 1,100줄)을 TypeScript 모듈로 분할한 것. M1에서 **2D 섹터 12개 + 청크 스트리밍 + 포탈 + 확장 레지스트리 + 세이브 v5** 로 일반화했다 (기존 4구역 게임플레이·수치는 그대로).
번들러 없이 브라우저 네이티브 ES 모듈로 실행한다. three.js r128 은 CDN(UMD) 전역 `THREE`.

## 빌드 / 실행
```
cd client && npm install && npx tsc     # src/ -> public/js/ (npm run build | watch | typecheck)
python3 -m http.server -d public        # 정적 서빙만으로 동작 (서버 API 없으면 조용히 localStorage 전용)
```
- `public/index.html`: 원본 body 마크업 + `#lines`(HUD 확장 줄) + `#portal`(포탈 목록 오버레이) + `/style/{base,hud,overlays,responsive}.css`(로드 순서 = 캐스케이드 순서) + three.js CDN + `<script type="module" src="/js/main.js">`
- E2E: `npm run test:e2e` (Playwright, `client/tests/e2e/`). `?debug=1` 로 열면 `window.__game` 디버그 훅(아래)이 생긴다.
- 상대 import 는 `.js` 확장자 필수 (`import {S} from './core/state.js'`). `tsconfig`: strict, ES2020, `rootDir=src`, `outDir=public/js`.
- `public/js/` 는 빌드 산출물. 코드는 prettier(`client/.prettierrc.json`)로 문장 단위 포맷. 모든 `src/**/*.ts`·`public/style/*.css` 는 500줄 이하.

## 의존 방향
`data → core → render / game → systems → main` (역방향 import 없음, 콜백 등록도 필요 없었음)
- `core/state.ts` 는 `net/api.ts` 를 import (api 는 아무것도 import 하지 않음).
- `data/missions.ts` 는 미션 getter 때문에 `core/state` 를 import 한다 (순환은 없음).
- `render` 는 `game` 을 import 하지 않는다. `game` 이 `render` 를 호출한다. 키/버튼 바인딩은 `systems/` 에 모아 `game` 모듈은 부작용 없이 import 만 되도록 했다.
- 레지스트리 등록(부작용)은 `systems/index.ts` 한 곳에서만 한다. `game/*` 은 `Interactable`/`GameSystem` **객체를 export 만** 한다. 공용 인터페이스(`Sector, Interactable, GameSystem, Chunk, Target, Pick`)는 `core/types.ts`.
- `core/state.ts` 의 `saveHooks/loadHooks` 에 `systems/registry.ts` 가 시스템의 `onSave/onLoad` 를 넣는다 (core 가 systems 를 import 하지 않게).

## 공유 상태 설계
- `core/state.ts` 의 `S`: 세이브 객체(한 번 만들어 계속 같은 객체를 변이). `applySave`로 병합, `save()`가 localStorage + 서버 큐에 쓴다.
- `core/runtime.ts` 의 `G`: 원본의 전역 `let` 변수 전부(플래그·타이머·three 객체 `me/scene/camera/rival/...`·`keys/yaw/pitch/camDist`) + `chunks`(섹터별 로드된 씬 객체), `pads`(포탈 패드), `modal/modalClose`(범용 오버레이), `gameT`(일시정지 제외 누적 시간), `curZone`(현재 섹터 인덱스, -1=허브/허공). THREE/라이벌 필드만 `any`.
- `paused()` = 시작 전 · 퀴즈 · 도감 · 상점 · `G.modal` 중 하나라도 열림. `releaseLock()` 도 `core/runtime.ts`.
- 배치/둥지: `core/layout.ts` — 섹터별 **지연 생성**(`layoutOf(i)`), `nests[i]`(생성 전 `null`).

## 모듈 목록
| 파일 | 역할 |
|---|---|
| `main.ts` | 부팅: THREE 확인 → (로컬 세이브 없을 때만) 서버 복원 1회 → `bindUI` → 5초 자동저장/pagehide → `initWorld` → 입력 → `frame`. `systems/index.js`·`debug.js` 를 import(부작용) |
| `debug.ts` | `?debug=1` 일 때만 `window.__game = {S, G, SECTORS, systems, teleport(x,z), giveMoney(n), unlockAll(), setSector(id\|i)}` |
| `core/types.ts` | `Planet, DbRow, Sector, SectorReq, Region, Side, Owned, Carry, SaveState, Layout, Nest, Pick, Target, Interactable, GameSystem, Chunk, QuizCtx` 등 |
| `core/three.d.ts` | `declare const THREE: any` |
| `core/util.ts` | `$ rnd clamp fmt shuffle dist2 setTxt` |
| `core/save-schema.ts` | `SAVE_VER defaults() migrate(raw) zoneFrom(unlocked)` — 세이브 기본값 + 버전 체인 |
| `core/state.ts` | `S, saveHooks, loadHooks, applySave, hadLocalSave, save, clearSave, mul, sellValue, dexN, income, newPlanet, freeCount, freeSlot, cap` |
| `core/progress.ts` | `sectorUnlocked(id) locked(i) unlockSector(i) reqMissing(i) isNext(i)` |
| `core/geometry.ts` | `inBase inSector sectorDist onGround blockedAt slotPos zoneAt gateFrame nearGate padPos SHOP_AT SPAWN HUB_PAD` |
| `core/layout.ts` | `poolOf layoutOf nestOf nestPos nests forEachNest advance stepLayout` |
| `core/runtime.ts` | `G, paused, releaseLock` |
| `data/pacing.ts` | 경제 수치 한 곳: `RW GROW PRICE_MUL INC_DIV STUDY_MUL SELL_RATE DEX_REWARD_DIV MUT_CHANCE BASE_INC DEX_BONUS incomeOf spdCost slotCost` (값은 M0 그대로) |
| `data/planets.ts` / `planets-more.ts` | `R DB MUT P SOLAR ids pickFrom` / `DB_MORE`(추가 행성 행) |
| `data/sectors.ts` | `TS H SECTORS sectorIndex` (12개 섹터 테이블) |
| `data/shop.ts` | `SPR sprStyle BAGS DECO LOOK CAPS` |
| `data/quiz-planet.ts` / `quiz-gate.ts` | `PQ`(행성별 문제) / `GQ`(입장 시험 공용) + `GQU`(단원 태그별 입장 시험) |
| `data/missions.ts` | `MS` |
| `game/hud.ts` | `toast flash infoHTML hudLines addHudLine renderHudLines` |
| `game/modal.ts` | `openModal(id, onClose?) closeModal()` — 범용 오버레이 |
| `game/interactables.ts` | `registerInteractable interactableOf findTarget clickPick` — 상호작용 레지스트리 |
| `game/interact-core.ts` | `nestIt baseIt npcIt gateIt CORE_INTERACTABLES` |
| `game/portal.ts` | `portalIt portalSystem openPortal warpTo` |
| `game/quiz.ts` | `openQuiz answer nextQ closeQuiz` |
| `game/actions.ts` | `tryGrab openGate(i) loseCarry caught respawn deposit sell act` |
| `game/shop-ui.ts` | `openShop closeShop renderShop` (탭별 렌더, `spend`) |
| `game/dex.ts` | `renderDex toggleDex stageOf` (섹터별 묶음) |
| `game/missions.ts` | `missionTick` |
| `render/textures.ts` | `planetTex planetR makePlanet freePlanet freeTree label checkerTex` |
| `render/characters.ts` | `blocky animateWalk applyLook` |
| `render/characters-gaze.ts` | `updateCharacterGaze(character, camera, dt)` — 플레이어 눈동자가 최종 카메라를 따라 부드럽게 움직임. 머리·몸 회전 및 꾸미기와 독립 |
| `systems/camera.ts` | 수동 카메라 입력 추적·차량 yaw만2초 후 복귀·최대75° 상향 시야. [PLAYER_CONTROLS](PLAYER_CONTROLS.md) |
| `systems/vehicle-transition.ts` | E 승하차 모션·중복 입력 차단·강제 이동 취소. 기본 차량 API는 동기 유지 |
| `data/rural-entries.ts`, `render/rural-entry.ts` | 실제 배치 집의 문·접근 데크·동적 실내 등록. [RURAL_INTERIORS](RURAL_INTERIORS.md) |
| `render/guardian.ts` | `makeGuardian(glow)` |
| `render/gear.ts` | `buildSpringOnHand buildBag syncCarry` |
| `render/deco.ts` | `applyDeco` |
| `render/world.ts` | `initWorld` (씬·허브 타일·상점·포탈 패드·플레이어·라이벌) |
| `render/sectors.ts` | `LOAD UNLOAD tile streamSectors syncNests` — 청크 스트리밍 |
| `render/portals.ts` | `buildPads` |
| `render/sync.ts` | `syncBase` (기지 슬롯 행성 메시) |
| `systems/registry.ts` | `registerSystem systems updateSystems sectorChanged speedMul hovering` |
| `systems/index.ts` | 시스템·상호작용 등록 **단일 진입점** |
| `systems/input.ts` | 포인터락·마우스/터치/휠·조이스틱·`clickAt`(`setupPointers`), 키보드(`setupKeys`) |
| `systems/ui.ts` | 버튼 바인딩(`bindUI`), `startGame`, "새로 시작" |
| `systems/move.ts` | `movePlayer` — 이동·스태미나·점프·중력 |
| `systems/guardians.ts` | `updateGuardians` — 로드된 섹터의 문 표시 + 수호자 AI |
| `systems/rival.ts` | `rivalSystem` |
| `systems/hazards.ts` | `hazardSystem timeNow gravityNow` + 혜성 |
| `systems/target.ts` | `updateTarget`: 레지스트리로 대상 탐색 + 하단 정보/프롬프트 |
| `systems/loop.ts` | `frame`: 시간·밤낮 → 이동 → 스트리밍·섹터 시간 → 문/수호자 → 입고 → 등록 시스템 → 메시 동기화 → 대상 → 카메라/렌더 → HUD |
| `net/api.ts` | `getPid fetchRemoteSave queueRemoteSave markFresh submitScore fetchLeaderboard` |

## 섹터 시스템 (`data/sectors.ts`, `core/geometry.ts`, `core/progress.ts`)
- 좌표: x = 동(+)/서(−), z = 남(+)/북(−). 허브(기지)는 (0,0) 한 변 44. 섹터는 `center{x,z}` + 한 변 `size` 정사각형.
- 배열 순서 = 단계 번호(1부터) = 기본 해금 순서. **`id` 는 세이브 키**(`S.unlocked`, `S.portals`, `S.notes`) 이므로 바꾸지 않는다. 새 섹터는 **끝에 추가**.
- 판정: `onGround` = 허브 ∪ 해금된 섹터, `blockedAt` = 잠긴 섹터(벽), `zoneAt` = 플레이어가 선 섹터(여유 1). 섹터 사이 빈 곳은 허공 → 떨어지면 리스폰(비행 수단 시스템이 `hover()` 로 끈다).
- 문: 섹터의 `gate` 변(`n|s|e|w`) 중앙. `gateFrame(i)` = 변 중점·안쪽 방향·변 방향. 문은 `isNext(i)`(잠김 + `requires.prev` 해금)일 때 상호작용 대상이 되고, `reqMissing(i)` 가 비어야 시험을 볼 수 있다. 시험 문제: `units` 태그로 `GQU` 에서 3문제 이상 모이면 그 문제, 아니면 `GQ`.
- 해금 조건 `requires`: `prev`(이전 섹터 통과, 생략 시 바로 앞 섹터) + 선택 `dex`(도감 수) · `spd`(신발 Lv) · `vehicle`(`S.vehicle` 티어) · `chapter`(`S.chapter`). 시간이 걸리는 조건을 섞어 진행 속도를 조절하는 곳.
  - ⚠ 아래 표의 `vehicle`·`chapter` 값은 **M5 재배치 전의 임시값**이다. 최종 설계에서 이동 수단이 섹터 해금 조건이 되는 곳은 **S6(`reddwarf`, 소형 우주선)뿐**이고, 나머지 구역은 도감·신발·시험·`beat`(중간 비트 `4-N` 포함, CONTENT_PLAN 2장)로 조절한다.
- 환경 훅: `gravityMul`(점프 중력 배율), `timeMul`(그 섹터에 있는 동안 기지 성장·수익 배율), `difficulty`(1~5, 후속 밸런싱용), `solo`(혼자 도는 행성 수, 기본 = 넓이 비례·최대 16), `note`(첫 진입 안내).
- 풀: `pool`(행성 id). `ids('이름', …)` 로 만든다. 비어 있으면 `poolOf(i)` 가 앞 섹터 풀을 빌린다. 5~12 섹터는 현재 **기존 행성을 임시 재사용**.
- `S.zone` 은 호환용 파생값(`zoneFrom(S.unlocked)` = 앞에서부터 연속 해금 수). 미션 "N단계 시험 통과"가 이것을 본다.

| # | id | 이름 | 권역 | center (x,z) | 한 변 | 문 | 해금 조건(시험 외) | 환경 |
|---|---|---|---|---|---|---|---|---|
| 1 | solar | 태양계 | near | (0,−66) | 88 | s | — | |
| 2 | exo | 외계행성 | stellar | (0,−154) | 88 | s | 1 통과 | |
| 3 | gargantua | 가르강튀아 | extreme | (0,−242) | 88 | s | 2 통과 | 시간 ×3 |
| 4 | alpha | 알파 센타우리 | fiction | (0,−330) | 88 | s | 3 통과 | 중력 ×0.8 |
| 5 | belt | 소행성대 | near | (88,−66) | 88 | w | 4 통과 · 도감 10 | 중력 ×0.7 |
| 6 | kuiper | 카이퍼대 | near | (187,−66) | 110 | w | 5 · 도감 12 · 신발 Lv3 | 중력 ×0.6 |
| 7 | reddwarf | 적색왜성 마을 | stellar | (−230,−66) | 120 | e | 6 · 도감 14 · 이동 수단 1 | |
| 8 | supernova | 초신성 잔해 | stellar | (−230,−201) | 150 | s | 7 · 도감 16 · 이동 수단 1 | |
| 9 | nebula | 성운 | stellar | (−230,−366) | 180 | s | 8 · 도감 18 · 이동 수단 1 · 챕터 1 | |
| 10 | pulsar | 펄서 | extreme | (0,−594) | 200 | s | 9 · 도감 20 · 이동 수단 2 · 챕터 2 | 중력 ×1.4 |
| 11 | neutron | 중성자별 | extreme | (0,−804) | 220 | s | 10 · 도감 22 · 이동 수단 2 | 중력 ×1.8 · 시간 ×2 |
| 12 | edmunds | 에드먼즈 | fiction | (340,−360) | 260 | w | 11 · 도감 24 · 이동 수단 3 · 챕터 3 | |

> ⚠ 이 표는 **M1 임시 틀**이다(`이동 수단 N`·`챕터 N` 칸은 M5 전 임시값, 최종 이동 수단 조건은 S6 하나). 최종 구역 순서·id는 [CONTENT_PLAN.md](../design/CONTENT_PLAN.md) 2장의 "구역 번호↔섹터 id 매핑"을 따르며(M5에서 재배치), `챕터` 조건은 `S.story.beat` 기반 `beat`로 대체된다.

- 걸어서 이어짐: 허브→1→2→3→4 (북쪽 일렬), 1→5→6 (동쪽). 권역 안 7→8→9, 10→11 은 맞닿아 있다.
- 허공으로 떨어짐: 7(1에서 서쪽 126), 10(4에서 북쪽 120), 12(6에서 남북 109·3에서 동쪽 166) → 이동 수단(`vehicle` 조건)이나 포탈이 필요. (임시 틀 기준 설명 — M5 재배치 후 허공 횡단은 S6 우주선부터.)
- 쌍성계는 기존 2단계(외계행성: 적색왜성+황색 항성, 케플러-16b)가 이미 쌍성계라 별도 섹터로 두지 않았다.

## 청크 스트리밍 (`render/sectors.ts`, `core/layout.ts`)
- `streamSectors()`(매 프레임): 섹터 사각형까지 거리 `< LOAD(140)` 이면 청크 생성(프레임당 1개), `> UNLOAD(180)` 이면 해제. 청크 = 타일·테두리·이름표·항성/궤도선·수호자·문·둥지 행성 메시(`Chunk`, `G.chunks[i]`).
- 해제 순서: 둥지 행성은 `freePlanet`(공유 구 지오메트리·캐시 텍스처 보존) 후 떼어 내고, 나머지는 `freeTree`. 허브·상점·포탈 패드·배경 폴리페무스는 항상 둔다.
- 레이아웃·둥지 데이터는 처음 필요할 때(`layoutOf`) 만들고 해제하지 않는다(가벼운 데이터 — 들고 있는 행성의 둥지 정보 보존).
- 시간: `advance(i, G.gameT)` 를 **로드된 섹터에만** 매 프레임 호출. `Nest.at` 이후 경과분을 재생성 타이머·재도전 쿨다운·공전에 반영하므로, 오래 언로드됐던 섹터도 다시 로드될 때 한 번에 따라잡는다. 밤의 둥지 리셋은 생성된 모든 섹터에 적용(데이터만).
- 수호자 AI·문 표시(`systems/guardians.ts`), 둥지 대상 탐색, 3D 클릭 대상은 로드된 청크만 본다.
- 동시에 로드되는 청크는 실측 최대 6개(12개 순회). 대신 140 밖의 섹터는 그려지지 않는다(안개 160~520).

## 포탈 (`game/portal.ts`, `render/portals.ts`)
- 패드: 허브 `HUB_PAD (15,−13)` + 섹터마다 `padPos(i)`(문에서 안쪽 8, 옆으로 한 변의 1/4). 항상 존재, `S.portals[id]` 일 때만 보임(허브는 항상).
- 해금: `portalSystem.onSectorEnter` — 해금된 섹터에 처음 들어가면 `S.portals[id] = 1`.
- 사용: 패드 근처(4) E → `#portal` 오버레이(`openModal`)에 열린 포탈 목록 → 클릭하면 `warpTo(id)` (패드 + z 3 위치, 들고 있는 행성 유지). Esc/✕ 로 닫기.

## 레지스트리 / 확장 포인트
### 시스템 (`systems/registry.ts`)
```ts
registerSystem({
  id: string,                                  // 중복 시 throw
  update?(dt: number, raw: number): void,      // dt = 일시정지면 0, raw = 실제 프레임 시간
  onSectorEnter?(s: Sector, i: number): void,  // 플레이어가 섹터에 들어옴 (-1 → i 포함)
  onSectorLeave?(s: Sector, i: number): void,
  hud?(): string | null,                       // HUD 한 줄 (#lines)
  onSave?(S: SaveState): void,                 // save() 직전 — S 의 자기 필드에 써 넣기
  onLoad?(S: SaveState): void,                 // 등록 즉시 1회 + applySave(서버 복원) 때
  speedMul?(): number,                         // 이동 속도 배율 (곱)
  hover?(): boolean,                           // true 면 중력·바닥 판정 끔 (비행)
})
```
- `loop.ts` 는 `updateSystems(dt, raw)` 로 **등록 순서대로** `update` 를 호출(이동·스트리밍·수호자·입고 다음, 메시 동기화·대상 탐색 전). 섹터 변경은 `sectorChanged(prev, cur)` → leave 후 enter.
- 현재 등록: `hazards`(안내문·환경 태그·혜성) → `rival` → `portal`.
### 상호작용 (`game/interactables.ts`)
```ts
registerInteractable<T extends Target>({
  kind: string,               // Target.kind / 메시 userData.pick.kind 와 같게
  tier: 0 | 1,                // 0 = 물체(3.5 안이면 우선), 1 = 시설
  find(me): T | null,         // T = {kind, d(거리), ...자기 필드}
  info(t): string,            // #info HTML
  prompt(t): string,          // #prompt 문구
  off?(t): boolean,           // 프롬프트를 흐리게
  tapKey?: 'e' | 'f',         // 화면 프롬프트 터치 시 키 (기본 e)
  act(t, key: 'e' | 'f'): void,
  click?(pk: Pick): void,     // 3D 클릭. 없으면 4초간 우선 선택(G.pickOv)
})
```
- 대상 선택: tier 0 중 가장 가까운 것이 3.5 이내면 그것, 아니면 tier 1 중 가장 가까운 것, 없으면 tier 0. 3D 클릭이 되려면 메시 `userData.pick = {kind, ...}` 를 달고 `systems/input.ts` 의 레이캐스트 목록(`clickAt`)에 들어가야 한다(현재: 점원·로드된 둥지/문·기지 슬롯·포탈 패드).
- 현재 등록: `nest`, `base`, `npc`, `gate`, `portal`.
### HUD 줄 (`game/hud.ts`)
- `addHudLine(() => string | null)` — `#lines`(좌상단 `#carryTag` 아래)에 한 줄씩. 시스템의 `hud()` 는 자동 등록.
- 예정: UX_CUTSCENE 10.3.2 의 **`HudWidget{slot, priority, icons[], fill?}`** 확장 포인트가 `addHudLine`(문자열 줄)을 **대체**한다(슬롯 격자·우선순위, 문자열 줄 폐지). 새 시스템은 가능하면 문자열 대신 이 형태를 염두에 두고 `hud()` 를 작성한다.
### 범용 오버레이 (`game/modal.ts`)
- `index.html` 에 `<div class="hud ov" id="xxx"><div class="card">…</div></div>` 추가 → `openModal('xxx', onClose?)` / `closeModal()`. 열려 있는 동안 `paused()`, Esc 로 닫힘.
- 예정(UX_CUTSCENE 10.5): 오버레이는 좌상단 **`◀`(항상 같은 위치, 한 단계 뒤로)** 로 닫고, 최상위 화면의 `◀` 은 월드로 복귀한다(단독 `✕` 폐지, Esc·모바일 뒤로가기 = `◀`). 메뉴는 **`☰` 허브 하나**를 최상위로 두고 깊이 ≤ 2, 한 화면 탭 ≤ 5.

## 세이브 스키마 (`core/save-schema.ts`)
- 키 `stealPlanet4`(고정) — 버전은 `ver` 필드. `stealPlanet3` 키만 있으면 읽어서 이어받는다.
- `migrate(raw)`: `ver` 없으면 3 으로 보고 `STEPS[v]` 를 차례로(v3→v4: 필드 추가뿐, v4→v5: `zone` → `unlocked`, `notes` 인덱스 키 → 섹터 id) 적용 → 없는 필드는 `defaults()` 로 채움 → `deco/look` 병합 → `base` 를 `CAPS.slots.max` 길이로 패딩 → `zone = zoneFrom(unlocked)` → `ver = 5`. `base` 배열이 없으면 `null`(세이브 아님).
- v5 신규: `unlocked, portals`(섹터 id → 1), 후속 기능용 빈 기본값 `quests, vehicles, heists`(id → 숫자), `collectibles`(id → 1). 기존 v4 필드 `wanted`(수배 수치), `vehicle`(이동 수단 티어), `ach`(업적), `chapter`, `coins`, `playSec` 는 그대로 쓴다.
- 서버 PUT 상한 256KB: 12섹터 전부 해금한 세이브가 약 0.9KB. 필드는 `id → 작은 숫자` 맵으로 유지할 것.

## 새 기능 추가 방법 (후속 개발자용 레시피)
공용 파일(`loop.ts`, `world.ts`, `target.ts`, `input.ts` 의 키 처리)은 건드리지 않는 것을 원칙으로 한다.
1. **시스템** (예: 수배·레이스): `systems/wanted.ts` 에 `export const wantedSystem: GameSystem = {id: 'wanted', update(dt){…}, hud: () => …, onSectorEnter(s){…}}` → `systems/index.ts` 에 `import {wantedSystem} from './wanted.js';` + `registerSystem(wantedSystem);`.
2. **상호작용 대상** (예: 퀘스트 NPC·하이스트 지점): 메시는 `update` 안에서 처음 한 번 만들어 `G.scene` 에 넣고 `userData.pick = {kind: 'quest', id}`. `game/quest.ts` 에 `export const questIt: Interactable<…> = {kind: 'quest', tier: 1, find, info, prompt, act}` → `systems/index.ts` 에 `registerInteractable(questIt);`. (3D 클릭까지 원하면 `clickAt` 목록에 그룹을 넣는 한 줄이 `input.ts` 에 필요)
3. **세이브 필드**: `core/types.ts` 의 `SaveState` 에 필드 선언 → `save-schema.ts` 의 `defaults()` 에 기본값. 구필드의 의미를 바꿀 때만 `SAVE_VER` +1 과 `STEPS[이전버전]` 변환 추가. 런타임 상태는 시스템의 `onSave/onLoad` 로 S 와 주고받는다.
4. **이동 수단**: 시스템에 `speedMul()`(속도), `hover()`(허공 비행) 구현, 구매/장착 시 `S.vehicle`(티어)·`S.vehicles` 갱신 → 섹터 `requires.vehicle` 이 자동으로 풀린다. 비행 높이는 그 시스템의 `update` 에서 `G.me.pos.y` 로.
5. **오버레이 UI**: `index.html` 에 `.hud.ov` 블록 + `public/style/overlays.css` 에 스타일 → `openModal/closeModal`.
6. **HUD 표시**: 시스템 `hud()` 또는 `addHudLine`.
7. **데이터만 추가**
   - 행성: `data/planets-more.ts` 의 `DB_MORE` 끝에 행 추가(id = 전체 인덱스이므로 **끝에만**, 중간 삽입·삭제 금지 — 세이브 `dex`/`base` 키). 그 행성을 둥지에 내보낼 섹터의 `pool` 에 `ids('이름')` 추가. 행성 문제는 `data/quiz-planet.ts` 의 `PQ['이름']`(없으면 공용 시험 문제로 대체됨). 도감은 섹터별로 자동 묶임(처음 나오는 섹터 기준, 어디에도 없으면 "기타"), 스크롤됨.
   - 문제: 입장 시험 공용 `GQ`, 단원별 `GQU['단원'] = [...]`(섹터 `units` 태그와 매칭, 3문제 이상이면 사용).
   - 섹터: `data/sectors.ts` 의 `ROWS` **끝에** 행 추가(빈 `pool: []` 허용). 좌표는 기존 섹터와 겹치지 않게, 문 변(`gate`)은 들어올 쪽.
   - 경제 수치: `data/pacing.ts`. 상점 상한: `data/shop.ts` 의 `CAPS`(기지 칸을 10 넘게 늘리면 `core/geometry.ts` 의 `slotPos` 배치도 넓혀야 한다 — 현재 5열×2행), 가방 단계는 `BAGS` 행 추가.
8. **디버그**: `?debug=1` → 콘솔에서 `__game.unlockAll()`, `__game.setSector('pulsar')`, `__game.teleport(x, z)`, `__game.giveMoney(1e6)`.

## M1 이후 추가된 모듈
| 영역 | 파일 | 설명 |
|---|---|---|
| 컷신 | `game/cutscene*.ts`, `data/cutscenes.ts`, `data/cutscene-types.ts`, `systems/cutscene.ts`, `public/style/cine.css` | 타임라인 컷신 디렉터(카메라·배우·이모지 말풍선·FX·소리 큐·HUD 훅). 상태 변경은 `onEnd` 에서만. 데이터 포맷은 UX_CUTSCENE.md 0.1장 |
| 글 없는 UI | `game/hud.ts` | `iconToast(icons[])`, `HudWidget`(`GameSystem.widget?()`), 기존 `toast`/`renderHudLines` 유지 |
| 사운드 | `audio/*`, `systems/audio.ts` | Web Audio 합성 효과음·BGM, 음소거 🔊/🔇 버튼, 컷신 소리 큐는 `G.cineHooks.sound` 로 연결. [AUDIO.md](AUDIO.md) |
| 경제 | `data/pacing.ts`, `data/pacing-sinks.ts`, `data/planet-zones.ts`, `client/tools/econ-*.mjs` | 구역×등급 가격, 새 비용 곡선, 시뮬레이터(`cd client && npx tsc && node tools/econ-sim.mjs`). [ECONOMY.md](../design/ECONOMY.md) 9장 |
| 문제 은행 | `data/quiz-bank/*` | 210문항(구역 1~12). `GQU` 는 `buildGQUByZone(BANK_ALL)`, 섹터 `units` 는 구역 키(`Z01`~`Z12`). 행성 문제 `PQ` 는 아직 기존 `quiz-planet.ts` |
| 월드 W1 | `core/heightmap.ts`, `core/terrain.ts`, `data/world-map.ts`, `data/city.ts`, `data/citygraph.ts`, `render/city/*`, `render/crowd.ts`, `systems/crowd.ts`, `render/sky.ts`, `render/apple.ts`, `systems/daynight.ts`, `render/characters-look.ts` | 5u 격자 높이 지도(부팅 1회 굽기)·`groundH`, 도시 광장·사과 대로·상점가, 보행 그래프 군중(≤24, 말풍선 `.bub.crowd`), 하늘 돔·사과 천체, 로우폴리 캐릭터. 설계는 [WORLD.md](../design/WORLD.md) |
| 월드 W2 | `data/city-w2.ts`, `render/city/landmarks2.ts`, `render/city/tradeline.ts` (+ `data/city.ts`·`layout.ts`·`citygraph.ts` 확장) | 도시 8구역 완성: 건물 82채(암시장 노점 28·정비 창고 3·우주항 창고 6·연구동 8·주거 8 추가), 랜드마크 L4 관제탑·L5 격납고·L6 천문대 돔·L7 성(언덕 위 y=12), 거래의 선(바닥 인레이 + 금빛 기둥띠, 북쪽 사과 대로만 개구), 우주항 패드 4·정비소 착륙대 2, 군중 8구역 그래프·데스크톱 66/모바일 24. **상점 노점·점원은 `SHOP_AT=(47,−10)`(상점가 입구)로 이전**, 기지에는 받침대·포탈 패드만 남음 |
| 날씨 W3 | `render/weather.ts` (시스템 `weatherSystem`) | 카메라 둘레 상자(70×34)를 도는 `Points` 1개를 구역에 따라 종류만 바꿔 쓴다: giants 눈 · hotjup 불씨 · nebula 안개 띠 · supernova 결정 파편 · alpha 포자. 도시·그 외 구역은 없음. 전환은 1.2초 페이드 |
- 세이브 v6: `S.story`(beat·mid·seen·ended·hints). v5→v6 마이그레이션은 보유 현금을 해금 구역의 누적 지출 목표(`TARGET_CUM_SPEND`)로 1회 제한한다.
- 기지 칸 최대는 현재 허브 배치(5×2)에 맞춰 10으로 제한(`CAPS.slots.max`). 도시 허브(WORLD.md W1)에서 30으로 확장한다.
- 서버: 세이브 PUT 검증(`base`·`ver`, 깊이, NUL)·`If-Match` 낙관적 락·요청 제한. 클라이언트는 서버 버전을 알면 `If-Match` 를 보내고 409 면 그 세션의 서버 저장을 멈춘다.

## 서버 연동 (`net/api.ts`, 선택적)
- pid: localStorage `science26.pid` (없으면 24자 랜덤 생성).
- 부팅 시 **로컬 세이브가 없을 때만** `GET /api/save/{pid}` 1회(4초 타임아웃) → 성공 시 `applySave` 후 즉시 `save()`.
- `save()`가 localStorage에 쓸 때마다 `queueRemoteSave(json)` → 마지막 내용을 **10초 이상 간격**으로 `PUT /api/save/{pid}` (256KB 초과 시 생략, 404/405/501 이면 이후 PUT 중단).
- "새로 시작": `stealPlanet4/3` 삭제 + `science26.fresh` 플래그 → 다음 부팅의 서버 복원 1회 억제 후 플래그 제거. 이후 PUT 이 서버 세이브를 덮어쓴다.
- `submitScore(name, score)` / `fetchLeaderboard(limit)` 는 export 만 (UI/호출 없음). 모든 fetch 실패는 catch 후 무시.

## 원본과의 의도적 차이 (동작 동등)
- (M1) 멀리(140 밖) 있는 섹터는 그리지 않는다(청크 스트리밍). 원본은 4구역을 항상 그렸다.
- (M1) 화면에서 클릭한 기지 슬롯 우선 선택(4초)은 7 안이면 항상 우선, 멀면 다른 대상이 없을 때만 — 원본은 이때 상점/문 근처면 그쪽이 이길 수 있었다(사실상 동일).
- (M1) 행성 문제(`PQ`)가 없는 행성은 입장 시험 문제 하나로 대신 출제한다(원본은 모든 행성에 문제가 있었다).
- `frame()` 의 문 라벨 변경 감지 키를 `(lk?next:'o')+zi` → 템플릿 문자열로 바꿈 (TS 타입 때문. 변경 감지 의미는 동일).
- 스태미나 바의 `_w/_t` 캐시를 요소 expando 대신 모듈 변수로 보관.
- 서버 복원이 `await` 를 쓰므로 게임 시작이 최대 4초(서버 무응답 시) 지연될 수 있다 — 로컬 세이브가 없을 때만.

## 원본 버그 후보 (수정하지 않음)
- `save()`는 라이벌이 훔쳐 도망치는 중인 행성을 첫 빈 슬롯에 임시로 끼워 저장하는데, 모든 슬롯이 가득 차 있으면(`findIndex`=-1) 저장본에서 그 행성이 사라진다 (훔친 직후 슬롯이 비므로 사실상 발생 불가).
- `deposit()`의 슬롯 가득 참 토스트는 `break` 후에도 `syncCarry()`를 호출해 불필요한 재생성이 일어난다 (성능만).

### 달 시작·둘레 지형 (추가)
| 파일 | 역할 |
|---|---|
| game/moon-intro.ts | 새 게임 달 도착 연출 + 달 해금/시작 위치 |
| game/goal.ts | 다음 해금 목표 HUD 한 줄 |
| game/bench.ts | 벤치 앉기(E), `G.sit` |
| render/sea.ts | 해변 남쪽 바다 평면 |
| core/heightmap.ts `beltH` | 도시 둘레 산/해변 높이 |

### 건물 내부·자동차 (추가)
| 파일 | 역할 |
|---|---|
| core/scale.ts | 플레이어 크기·속도·카메라 기준값 |
| data/interiors.ts | 입장 가능 건물(87)·용도·방 크기 |
| render/interior.ts | 방 생성(가구·벽·문), 용도별 가구 |
| game/interior.ts | 입장/퇴장·방 상호작용(계산대·딜러·침대·의자) |
| data/cars.ts · render/vehicle.ts | 차 15종 데이터·모델 |
| systems/vehicle.ts | 길가 차·운전 물리·내리기 |
| game/cars.ts · game/car-shop.ts | 구매·튜닝·등록·차고·판매 규칙과 UI |

### W3 확장 (추가)
| 파일 | 역할 |
|---|---|
| data/city-w3.ts | 신도심 도로·건물 생성기·랜드마크 |
| data/soccer.ts · systems/soccer.ts · render/city/landmarks3.ts | 축구 경기장·경기 |
| data/wild.ts · render/wild.ts · systems/wild.ts | 야생지(산·호수·사막·시골)·교도소 장식 |
| systems/police.ts · systems/jail.ts | 수배 ★6·경찰 추격·교도소(탈출 허점) |
| game/phone.ts · game/phone-apps.ts · game/estate.ts · data/places.ts | 휴대폰·지도·택시·부동산 |
| render/interior-furn2.ts | 신도심 용도 방 가구·사용 지점 |

### 축구·부가 기능 (추가)
| 파일 | 역할 |
|---|---|
| soccer/state.ts · ball.ts · team.ts · rules.ts · actions.ts · ai.ts · control.ts · crowd.ts | FC 온라인풍 축구 (상태·공 물리·선수·규칙·패스슛·AI·사람 조작·관중) |
| systems/police-air.ts | 헬기·바리케이드 |
| systems/wildlife.ts | 동물·낚시 |
| game/messenger.ts · game/phone-social.ts | 메신저·사진 |

### 안내 문구 규칙 (2026-11-05)
설명·상태·실패 사유는 이모지 나열 대신 짧은 한국어 문장으로 쓴다(이모지는 앱/장소 아이콘 라벨 + 이름 정도, 동물 교감 반응은 이모지 유지). 폰·포탈·미션·HUD·놀거리(game/fun.ts, 이름·설명은 data/fun-spots.ts 의 FUN_NAME/FUN_HELP)에 적용. 포탈 해금 검토 화면은 아이콘 + 라벨 글자 + 진행 막대. 연락처 메시지는 짧은 문장 + 이모지 1~2개.
