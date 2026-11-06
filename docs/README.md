# 행성을 훔치다 — 코드 구조 (docs)

> 작업 시작 전 이 문서를 먼저 읽고, 코드 수정을 마무리할 때 변경 내용을 반영한다. (CLAUDE.md 규칙)

## 한눈에 보기
고1 통합과학 문제를 풀어 우주의 행성을 훔치는 3D 게임. **TypeScript 클라이언트(three.js) + C++ 서버** 구조.

```
science/
├─ CLAUDE.md              # 작업 규칙
├─ docker-compose.yml     # web(공개) + api — DB/Redis는 플랫폼이 DATABASE_URL, REDIS_URL로 주입
├─ client/                # TypeScript 클라이언트  → docs/tech/CLIENT.md
│  ├─ src/                #   모듈 소스 (파일당 ≤500줄)
│  ├─ texture/            # 사용자 재질 원본·폴더별 README (원본은 로컬 보관)
│  └─ public/             #   index.html, style/, assets/surfaces/, js/(tsc 출력, git 제외)
├─ server/                # C++17 API 서버         → docs/tech/SERVER.md
├─ web/                   # nginx 설정 + 정적 클라이언트 이미지
├─ docs/                  # 이 문서들
└─ previous/              # 이전 프로젝트(star-life) 참고용 — 수정하지 않음
```

## 문서 구조
```
docs/
├─ README.md            # 이 색인
├─ HANDOFF.md           # 인수인계(먼저 읽기)
├─ COORDINATION.md      # AI 간 작업 조율 (git 제외)
├─ MODELING_HANDOFF.md  # 모델링 담당 AI 인수인계 (git 제외)
├─ MODELING_LOG.md      # 모델링 작업 기록
├─ design/              # 기획·설계
├─ curriculum/          # 교육과정·문제 은행
├─ tech/                # 코드 구조·서버·테스트·오디오·배포
├─ work-logs/           # 작업 단위별 기록 (W5·W6·W7) (git 제외)
└─ assets/              # 이미지 (전체 지도 사진 등, 재생성 가능) (git 제외)
```

> **git 제외(로컬 전용)**: `COORDINATION.md`, `MODELING_HANDOFF.md`, `work-logs/`, `assets/` — 임시 조율·작업 기록·재생성 가능한 이미지라 커밋하지 않는다. 장기 보존할 내용은 `HANDOFF.md`·`tech/`·`design/` 에 옮겨 적는다.

### 먼저 읽기 · 조율
| 문서 | 내용 |
|---|---|
| [HANDOFF.md](HANDOFF.md) | **인수인계** — 현재 코드 상태, 안 만들어진 것(갭 목록), 사용자 원문 요구, AI가 추가한 미승인 설정, 열린 결정 |
| [COORDINATION.md](COORDINATION.md) | **작업 조율** — AI별 담당 영역·진행 중 작업·수정 파일 (작업 전 확인, git 제외) |
| [MODELING_HANDOFF.md](MODELING_HANDOFF.md) | 모델링 담당 AI 인수인계 — 모델링 규칙·해야 할 목록·참조 이미지 |
| [MAP_ART.md](tech/MAP_ART.md) | W7 도시·농촌 재구성, 외곽 주택·농가, native2.5u 지형·LOD·다리 연결·검수 |
| [MODELING_LOG.md](MODELING_LOG.md) | 모델링 개선·부품별 계약·삼각형 수·검수 이미지 기록 |

### 기술 (`tech/`)
| 문서 | 내용 |
|---|---|
| [CLIENT.md](tech/CLIENT.md) | 클라이언트 모듈 구조, 공유 상태, 빌드, 레지스트리, 세이브 스키마, **새 기능 추가 레시피** |
| [SERVER.md](tech/SERVER.md) | API 엔드포인트, 환경변수, 로컬/도커 실행 |
| [TESTING.md](tech/TESTING.md) | 헤드리스 E2E 하네스 사용법, 마일스톤 QA 체크리스트 |
| [SCALE.md](tech/SCALE.md) | 도심 재설계 실제 축척 계약(1u=1m): 사람·층고·문·차량·도로 5등급 단면, 현행 값과의 차이 |
| [CITY_TERRAIN.md](tech/CITY_TERRAIN.md) | 도시 섬 높이 JSON(city-terrain/1) 포맷·굽기/다듬기 도구·보존 구역·전후 결과 (W8 P3-a) |
| [TEXTURES.md](tech/TEXTURES.md) | 사용자 텍스처25종 카탈로그·경량16종 팩·성능/실패 대응 |
| [PLAYER_CONTROLS.md](tech/PLAYER_CONTROLS.md) | 눈동자 시선·자유 카메라/2초 복귀·하늘 시야·차량 승하차 |
| [RURAL_INTERIORS.md](tech/RURAL_INTERIORS.md) | 농촌·교외 주택136채의 문/보행판·실내·안전한 퇴장 |
| [AUDIO.md](tech/AUDIO.md) | 사운드 시스템 구조, `sfx` 이름표, BGM, 접근성 |
| [WEB_ROOT_README.md](tech/WEB_ROOT_README.md) | 상위 `../README.md` 초안 — 프로젝트 소개·서비스 구성·환경변수·공개 경로 |

### 기획·설계 (`design/`)
| 문서 | 내용 |
|---|---|
| [STORY.md](design/STORY.md) | **스토리 v2** — 사과 행성에 반한 도둑 이야기, 연출 원칙, 비트 시트, 엔딩 후 자유 플레이 |
| [CONTENT_PLAN.md](design/CONTENT_PLAN.md) | 콘텐츠 기획서 — 12개 구역·행성 80종·이동 수단·하이스트·NPC |
| [CITY_REDESIGN_PLAN.md](design/CITY_REDESIGN_PLAN.md) | 도심 재설계 계획(초안) — 도로 5등급·JSON 스키마·에디터·실내 연결·충돌·녹지. Codex 리뷰 대기 |
| [GRAPHICS_PLAN.md](design/GRAPHICS_PLAN.md) | 그래픽 향상 계획(미착수) — PC/모바일 2단계 품질, 구름·그림자·반사·밤 불빛·날씨. Codex 검토 병합 완료 |
| [WORLD.md](design/WORLD.md) | 월드 설계 — 도시 허브 + 대륙, 로우폴리 아트 규칙, 마일스톤 W0~W7 |
| [GAMEPLAY_SYSTEMS.md](design/GAMEPLAY_SYSTEMS.md) | 이동 수단·수배·하이스트 — 단계 스펙, 상태 머신 |
| [PLANET_CATALOG.md](design/PLANET_CATALOG.md) | 행성 80종 도감 — 등급·외형·단원, 특수 행성 |
| [ECONOMY.md](design/ECONOMY.md) | 경제·진행 곡선 — 구역별 체류·수입, 상점 sink |
| [QUESTS_ACHIEVEMENTS.md](design/QUESTS_ACHIEVEMENTS.md) | NPC·의뢰·수집·레이스·업적, 세이브 v6 초안 |
| [UX_CUTSCENE.md](design/UX_CUTSCENE.md) | 컷신 12개 스토리보드·UI, 글 없는 HUD·튜토리얼 |
| [ROADMAP.md](design/ROADMAP.md) | 오픈월드 확장 계획(M0~M7)과 진행 상태 |

### 교육과정·문제 (`curriculum/`)
| 문서 | 내용 |
|---|---|
| [CURRICULUM.md](curriculum/CURRICULUM.md) | 고1 통합과학(2022 개정) 조사, 출제 가이드라인, 단원 인덱스 |
| [QUIZ_BANK.md](curriculum/QUIZ_BANK.md) | 문제 은행 설계 — 210문항 배분, `QuizItem` 스키마, 출제 원칙 |
| [curriculum-units.json](curriculum/curriculum-units.json) | 단원 인덱스 데이터 |

### 작업 기록 (`work-logs/`)
| 문서 | 내용 |
|---|---|
| [W8_CONTRACT.md](work-logs/W8_CONTRACT.md) | W8 P1: 도시 스키마·검증·boot.ts 진입점·nginx JSON 규칙 |
| [W5_PLAN.md](work-logs/W5_PLAN.md) | W5·W6 병렬 작업 계획 — 에이전트별 파일 소유권 |
| [W5_STADIUM.md](work-logs/W5_STADIUM.md) | 축구장 105×68·10분 경기·게임 시계(낮 12분/밤 4분)·조작 변경·전체 지도 사진 |
| [W5_WATER.md](work-logs/W5_WATER.md) | 호수·물 셰이더·수영·낚시 |
| [W5_DAMAGE.md](work-logs/W5_DAMAGE.md) | 차량 파손·침수·수리 |
| [W5_SHOPS.md](work-logs/W5_SHOPS.md) | 상점 거리·새 가게 13종·탈것 |
| [W5_ROADS.md](work-logs/W5_ROADS.md) | 입체교차로·고가 데크 계층 |
| [W5_FUN.md](work-logs/W5_FUN.md) | 구역 테마·즐길 거리 33곳 |
| [W6_CONTINENT.md](work-logs/W6_CONTINENT.md) | 자연 외곽선·섬 분리·BRIDGE_ENDS 좌표 |
| [W6_PORTALS.md](work-logs/W6_PORTALS.md) | 포탈 광장·우주 지도·해금 검토 |
| [W6_DOWNTOWN.md](work-logs/W6_DOWNTOWN.md) | 도심 고층·본사·아파트 단지 |
| [W6_BRIDGE.md](work-logs/W6_BRIDGE.md) | 금문교·도로 연결 |
| [W7_PLAN.md](work-logs/W7_PLAN.md) | 참조 이미지 기반 맵 재구성 — 비교 결과·파일 소유권 |
| [W7_CITY_SURROUND.md](work-logs/W7_CITY_SURROUND.md) | 도시 둘레 산악: 능선·북쪽 주봉·철탑·동쪽 반도 산악 도로·천문대 |

### 이미지 (`assets/`)
- [world-map.jpg](assets/world-map.jpg) — 월드 전체 위에서 본 안내 지도(게임에는 포함되지 않음). 재생성: `cd client && WORLDMAP=1 npx playwright test tests/e2e/zz-worldmap.spec.ts`

## 서비스 구성 (docker-compose)
| 서비스 | 역할 | 라벨 |
|---|---|---|
| `web` | nginx — 정적 클라이언트 서빙, `/api/` → `api:8080` 프록시 | `science26.public=true` |
| `api` | C++ API 서버 (세이브·리더보드) | `science26.api=true` |

- DB(PostgreSQL)·Redis 컨테이너는 compose에 **넣지 않는다.** 서버는 환경변수 `DATABASE_URL`, `REDIS_URL`만 읽는다.
- 두 값이 없거나 접속에 실패하면 인메모리로 폴백한다(로컬 개발용).

## 규칙 요약
- 코드 파일은 ~400줄 권장, **최대 500줄**. 넘으면 기능 단위로 분리.
- 구조/역할/상태가 바뀌면 이 폴더 문서를 함께 갱신. 마일스톤마다 간단히 커밋.
- 상위 `../README.md`(web 루트)를 갱신하라는 규칙이 있으나 저장소 밖 파일이라 만들 수 없다. 대신 초안을 [WEB_ROOT_README.md](tech/WEB_ROOT_README.md)에 두었다(아래 "메모" 참고).

## 메모
- `../README.md`: 사용자가 "알아서 만들어"라고 해 초안을 [WEB_ROOT_README.md](tech/WEB_ROOT_README.md)에 작성했다. 상위 디렉터리로 복사해 사용한다(해결).
