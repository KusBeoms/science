# 테스트 / E2E 하네스 (`client/tests/`)

헤드리스 Chromium(Playwright)으로 실제 게임을 구동한다. WebGL 은 SwiftShader(소프트웨어)로 동작한다.

## 실행
```
cd client
npm install
npm run test:e2e:install     # 최초 1회: 크로미움 다운로드 (~100MB, ~/Library/Caches/ms-playwright)
npm run test:e2e             # tsc 빌드 -> (테스트가 정적 서버 자동 기동) -> playwright test
npx playwright test ui       # 일부만 (빌드는 먼저 npx tsc)
```
- 결과물: `client/tests/out/*.png`(스크린샷, git 제외), `tests/out/results/`(실패 컨텍스트).
- 현재 기준선: 8개 테스트 약 50초, FPS 기준선 약 43 (1024x640, SwiftShader. 절대값보다 변화량을 볼 것).

## 구성
| 파일 | 역할 |
|---|---|
| `client/playwright.config.ts` | workers=1, 타임아웃 90초 |
| `tests/e2e/server.ts` | `client/public` 정적 서버(포트 자동), `/api/*` 는 404 (서버 미연동 경로 검증) |
| `tests/e2e/fixtures.ts` | `game` 픽스처: 크로미움 launch args(SwiftShader), CDN three.js 를 `tests/vendor/three.min.js` 로 `page.route` 대체, console error/pageerror/requestfailed 수집, `unexpected()`(예상된 /api 404 제외), `canvasColors()` |
| `tests/e2e/smoke.spec.ts` | 로드 -> 메뉴 -> 시작 -> 캔버스 비단색 -> WASD/Shift/Space 12초 -> 에러 0, FPS 측정 |
| `tests/e2e/save.spec.ts` | v4 복원, v3 만 있을 때 이어받기+v4 저장, 새로고침 |
| `tests/e2e/ui.spec.ts` | 상점/도감 열기·닫기(버튼/X/Esc/B), 퀴즈 오버레이 |
| `tests/vendor/three.min.js` | npm `three@0.128.0` 빌드 사본. 테스트 전용(앱/배포물 미포함) |

## 작성 팁
- 퀴즈 등 내부 상태는 `window.__game` 훅이 없어도 `await import('/js/game/quiz.js')` 로 같은 모듈 인스턴스를 얻어 직접 호출할 수 있다(ui.spec 참고). `?debug=1` 훅이 생기면 이를 우선 사용.
- WebGL 캔버스는 `preserveDrawingBuffer` 가 꺼져 있어 `requestAnimationFrame` 콜백 안에서 복사해야 한다(`canvasColors`).
- 새 문서 오버레이/버튼을 추가하면 ui.spec 에 열기·닫기 테스트를 추가한다.
- 테스트 파일도 500줄 이하.

## 마일스톤 QA 체크리스트
1. `cd client && npm run test:e2e` 전부 통과 (tsc 에러 없음).
2. smoke 의 console error / pageerror 0건. 새 `/api` 호출이 생겼다면 404 에서도 조용히 실패하는지 확인.
3. `tests/out/smoke-played.png`, `ui-*.png` 를 열어 눈으로 확인 (HUD 겹침, 빈 화면, 깨진 텍스처).
4. FPS 기준선(`FPS_BASELINE`)이 이전 대비 크게(예: 30%+) 떨어지지 않았는지.
5. 세이브 스키마를 바꿨다면 save.spec 에 이전 버전 세이브 이어받기 케이스 추가.
6. 새 기능의 UI 경로(열기/닫기/키 입력)용 e2e 추가, `docs/CLIENT.md` 갱신.
7. 모든 코드 파일 500줄 이하 확인 (`find client/src client/tests -name '*.ts' | xargs wc -l | sort -n | tail`).
8. 수동으로만 확인 가능한 항목(터치/모바일, 실GPU 성능, 포인터락, 오디오)은 별도로 체크.
