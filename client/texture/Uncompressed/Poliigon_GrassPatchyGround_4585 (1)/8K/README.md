# Grass Patchy Ground 4585 — 8K 실제 맵

상위 [재질 안내](../README.md)의 반복/게임 배치 기준을 공유한다. BaseColor 전체/중앙 확대와 Preview1 구체를 직접 확인했다. 짧고 가는 초록 잔풀에 황록색 마른 풀·갈색 흙의 불규칙한 얼룩이 섞여 있다. 전체는 녹황색의 생활 초지이며, Grass005보다 얼룩과 밀도 변화가 크다. 미리보기의 밝은 면과 그림자는 구체 조명 효과이므로 BaseColor와 구분한다.

## 원본 구성

README 제외 **6개**: 8192×8192 맵5개와 MaterialX1개다.

| 파일 | 해상도·형식 | 역할 |
|---|---|---|
| `Poliigon_GrassPatchyGround_4585_BaseColor.jpg` | 8192×8192 · JPEG8비트 RGB | sRGB 기본색. 512~1024px 파생본을 게임 기본 경로로 권장. |
| `Poliigon_GrassPatchyGround_4585_AmbientOcclusion.jpg` | 8192×8192 · JPEG8비트 단일 성분 | 미세 차폐. 선형 수치 데이터로 약하게 적용. |
| `Poliigon_GrassPatchyGround_4585_Roughness.jpg` | 8192×8192 · JPEG8비트 단일 성분 | 선형 거칠기. 밝을수록 거칠다. |
| `Poliigon_GrassPatchyGround_4585_Metallic.jpg` | 8192×8192 · JPEG8비트 단일 성분 | 금속성 값. 풀/흙은 비금속 경로로 설정하고 불필요한 샘플링을 줄인다. |
| `Poliigon_GrassPatchyGround_4585_Displacement.tiff` | 8192×8192 · TIFF16비트 단일 성분 | 상대 높이 원본. 기본 런타임에서 사용하지 않는다. |
| `Poliigon_GrassPatchyGround_4585.mtlx` | MaterialX1.38 | PBR 맵 연결·UV 반복 입력. 존재하지 않는 Normal 맵 참조가 포함된다. |

## 누락·반복·크기

`Poliigon_GrassPatchyGround_4585_Normal.png`는 **미포함**이다. 누락 경로를 요청하지 않는다. MaterialX 내 AO 색공간 등 설정을 복사하기보다 게임에서 색상은 sRGB, AO/roughness/metallic/height는 선형 데이터로 명시한다. 물리 면적은 미확인이고 한 타일3~6u는 게임 시작값이다. 타일의 무봉제성은 별도 검사하지 않았다.

## 게임 용도·성능

목초지·교외 완충 녹지의 색상/미세 요철용이다. BaseColor512~1024px부터 공유하고, 8K 원본은 런타임에 그대로 싣지 않는다. RGBA8 8K한 장은 약256MiB, 밉맵 포함 약341MiB이며 여러 PBR 맵을 모두 올리면 이 비용이 합산된다. 원본 TIFF와 MaterialX는 배포 파생본이 아니다. displacement로 지형·보행 높이를 바꾸지 않는다. 구체 미리보기는 상위 폴더에 있다.

## 출처·라이선스 상태

파일명과 MaterialX의 `Poliigon_GrassPatchyGround_4585` 이름으로 **Poliigon 배포본 계열로 식별**한다. 실제 다운로드 출처/구매 내역과 LICENSE 원문은 이 폴더에 없으므로 이용·재배포 조건은 확인되지 않았다. 무료 또는 CC0라고 단정하지 않는다. 웹 조회는 하지 않았다.


## 현재 런타임 반영

- `pasture` → `natural-a.png`의 **A채널**. 원본 휘도 무늬를512px로 정규화하여 사용한다. RGB/PBR원본을 직접 연결하지 않는다.
