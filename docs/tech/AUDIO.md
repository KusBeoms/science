# 오디오 (G1 사운드)

외부 오디오 파일 없이 Web Audio 로 전부 합성한다. 첫 사용자 입력(포인터/키/터치) 전에는 `AudioContext` 를 만들지도 않으므로 무음이다.

## 구조 (`client/src/audio/`)
| 파일 | 역할 |
|---|---|
| `ctx.ts` | 지연 생성·`resume`, 게인 그래프, 음소거/볼륨 저장(localStorage `stealPlanetAudio`, try/catch), 탭 숨김 시 suspend |
| `synth.ts` | `tone`/`noise`/`coin` 부품, `hz(midi)` |
| `sfx-game.ts` / `sfx-cue.ts` | 게임 이벤트 효과음 / 컷신 소리 큐 |
| `sfx.ts` | `sfx(name)`, `duck(on)` (같은 소리 최소 간격으로 연타 방지) |
| `bgm.ts` | 절차적 BGM 3종 (8분음표 룩어헤드 스케줄러, 1초 크로스페이드) |
| `index.ts` | **어댑터** — 모듈 import 와 전역 `window.sfx`, `window.gameAudio` 동시 제공 |
| `systems/audio.ts` | 발소리·점프·포탈·밤·수호신 접근 감지, BGM 자동 선택, 🔊/🔇 버튼(`#muteBtn`) |

게인: `world`(덕킹) → `sfx` ┐ / 컷신 큐 → `sfx` ┤ → `master` → 리미터 / `bgm` ┘.

## API
```ts
import {sfx, duck, setBgm, setMute, setVolume} from '../audio/index.js';
sfx('steal');              // 알 수 없는 이름·미개방·음소거면 조용히 무시 (에러 없음)
duck(true);                // 컷신 시작: 월드 효과음 -12dB (큐·BGM 은 그대로), 종료 시 duck(false)
setBgm('ending');          // 'hub'|'tense'|'ending'|'none'(무음)|null(자동 복귀) — 컷신이 직접 지정
setVolume('bgm', 0.2);     // 'master'|'sfx'|'bgm' 0~1
window.sfx('ping'); window.gameAudio.setBgm('none');   // 전역 접근
```

## sfx 이름표
게임 이벤트 (호출 지점):
| 이름 | 소리 | 호출 |
|---|---|---|
| `step` `jump` | 발소리(2.6 거리마다) / 점프 | systems/audio |
| `steal` | 상승 3음+반짝 (훔치기 성공) | actions.tryGrab |
| `stash` `dex` | 입고 / 도감 등록 종소리 | actions.deposit |
| `sell` `buy` `deny` | 금화 짤랑 / 구매 2음+금화 / 낮은 부저 | actions.sell, shop-ui |
| `quizRight` `quizWrong` | 상승 2음 / 하강 2음 | quiz.answer |
| `quizPass` `quizFail` | 시험 통과 아르페지오 / 하강 3음 | actions.openGate·tryGrab |
| `open` `close` | UI 열기/닫기 | quiz, shop-ui, dex, modal |
| `alert` | 경적 짧게 2번 (저역+고역 이중) | 컷신/HUD 용 |
| `danger` | 저역 스웰+고역 펄스 (수호신 추격권 진입) | systems/audio |
| `caught` `fall` | 잡힘 / 우주로 추락 | actions |
| `portal` | 우웅→쿵 (포탈 이동) | systems/audio |
| `night` | 느린 하강+먼 차임 | systems/audio |

컷신 소리 큐 (컷신 디렉터가 `sfx(이름)` 으로 호출, 덕킹 없음):
| 이름 | UX_CUTSCENE 의 소리 |
|---|---|
| `heart` | 💗 "뿅" 3음 상승 (C01) |
| `coin` / `coinFall` | 금화 흡수 "칭" / 금화 폭포 ~4초 (C02, C08) |
| `ping` | ❗ "띠링" 의뢰음 (C10) |
| `whoosh` | "슉"·피치 하강 (C04, M4) |
| `gulp` / `arpeggio` | "꿀꺽" / 금화 상승 아르페지오 (C05) |
| `fanfare` / `relief` | 팡파르 짧게 / 안도 코드 (C08, C07) |
| `boom` / `roar` | 쿵 / 포효 (C06) |
| `swell` | 저음 드론 스웰 (C03, M4-4) |
| `wind` / `thud` / `crack` | 바람 / 둔탁한 "푹" / 유리 금 (C11) |
| `stinger` | 결의 스팅어 (C01, M4-5) |
| `clang` | "쨍" 금속 스팅어 (C03) |
| `hum` | 상인 "오오" 허밍 (C08) |
| `sigh` | 낮은 한숨 (M4-2) |
| `chime` / `ting` / `ding` / `tick` | 반짝 차임 / "팅" / 체크 "딩" / "탁·툭" |
| `rise` / `portalCharge` | 상승음 / 포탈 "우웅" 충전 |

무음·즉시 컷은 `setBgm('none')`. 빗소리는 `setBgm('ending')` 의 배경 노이즈로 제공한다.

## BGM
- `hub`: 76bpm, C-Am-F-G 패드 + 베이스 + 펜타토닉 드문 음.
- `tense`: 드론 + 심박(~100bpm 쿵-쿵). 추격 중이거나 행성을 들고 있으면 자동 전환, 끝난 뒤 3초 유지 후 `hub` 복귀.
- `ending`: D 단조 느린 패드 + 오르골풍 드문 음 + 빗소리. 자동 선택되지 않으며 컷신이 `setBgm('ending')` 으로만 켠다.

## 접근성·소음 민감
- 기본 볼륨 작게(master 0.5 × sfx 0.7 / bgm 0.35) + 리미터. `prefers-reduced-motion: reduce` 이면 더 작게(0.4 × 0.6 / 0.2) 시작.
- 🔊/🔇 버튼(`#btns`, `aria-pressed`) 하나. 상태는 별도 키에 저장, 세이브와 무관. 볼륨 3종은 `setVolume` 로 조절 가능(슬라이더 UI 는 미구현).
- 탭이 가려지면 컨텍스트 suspend. 소리만 있는 단서는 없다(모든 정보는 시각 병행).
