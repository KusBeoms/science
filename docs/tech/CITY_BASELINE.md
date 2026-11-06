# 도심 재설계 전 기준선 (P0, 2026-11-06)

도심 재설계(`design/CITY_REDESIGN_PLAN.md` 13절) 이전 현행 상태를 고정해 이후 전/후 비교에 쓴다. 코드는 건드리지 않고 측정 도구만 추가했다.

## 재실행
```sh
cd client && npx tsc && BASELINE=1 npx playwright test tests/e2e/zz-baseline.spec.ts   # 약 30초
```
- 도구: `client/tests/e2e/zz-baseline.spec.ts` (`BASELINE=1` 일 때만 실행, `map-review.ts`의 `mapReview` 재사용).
- 산출물(git 제외): `client/tests/out/baseline/` — `baseline.json`, `spawn.png`, `city-top.png`, `plaza.png`, `apple-avenue.png`, `stadium-gate.png`, `bridge-approach.png`, `highrise.png`, `suburb-door.png`.
- 조건: 1024x640, 낮(`cycT=100`, `night=0`), `unlockAll`, `?debug=1&cine=0`, 텔레포트 후 2.5초 대기, 카메라는 플레이어 3인칭(yaw=0 이 북쪽 -z).
- 다시 돌리면 이 문서와 비교할 새 `baseline.json`이 덮어써진다. 전/후 비교 전에 현재 json을 복사해 둘 것.

## 측정 항목과 수치 (이번 실행)
삼각형·호출은 `renderer.info.render`, 렌더 1회 직접 호출 기준.

| 지점 | 위치(x,z) | 삼각형 | 호출 |
|---|---|---|---|
| 스폰 | 0,17 | 99.4k | 442 |
| 중앙 광장 | 0,138 | 113.9k | 589 |
| 사과 대로 북향 | 0,60 | 103.4k | 490 |
| 스타디움 정문(북향) | 270,-190 | 76.9k | 234 |
| 다리 접근 | 74,340 | 135.3k | 299 |
| 고층 거리 | 60,-62 | 101.7k | 357 |
| 교외 집 문 앞 | -341,177 (첫 교외 필지 앞) | 106.9k | 275 |

- 스폰은 계획의 95k 예산을 약간 넘는다(첫 실행 103k, 재실행 99k: **런마다 수% 변동**, 군중·LOD 타이밍 때문). 다리 접근은 135k로 가장 무겁다.
- 터레인 bake(`heightmap.bakeMs`): 279~324ms (2회 실행, 목표 120ms 초과. SwiftShader 환경 포함 값).
- 데이터: `CITY_BUILDINGS` 330, `CITY_ROADS` 31, 교외 필지(`FRINGE_PLOTS`) 122.
- `CITY_POLY`: 꼭짓점 125, bbox x -740..1060, z -861.4..527.4.
- `BRIDGE_ENDS`: x 74, 도시 남안 z 404, 야생 북안 z 729.
- 앵커: `STADIUM.rect` [206,-334,334,-206], `gateX` 270, `PITCH` 중심 (270,-270), `PLAZA` (0,138) halfW 38/halfD 9, SPAWN (0,17).
- `groundH` 표본(JSON `data.groundH`): 도시 평지 대부분 0, 북서 능선 (-500,0)=94.7, (-500,-300)=82.5, 북쪽 (-250,-600)=45.8, 동쪽 (500,0)=42.7. 다리 도시측 (74,404)=-7.2, 해안 밖 (74,409)=-12, 야생측 (74,729)=-4.7. 섬 밖은 `"water"`(groundH = -Infinity).
- 상공 사진 `city-top.png`: 범위 x -600..1100, z -900..800, 5u 지형, 1700px. 정사각 ±335 시가지, 능선·눈 산, 동쪽 반도 산악도로, 남쪽 해변·다리가 보인다.

## 한계 (정직하게)
- WebGL 은 SwiftShader(소프트웨어)다. **fps·ms 는 실 GPU/모바일과 무관**하고 참고용이며, 신뢰할 수 있는 것은 삼각형·호출·지오메트리 수와 데이터 수치다. bake 시간도 CPU 환경에 따라 달라진다.
- 삼각형·호출은 런마다 수% 변동한다(군중·LOD). 전/후 비교는 ±5% 이내를 같은 값으로 본다.
- 사진은 낮 고정·1024x640 단일 해상도이며 HUD가 찍혀 있다(상공 사진은 HUD 없음).
- 교외 문 앞 컷은 첫 `FRINGE_PLOTS` 의 방향 기준 정면 14u 지점이라 문이 정확히 화면 중앙은 아닐 수 있다.
- 시골 섬·12개 행성 섬은 측정 범위 밖이다.
