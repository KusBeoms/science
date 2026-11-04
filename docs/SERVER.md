# 서버 구조 (server/, web/, docker-compose.yml)

C++17 API 서버 + nginx(정적 클라이언트 서빙 및 `/api/` 리버스 프록시).

## 파일 역할
| 파일 | 역할 |
|---|---|
| `server/src/main.cpp` | 부팅, 저장소 생성, 라우트 등록, 정적 서빙, SIGTERM 종료 |
| `server/src/config.{h,cpp}` | 환경변수 로드 (`PORT`, `DATABASE_URL`, `REDIS_URL`, `STATIC_DIR`) |
| `server/src/store.h` | `SaveStore` / `Leaderboard` 인터페이스, 인메모리 구현 선언, 팩토리 |
| `server/src/store_memory.cpp` | 인메모리 구현 (mutex 보호) |
| `server/src/store_pg.cpp` | PostgreSQL(libpq) save 저장소. 시작 시 `CREATE TABLE IF NOT EXISTS saves`, `PQexecParams` 바인딩, 연결 끊김 시 3초 간격 재연결, 실패 중엔 인메모리 폴백 |
| `server/src/leaderboard_redis.cpp` | Redis(hiredis) 리더보드, Sorted Set `science26:leaderboard` + `ZADD GT`. 재연결/폴백 동일 |
| `server/src/validate.{h,cpp}` | pid/name/limit 검증 |
| `server/src/handlers.{h,cpp}` | `/api/*` 라우트, JSON 오류 응답(404/413 등) |
| `server/Dockerfile` | 멀티스테이지(빌드: bookworm + apt 개발 패키지 / 런타임: libpq5, libhiredis0.14, libcpp-httplib0.11), 비루트(uid 10001), HEALTHCHECK |
| `web/Dockerfile` | node에서 `client/`를 `npx tsc` 빌드 후 nginx에 `client/public` 복사 |
| `web/nginx.conf` | 정적 서빙(SPA fallback), `/api/` -> `api:8080` 프록시, gzip, 캐시(js no-cache, 정적 자산 1h) |
| `docker-compose.yml` | `web`(라벨 `science26.public=true`), `api`(라벨 `science26.api=true`). DB/Redis 컨테이너 없음, `DATABASE_URL`/`REDIS_URL` 호스트 환경 pass-through |

## 엔드포인트 (모두 `application/json`)
- `GET /api/health` -> `{"ok":true,"db":bool,"redis":bool}` (실제 연결 상태 확인)
- `GET /api/save/{pid}` -> 200 `{"data":{...},"updatedAt":ms}` / 404 `{"error":"not_found"}`
- `PUT /api/save/{pid}` body=JSON 객체(<=256KB; 초과 413, 잘못된 JSON/비객체 400) -> `{"ok":true,"updatedAt":ms}`
- `POST /api/score` `{"name":1~20자,"score":>=0}` -> `{"ok":true}` (같은 name은 최고점만 유지)
- `GET /api/leaderboard?limit=10` (1~100) -> `[{"name","score"}]` 내림차순
- pid 정규식 `^[A-Za-z0-9_-]{8,64}$` (불일치 400). 그 외 경로 404 JSON.

## 환경변수
| 이름 | 설명 |
|---|---|
| `PORT` | 기본 8080 |
| `DATABASE_URL` | PostgreSQL URL. 없거나 접속 실패 시 save는 인메모리 |
| `REDIS_URL` | `redis://[:pw@]host[:port][/db]`. 없거나 실패 시 리더보드는 인메모리 |
| `STATIC_DIR` | 지정 시 해당 디렉터리를 `/`로 정적 서빙(로컬 단독 실행용) |

플랫폼이 `DATABASE_URL`/`REDIS_URL`을 주입한다는 전제. 폴백 중에는 `/api/health`의 `db`/`redis`가 false.

## 실행
- 도커: 레포 루트에서 `docker build -f server/Dockerfile -t science26-api .` 후 `docker run -p 8080:8080 science26-api` (env 없이 인메모리). 전체: `docker compose up --build`.
- 로컬(macOS): `brew install libpq hiredis nlohmann-json cpp-httplib cmake` 후 `cmake -S server -B server/build && cmake --build server/build && STATIC_DIR=client/public ./server/build/api`.

## 의존성
C++17, CMake>=3.16, libpq, hiredis, nlohmann/json, cpp-httplib(Debian 패키지는 컴파일된 라이브러리 `libcpp-httplib.so`로 링크).

## 가정/한계
- 공개 라우팅은 플랫폼이 compose 라벨(`science26.public`, `science26.api`)로 처리한다고 가정 (호스트 포트 바인딩 없음, `expose`만).
- 폴백 모드에서 DB/Redis 장애 중 쓴 데이터는 프로세스 메모리에만 남고 복구 후 동기화되지 않는다.
