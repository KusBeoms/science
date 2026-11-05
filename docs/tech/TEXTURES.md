# 사용자 텍스처 카탈로그와 경량 표면 질감

2026-11-06 사용자가 `client/texture`의 텍스처 분류와 게임 적용을 요청했다. 이 지시를 반영해 기존 코드 생성 로우폴리 모델·팔레트를 유지하면서 제공 이미지의 표면 무늬를 추가한다. 원본 전체를 GPU에 올리는 PBR 재질 교체가 아니다.

## 원본과 배포 파일

- [원본 카탈로그](../../client/texture/README.md): 25개 재질 세트, 약3.3GiB. 실제 이미지와 헤더를 확인한 README33개를 모든 폴더에 작성했다.
- 재질별 README는 색·무늬·스타일·실제 용도·권장 게임 위치, 실제 해상도와 맵 역할, 노멀 축, 타일 크기, 성능 사용법, 발견된 출처 정보를 설명한다.
- 원본 이미지·EXR/TIFF·Blender/USD/MaterialX/Godot 파일은 로컬에 보존한다. `.gitignore`는 카탈로그 MD/라이선스 문서만 포함하며 `.dockerignore`와 우선 적용되는 `web/Dockerfile.dockerignore` 모두 원본 폴더를 빌드 컨텍스트에서 제외한다.
- 런타임 배포는 `client/public/assets/surfaces/`의 PNG4장과 `manifest.json`. 웹 Docker 이미지는 기존대로 public만 서빙한다.

공급사명은 파일명/패키지 구조로 추정한 정보이며 라이선스 원문은 제공 폴더에서 발견하지 못했다. 카탈로그는 이를 실제 사용권 확인과 구분한다.

## 파생본 생성

`client/tools/build_surface_textures.py`와 `texture-requirements.txt`를 사용한다. 원본은 읽기만 한다.

```sh
python3 -m venv /tmp/science-texture-tools
/tmp/science-texture-tools/bin/pip install -r client/tools/texture-requirements.txt
/tmp/science-texture-tools/bin/python client/tools/build_surface_textures.py
cd client && npm run build
```

선택16종의 Color/BaseColor/Albedo/Diffuse를 512px로 줄여 휘도를 정규화한 후 RGBA각채널에4종씩 담는다. 2:1원본은 비율을 유지한 뒤 반복하고, Road011A는 차선 없는 아스팔트 사각 영역을 추출한다. A채널도 투명도가 아닌 네 번째 재질 데이터이며 shader의 불투명도에 연결하지 않는다. Normal/Roughness/AO/Metalness/Displacement/Emission과 preview 이미지는 게임에 직접 로드하지 않는다.

| 팩 | R | G | B | A |
|---|---|---|---|---|
| natural-a | Grass005 정돈잔디 | Grass003 숲잔디 | PX Lawn04 거친잔디 | Poliigon4585 목초지 |
| natural-b | Ground103 흙 | Ground104 마른흙/모래 | dry_river_pebbles 자갈 | marble_cliff03 암석 |
| built-a | PavingStones150 포장돌 | Road011A 아스팔트 | Wood095 목재 | CorrugatedSteel009 골판금속 |
| built-b | Poliigon7174 강철 | Metal055C 부식금속 | Tiles138 타일 | Poliigon7827 부클레 |

원본 해시·상대경로·해상도·추출 영역과 출력 해시는 manifest에 남긴다. 원본을 제외하고도 저장소의 파생본만으로 게임 빌드/실행이 가능하다.

## 렌더 구조와 적용 범위

- `render/surface-detail.ts`: opt-in 공유 Lambert재질1개, 비동기 PNG4장 로더, 중립 fallback, 로딩/메모리 진단, 대비 켜기/끄기 디버그 API.
- `render/surface-tags.ts`: 도시 바닥과 정적 건물·목재·지붕·금속의 명시적 태그. 창문·발광·차선·캐릭터·수관은 기존 재질을 유지한다. 벽/지붕이 같은색인 경우 벽 법선은 지붕 태그에서 제외한다.
- `render/terrain-detail.ts`: 도시 산기슭/농촌의 기존 높이·경사·도로·호안·밭 데이터를 읽어 재질을 고른다. 우주 섬·눈·수면 아래는 기본색을 유지한다.
- `terrain-mesh.ts`, `lowpoly/merge.ts`: 표면 태그 속성을 indexed 지형과 병합 메시에서 보존한다. 지형의 정점 위치·삼각형 수·충돌은 변경하지 않는다.
- `landscape-surface.ts`, `landscape-batch.ts`, `wild-lake.ts`: 농촌 길·논밭 바탕·호숫가 도로와 목재 시설에 연결한다.
- `rural-fields.ts`: 불투명한 실제 밭 표면에도 흙/목초지 태그를 적용한다. 기존 작물색·이랑 명암과 수로는 유지한다.
- `city/index.ts`, `city-fringe.ts`, `rural-models.ts`: 도시 포장면·교외 주택·산장/문/지붕·헛간·사일로.
- `interior*.ts`: 목재 가구·실내 바닥 타일·의자 방석/등받이의 직물. 명시적인 금속 좌석은 강철 질감으로 남긴다.

재질은 world dominant-axis 투영을 사용해 UV가 없는 기존 병합 모델에도 적용한다. 기존 정점색을 기준으로 중립 grain을 곱하여 원본의 무늬만 더한다. 실제 반사·노멀·변위·발광을 시뮬레이션하는 PBR 효과는 추가하지 않는다.

## 성능과 실패 대응

- 배포 PNG 합계3,163,013bytes(약3.02MiB), 원본4K/8K 네트워크 요청0개.
- 4장의512² RGBA8 + 전체 mip 약5.33MiB. 지형 분류용 CPU생성 마스크 약0.36MiB를 더해 표면 텍스처 합계 약5.69MiB.
- 지형 분류 ID는 숫자로 평균하지 않는다. canonical5u 격자의2×2재질 ID를 RGBA한 texel로 담은281×336 nearest 마스크에서 실제ID를 읽는다. 강도만 부드럽게 보간한다. 비활성 칸은 ID255로 구분해 눈/우주 섬/도심 경계에 주변 잔디 무늬가 묻어나지 않도록 한다.
- 공유재질/텍스처 캐시, POT RepeatWrapping·mipmap·anisotropy최대4. NPOT 분류 마스크는 Clamp/Nearest/noMip.
- 180~350u 구간에서 질감 대비를 줄이고 원경에서는 샘플을 건너뛴다. 직교 지도는 mipmap으로 축소 샘플링한다.
- 삼각형·새 메시·추가 draw pass가 없으며 기존 LOD와 공간 컬링을 유지한다. 표면 태그 속성은 정점당12bytes, 지형 분류 캐시는 별도의 CPU메모리를 사용한다.
- 로딩 중/실패 시 기본색과 조명을 유지한다. `surfaceTexturesReady()`는 실패도 종료하고 `surfaceTextureStats()`의 failed로 검출한다. 일반 게임 시작은 로딩을 기다리지 않으며 지도/검수만 ready를 기다린다.
- 사용자 제공 원본 RGB색 대신 기존 팔레트를 사용하므로 금속의 원래 색·광택과 완성 파사드 창문 패턴을 그대로 재현한 결과로 해석하지 않는다.

## 검증

`surface-textures.spec.ts`는4개 요청/공유 캐시·GPU예산·지형/구조/직물 태그, 실제 픽셀 변화와 동일 draw/triangle 수, 비활성 도심/눈 경계의 픽셀 불변, 로딩 실패 fallback을 검사한다. 도시/경관/실내/모델/교외 관련 스펙으로 기존 기능과 예산을 확인한다.

2026-11-06: 타입 빌드와 관련 기능 스펙21개를 통과했다. 마지막 지형 비활성 경계·밭 표면 보완 후 질감4개+경관3개를 재검증하고 전체 지도 촬영 도구1개도 통과했다. 스폰은93,998삼각형/392 calls로95k기준을 유지했다. 8종 재질 비교 장면은 질감 전후 모두96삼각형/1 call이고 실제 픽셀 변화가 검출된다. PNG 요청4회/원본 요청0회, 실패0, 표면 GPU텍스처5,970,068bytes를 확인했다. 일반 GPU의 FPS 보증을 위한 계측은 수행하지 않았다.

산출물: `tests/out/surface-{plain,detail}.png`, `surface-texture-stats.json`, 지상 교외 사진과 `landscape-{city,rural}.png`. 원본 카탈로그는 로컬 이미지 링크/폴더 누락도 검사한다.
