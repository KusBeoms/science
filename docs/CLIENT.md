# 클라이언트 구조 (`client/`)

원본 단일 파일 `index.html`(약 1,100줄)을 TypeScript 모듈로 분할한 것. 게임플레이·수치·세이브 구조(`stealPlanet4`, v3 마이그레이션)는 원본과 동일하다.
번들러 없이 브라우저 네이티브 ES 모듈로 실행한다. three.js r128 은 CDN(UMD) 전역 `THREE`.

## 빌드 / 실행
```
cd client && npm install && npx tsc     # src/ -> public/js/ (npm run build | watch | typecheck)
python3 -m http.server -d public        # 정적 서빙만으로 동작 (서버 API 없으면 조용히 localStorage 전용)
```
- `public/index.html`: 원본 body 마크업 + `/style/{base,hud,overlays,responsive}.css`(로드 순서 = 캐스케이드 순서) + three.js CDN + `<script type="module" src="/js/main.js">`
- 상대 import 는 `.js` 확장자 필수 (`import {S} from './core/state.js'`). `tsconfig`: strict, ES2020, `rootDir=src`, `outDir=public/js`.
- `public/js/` 는 빌드 산출물. 코드는 prettier(`client/.prettierrc.json`)로 문장 단위 포맷. 모든 `src/**/*.ts`·`public/style/*.css` 는 500줄 이하.

## 의존 방향
`data → core → render / game → systems → main` (역방향 import 없음, 콜백 등록도 필요 없었음)
- `core/state.ts` 는 `net/api.ts` 를 import (api 는 아무것도 import 하지 않음).
- `data/missions.ts` 는 미션 getter 때문에 `core/state` 를 import 한다 (순환은 없음).
- `render` 는 `game` 을 import 하지 않는다. `game` 이 `render` 를 호출한다. 키/버튼 바인딩은 `systems/` 에 모아 `game` 모듈은 부작용 없이 import 만 되도록 했다.

## 공유 상태 설계
- `core/state.ts` 의 `S`: 세이브 객체(한 번 만들어 계속 같은 객체를 변이). `applySave`로 병합, `save()`가 localStorage + 서버 큐에 쓴다.
- `core/runtime.ts` 의 `G`: 원본의 전역 `let` 변수 전부(플래그·타이머·three 객체 `me/scene/camera/rival/nestMesh/...`·`keys/yaw/pitch/camDist`). ES 모듈은 import 한 `let` 에 대입할 수 없어 하나의 객체로 묶었다. THREE/라이벌 필드만 `any`.
- `paused()`, `releaseLock()` 도 `core/runtime.ts`.
- 게임 로직 상수/배치: `core/layout.ts` 의 `LAY`(항성·공전 배치), `nests`(둥지 상태).

## 모듈 목록
| 파일 | 역할 |
|---|---|
| `main.ts` | 부팅: THREE 확인 → (로컬 세이브 없을 때만) 서버 복원 1회 → `bindUI` → 5초 자동저장/pagehide → `initWorld` → 입력 → `frame` |
| `core/types.ts` | `Planet, Zone, Owned, Carry, SaveState, Layout, Target, Pick, QuizCtx` 등 |
| `core/three.d.ts` | `declare const THREE: any` |
| `core/util.ts` | `$ rnd clamp fmt shuffle dist2 setTxt` |
| `core/state.ts` | `S, applySave, hadLocalSave, save, clearSave, mul, dexN, income, newPlanet, freeCount, freeSlot, cap` |
| `core/geometry.ts` | `inTile locked onGround blockedAt slotPos zoneAt SHOP_AT SPAWN` |
| `core/layout.ts` | `STARS genLayout stepLayout LAY nests nestPos` |
| `core/runtime.ts` | `G, paused, releaseLock` |
| `data/planets.ts` | `R DB RW GROW MUT P SOLAR pickFrom` |
| `data/zones.ts` | `TS H SS SH Z SLOTMAX SPDMAX` |
| `data/shop.ts` | `SPR sprStyle BAGS DECO LOOK spdCost slotCost` |
| `data/quiz-planet.ts` / `quiz-gate.ts` | `PQ`(행성별 문제) / `GQ`(입장 시험 문제) |
| `data/missions.ts` | `MS` |
| `game/hud.ts` | `toast flash infoHTML` |
| `game/quiz.ts` | `openQuiz answer nextQ closeQuiz` |
| `game/actions.ts` | `tryGrab openGate loseCarry caught respawn deposit sell act` |
| `game/shop-ui.ts` | `openShop closeShop renderShop` (탭별 렌더, `spend`) |
| `game/dex.ts` | `renderDex toggleDex stageOf` |
| `game/missions.ts` | `missionTick` |
| `render/textures.ts` | `planetTex planetR makePlanet freePlanet freeTree label checkerTex` |
| `render/characters.ts` | `blocky animateWalk applyLook` |
| `render/guardian.ts` | `makeGuardian GGLOW` |
| `render/gear.ts` | `buildSpringOnHand buildBag syncCarry` |
| `render/deco.ts` | `applyDeco` |
| `render/world.ts` | `initWorld` (씬·타일·상점·문·수호자·플레이어·라이벌) |
| `render/sync.ts` | `syncPlanets` |
| `systems/input.ts` | 포인터락·마우스/터치/휠·조이스틱·`clickAt`(`setupPointers`), 키보드(`setupKeys`) |
| `systems/ui.ts` | 버튼 바인딩(`bindUI`), `startGame`, "새로 시작" |
| `systems/rival.ts` | `updateRival` |
| `systems/hazards.ts` | `hazards gravityNow` + 혜성 |
| `systems/target.ts` | `updateTarget`: 상호작용 대상 탐색 + 하단 정보/프롬프트 |
| `systems/loop.ts` | `frame`: 성장·밤낮·이동·점프·수호자·카메라·렌더·HUD |
| `net/api.ts` | `getPid fetchRemoteSave queueRemoteSave markFresh submitScore fetchLeaderboard` |

## 서버 연동 (`net/api.ts`, 선택적)
- pid: localStorage `science26.pid` (없으면 24자 랜덤 생성).
- 부팅 시 **로컬 세이브가 없을 때만** `GET /api/save/{pid}` 1회(4초 타임아웃) → 성공 시 `applySave` 후 즉시 `save()`.
- `save()`가 localStorage에 쓸 때마다 `queueRemoteSave(json)` → 마지막 내용을 **10초 이상 간격**으로 `PUT /api/save/{pid}` (256KB 초과 시 생략, 404/405/501 이면 이후 PUT 중단).
- "새로 시작": `stealPlanet4/3` 삭제 + `science26.fresh` 플래그 → 다음 부팅의 서버 복원 1회 억제 후 플래그 제거. 이후 PUT 이 서버 세이브를 덮어쓴다.
- `submitScore(name, score)` / `fetchLeaderboard(limit)` 는 export 만 (UI/호출 없음). 모든 fetch 실패는 catch 후 무시.

## 원본과의 의도적 차이 (동작 동등)
- `frame()` 의 문 라벨 변경 감지 키를 `(lk?next:'o')+zi` → 템플릿 문자열로 바꿈 (TS 타입 때문. 변경 감지 의미는 동일).
- 스태미나 바의 `_w/_t` 캐시를 요소 expando 대신 모듈 변수로 보관.
- 서버 복원이 `await` 를 쓰므로 게임 시작이 최대 4초(서버 무응답 시) 지연될 수 있다 — 로컬 세이브가 없을 때만.

## 원본 버그 후보 (수정하지 않음)
- `save()`는 라이벌이 훔쳐 도망치는 중인 행성을 첫 빈 슬롯에 임시로 끼워 저장하는데, 모든 슬롯이 가득 차 있으면(`findIndex`=-1) 저장본에서 그 행성이 사라진다 (훔친 직후 슬롯이 비므로 사실상 발생 불가).
- `deposit()`의 슬롯 가득 참 토스트는 `break` 후에도 `syncCarry()`를 호출해 불필요한 재생성이 일어난다 (성능만).
