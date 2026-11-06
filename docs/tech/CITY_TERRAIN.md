# 도시 섬 높이 JSON (city-terrain/1)

W8 P3-a. 현재 도시 섬 높이(`core/heightmap.ts` + `belt-height.ts`)를 오프라인으로 굽고 다듬어 JSON 으로 저장한다. **P3-b 부터 게임이 이 파일을 읽는다**(아래 "게임 로딩"). 계획: `design/CITY_REDESIGN_PLAN.md` 13-2.

## 파일 `client/public/data/city-terrain.json` (≈173 KB, gzip 전)
| 필드 | 뜻 |
|---|---|
| `schema` | `city-terrain/1` |
| `origin{x,z}`, `step`, `nx`, `nz` | 격자 원점(월드 좌표, 대륙 격자 GX0/GZ0 에 정렬)·간격 5u·칸 수 (현재 371×290, 원점 (−765,−890)) |
| `bbox` | 원점 ~ 원점+(n−1)·step |
| `unit` | `cm` — 높이는 정수 cm |
| `height` | 행 우선(j·nx+i) 높이 cm → 직전 칸과의 델타 → 지그재그 → varint(LEB128) → base64 |
| `land` | 땅 마스크(도시 윤곽 안=1). 0/1 런 길이(0 부터) varint → base64 |
| `params` | 표본·보존·다듬기 매개변수 전체 (재현용) |
| `stats` | `min`,`max`(cm), `checksum`(FNV-1a, cm 전체), 땅 칸 수, 보존 칸 수, 원본 통계(`source`), 전후 편차 |

땅 밖(바다·낭떠러지 −12/−40/−90·해협 바닥) 칸도 **원본 값 그대로** 들어 있다. 코덱 `client/src/data/city-terrain-codec.ts`(순수, 게임 모듈 import 없음): `encodeTerrain`/`decodeTerrain`(스키마·길이·체크섬 검증, 어긋나면 throw — 폴백 없음), `encodeHeights`/`decodeHeights`, `encodeLand`/`decodeLand`, `checksumCm`. cm 단위 정확 왕복.

## 실행
```
cd client && npx tsc            # 코덱을 public/js 로 내보낸 뒤
node --no-warnings tools/terrain-bake.mjs [--out 파일] [--report 폴더|--no-report] [--set 키=값 ...]
```
헤드리스 크로미움이 실제 `core/heightmap.js` 를 불러 5u 격자를 읽는다(`terrain-bake-sample.mjs`) → 다듬기(`terrain-bake-smooth.mjs`, 순수·결정적) → 저장 + `tests/out/terrain-bake/` 에 report.json·전후 이미지(`terrain-bake-render.mjs`, `terrain-bake-metrics.mjs`). 같은 입력·매개변수면 체크섬이 같다(2회 확인: `10042fa5`). 약 10초.

## 다듬기와 매개변수 (기본값은 `terrain-bake.mjs` 의 SAMPLE/DEFAULT_SMOOTH)
땅 칸끼리만 섞는다(바다 칸은 커널에서 제외). 순서: ① 쌍방 가우시안(`sigma`=1.5칸, `radius`=3, `rangeSigma`=12u, `passes`=2) — 5u 계단·능선 주름 제거, 큰 단차는 덜 섞임 ② 열 침식(`talus`=1.1 기울기, `thermalRate`=0.4, `thermalIter`=40) — 곧은 벽·가파른 능선 완화, 질량 보존 ③ 보존 가중치 pw 로 원본과 합성, 칸당 변화 `maxDev`=20u 상한(137칸이 걸림), cm 반올림.

## 보존 구역 (pw=1 → 원본과 0.005u 이내, 바깥으로 smoothstep 으로 풀림)
| 구역 | 보존 | 풀림 끝 |
|---|---|---|
| 땅 밖(바다·낭떠러지·해협 바닥) | 전부 | — |
| 해안선 안쪽 | ≤10u | 30u |
| 시가지 사각형 ±335 (평지·언덕(−105,−105)·포탈 광장·경기장·기지 전부) | 안쪽 전부 + 3u | 16u |
| 남안 다리 어귀 \|x−BX\| | ≤70u | 100u |
| 다리 진입로 평탄대 | 반폭+FLAT_MARGIN+4u | +FLAT_FADE(18u) |
| 산악도로 중심선 | ≤18u(노면+어깨) | 40u |
| 천문대 광장 | 반지름+10u | +44u |
시가지 사각형은 지금 평지(언덕 하나 제외)라 **그대로 보존**한다. 이후 단계가 편집 레이어로 재형성한다.

## 결과 (현행 기준, 땅 54,715칸 중)
| 지표 | 전 | 후 |
|---|---|---|
| 변경 칸(≥0.005u / ≥0.5u) | — | 29,539 / 18,661 |
| 편차 평균 / 최대 | — | 1.27u / 20.0u (상한, (125,−460) 북쪽 능선 벽) |
| 기울기 최대 / p99 / p95 / 평균 | 4.13 / 2.79 / 2.17 / 0.80 | 4.55 / 2.22 / 1.54 / 0.67 |
| 기울기 >1.5 칸 / >2 칸 | 5,445 / 2,280 | 2,041 / 536 |
| 라플라시안(주름·계단) 평균 | 1.43 | 0.89 |
| 언덕음영 평균 절대차 | — | 0.030 |
| 최고봉 | 161.3u | 143.1u |
보존 구역 최대 편차는 `terrain-bake.spec.ts` 가 모든 구역에서 ≤0.05u 임을 검사한다(실측 0.005u).

이미지(`client/tests/out/terrain-bake/`): `top-before/after/diff.png`(상공 음영·차이), `ground-*`·`oblique-*`(지상·사선, 같은 메시·조명), `game-top.png`(실제 게임 현행 상공, `TERRAIN_BAKE_SHOTS=1`).

### 정직한 평가
- 좋아진 점: 능선 마루의 톱니·세로 줄무늬(5u 계단 얼룩)가 사라지고 능선 벽이 둥글어졌다. 산악도로 쪽 지상 시야가 가장 뚜렷하게 자연스럽다.
- 한계: 큰 산 덩어리 자체(벽 같은 능선 단면, 기울기 2 이상 536칸)는 남는다 — 이는 형태 설계 문제이고 이 단계는 인공물 완화다. 최고봉이 약 18u(11%) 낮아졌고 정상이 둥글다(기울기 최대는 해안 보존 구역 옆 봉우리에서 오히려 4.13→4.55, 보존과 다듬기 경계의 단차). 북쪽 봉우리 부근 `maxDev` 상한 137칸은 경계가 약간 각질 수 있다.
- 땅 가장자리 낭떠러지는 의도적으로 손대지 않는다.

## 한계
- 도시 섬 윤곽 bbox 만 담는다(야생지·섹터 섬 제외). 다리 상판 아래 해협 바닥은 bbox 밖이다.
- 5u 격자: 게임의 2.5u 지상 메시는 이 격자를 쌍3차 보간해 쓴다(P3-b 결정) → 원 공식의 절반 격자 세부는 사라진다(평탄 구역은 ≤0.1u, 가파른 해안 비탈은 최대 ~2u).
- 비교 이미지는 단색 정점색 메시이며 게임 재질·LOD·안개와 다르다.
- 시가지 사각형은 평지 그대로: 건물 경사 한도(12%)·도로 회랑·필지 대지는 후속 단계(편집 레이어)에서.
- 검증: `terrain-bake.spec.ts`(코덱 왕복, 라이브 높이맵 편차, 보존 0). 기존 `terrain.spec.ts` 의 `bakeMs<400` 는 기기 부하에 따라 간헐 초과(357~425ms 관찰) — 이 작업과 무관.

## 게임 로딩 (W8 P3-b)
- 진입점이 `js/boot.js` 가 되면(index.html 한 줄: `js/main.js` → `js/boot.js`, root 적용 예정) `boot.ts` 의 `bootGame` 이 main 을 불러오기 전에 `data/city-terrain.json` 을 받아(`document.baseURI` 기준 상대 경로) `decodeTerrain` 으로 검증·디코딩하고 `core/city-height.ts` 의 `setCityHeight` 에 넣는다. 404/HTTP/네트워크/시간 초과/JSON 형식/체크섬·스키마 오류는 오류 화면(`#boot-error`)이며 폴백은 없다.
- `core/city-height.ts`: `cityHeightAt(x,z)`(5u 노드 = JSON 정확값, 사이 = Catmull-Rom 쌍3차, 마스크 밖 칸은 섞지 않음), `cityLandAt`, `cityHeightSlope`. `core/heightmap.ts` 의 도시 영역(`REG_CITY`)이 이를 읽고 `citySource` 로 공급원('json'/'procedural')을 노출한다. 5u 격자·2.5u 지상 표본·충돌·렌더가 모두 같은 값을 공유한다. 야생지·섹터 섬은 절차 그대로.
- 높이가 주어지지 않으면(테스트가 모듈 직접 import, boot 미연결) 옛 절차 계산으로 돈다 — 내부 개발/테스트용 경로. `setCityHeight` 는 굽기 전에만 호출 가능(이후 던짐).
- 실측: 노드 일치 7e-6u, 도시 밖 격자 불변, bake 235~262ms(절차 292~319ms), 2.5u 반노드 편차는 평탄·도로 구역 ≤0.1u / 가파른 해안 비탈 최대 ~2u(5u 원천 한계). 자세한 수치·사진·남은 일: `work-logs/W8_HEIGHT.md`. 테스트: `tests/e2e/city-height.spec.ts`, 기존 spec 은 `BOOT_JS=1` 로 JSON 경로 실행 가능.
