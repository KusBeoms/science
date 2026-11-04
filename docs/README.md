# 행성을 훔치다 — 코드 구조 (docs)

> 작업 시작 전 이 문서를 먼저 읽고, 코드 수정을 마무리할 때 변경 내용을 반영한다. (CLAUDE.md 규칙)

## 한눈에 보기
고1 통합과학 문제를 풀어 우주의 행성을 훔치는 3D 게임. **TypeScript 클라이언트(three.js) + C++ 서버** 구조.

```
science/
├─ CLAUDE.md              # 작업 규칙
├─ docker-compose.yml     # web(공개) + api — DB/Redis는 플랫폼이 DATABASE_URL, REDIS_URL로 주입
├─ client/                # TypeScript 클라이언트  → docs/CLIENT.md
│  ├─ src/                #   모듈 소스 (파일당 ≤500줄)
│  └─ public/             #   index.html, style.css, js/(tsc 출력, git 제외)
├─ server/                # C++17 API 서버         → docs/SERVER.md
├─ web/                   # nginx 설정 + 정적 클라이언트 이미지
├─ docs/                  # 이 문서들
└─ previous/              # 이전 프로젝트(star-life) 참고용 — 수정하지 않음
```

## 문서 목록
| 문서 | 내용 |
|---|---|
| [CLIENT.md](CLIENT.md) | 클라이언트 모듈 구조, 공유 상태 설계, 빌드, 섹터·청크 스트리밍·포탈·레지스트리·세이브 스키마, **새 기능 추가 레시피** |
| [SERVER.md](SERVER.md) | API 엔드포인트, 환경변수, 로컬/도커 실행 |
| [ROADMAP.md](ROADMAP.md) | 10시간+ 오픈월드 확장 계획(M0~M7)과 진행 상태 |
| [CURRICULUM.md](CURRICULUM.md) | 고1 통합과학(2022 개정) 교육과정 조사, 출제 가이드라인, 단원 인덱스(curriculum-units.json) |
| [TESTING.md](TESTING.md) | 헤드리스 브라우저 E2E 하네스 사용법, 마일스톤 QA 체크리스트 |
| [STORY.md](STORY.md) | **스토리 v2** — 사과 행성에 반한 도둑 이야기, 무문자(그림/애니) 연출 원칙, 비트 시트, 새 메커니즘(시선 수호신·암시장·삼연 추격), 엔딩 후 자유 플레이 |
| [CONTENT_PLAN.md](CONTENT_PLAN.md) | **콘텐츠 기획서** — 12개 구역·행성 80종·이야기·이동 수단·하이스트·NPC 등 구체 내용과 결정할 것 |

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
- 상위 `../README.md`(web 루트)를 갱신하라는 규칙이 있으나, 현재 `/Users/dalgsiki/Developer/README.md`가 존재하지 않는다. (아래 "미해결" 참고)

## 미해결 / 메모
- `../README.md` 부재: CLAUDE.md는 상위 README를 참조·갱신하라고 하지만 파일이 없어 건너뛰었다. 필요하면 만들 위치/내용을 알려 달라.
