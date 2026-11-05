# web 루트 README 초안 (프로젝트 소개)

> **이 파일을 상위 디렉터리 `../README.md` 로 복사해 사용하세요.** (저장소 밖 파일은 이 저장소 작업으로 만들 수 없어 초안만 여기에 둔다. 아래 `---` 이후가 복사할 본문이다. 복사 후 이 안내 문단은 지운다.)

---

# science (행성을 훔치다)

고1 통합과학 문제를 풀어 우주의 행성을 훔치는 **퀴즈 3D 게임**. 사과 모양 행성에 반한 도둑이 돈을 벌려고 행성을 훔치다가 마지막 한탕을 성공시키는 이야기이며, 이야기는 글 없이 그림과 애니메이션으로만 전달한다. 퀴즈(고1 통합과학, 2022 개정 교육과정)가 이 게임에서 글을 읽는 거의 유일한 부분이다.

## 상태
**개발 중.** 도시·야생지·12개 섬, 이동 수단·상점·실내·축구·수배 시스템이 구현되어 있다. 현재 로우폴리 모델링을 보강하고, 참고 이미지에 맞춘 도시·농촌 맵 재구성을 진행 중이다. 모델링 내역은 `docs/MODELING_LOG.md`, 게임 전체 현황은 `docs/HANDOFF.md` 참고.

## 공개 경로
`/steal-an-planet/` (하위 경로로 서빙된다. 정적 리소스와 API 호출은 모두 **상대 경로**여야 한다.)

## 서비스 구성 (docker-compose)
| 서비스 | 역할 | 라벨 |
|---|---|---|
| `web` | nginx — 정적 클라이언트(TypeScript + three.js) 서빙, `/api/` 를 `api:8080` 으로 프록시 | `science26.public=true` |
| `api` | C++17 API 서버 — 세이브 저장, 리더보드 | `science26.api=true` |

- DB(PostgreSQL)·Redis 컨테이너는 compose에 **넣지 않는다.** 플랫폼이 주입하는 환경변수만 읽는다.

## 환경변수
| 이름 | 용도 | 비고 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 연결(세이브 저장) | 플랫폼이 주입. 없거나 접속 실패 시 인메모리로 폴백 |
| `REDIS_URL` | Redis 연결(리더보드) | 플랫폼이 주입. 없거나 접속 실패 시 인메모리로 폴백 |
| `PORT` | API 서버 포트 | compose에서 `8080` 고정 |

## 로컬 실행
- 클라이언트만: `cd client && npx tsc` 후 `python3 -m http.server -d client/public` (API 없이도 localStorage로 동작)
- 컨테이너: `docker compose build`

## 문서 위치
모든 문서는 저장소의 `docs/` 에 있고 `docs/README.md` 가 색인이다. 처음에는 `docs/HANDOFF.md`(현재 상태·안 만들어진 것·합의 사항)를 읽는다.
- 스토리: `docs/STORY.md` · 컷신/UI: `docs/UX_CUTSCENE.md` · 월드: `docs/WORLD.md`
- 경제: `docs/ECONOMY.md` · 이동수단/하이스트: `docs/GAMEPLAY_SYSTEMS.md` · 퀘스트/업적: `docs/QUESTS_ACHIEVEMENTS.md`
- 서버: `docs/SERVER.md` · 클라이언트: `docs/CLIENT.md` · 테스트: `docs/TESTING.md`
