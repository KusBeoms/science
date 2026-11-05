# 따뜻한 밝은 오크 무늬목 — 8K 원본 맵

[상위 재질 설명/권장 위치](../README.md) · [전체 텍스처 적용 상태](../../../README.md)

따뜻한 황갈색/분홍빛 베이지 바탕에 길게 흐르는 곧은 나뭇결과 드문 물결무늬가 있다. 깨끗하게 마감된 실내용 무늬목 인상이다.

- 현실적인 용도: 책상·선반·캐비닛·가구 패널·실내 벽 마감.
- 게임 권장 위치: 카페 테이블·과학관 전시 가구·주택의 문/수납장. 비바람에 닳은 야외 선착장보다 실내 가구에 잘 맞는다.
- 재질별 주의: Metallic은 0~5의 거의 비금속. Displacement TIFF는 16bit 전체 32767로 일정해 실제 높이 디테일이 없다. 높이 변위는 생략하고 Color/약한Normal만 사용한다.

## 실제 파일과 역할

2026-11-06 이미지 헤더 실측. 아래 해상도는 미리보기 크기가 아닌 실제 8K 맵 크기다.

표의 `L`은 8bit 회색조, `RGB`는 색 3채널, `RGBA`는 알파 포함 4채널이다.

| 파일 | 실제 해상도 / 형식 | 역할 |
|---|---|---|
| `Poliigon_WoodVeneerOak_7760_AmbientOcclusion.jpg` | 8192×8192 · JPEG · L | 미세 틈/접촉 차폐; 선형 데이터, 별도 AO 입력 |
| `Poliigon_WoodVeneerOak_7760_BaseColor.jpg` | 8192×8192 · JPEG · RGB | 기본색/albedo; sRGB |
| `Poliigon_WoodVeneerOak_7760_Displacement.tiff` | 8192×8192 · TIFF · 16bit 단일 채널 | 높이/변위; 선형 데이터, 원본 해석/중립값 확인 후 사용 |
| `Poliigon_WoodVeneerOak_7760_Metallic.jpg` | 8192×8192 · JPEG · L | 금속/비금속 비율; 선형 데이터 |
| `Poliigon_WoodVeneerOak_7760_Normal.png` | 8192×8192 · PNG · RGB | 접선공간 노멀; GL/DX 미표기, 방향 검수 필요 |
| `Poliigon_WoodVeneerOak_7760_Roughness.jpg` | 8192×8192 · JPEG · L | 거칠기; 선형 데이터, 밝을수록 거침 |

보조 파일: `Poliigon_WoodVeneerOak_7760.mtlx`는 MaterialX 재질 연결 정보다. 브라우저에 그대로 넣는 재질 코드가 아니다.

## 게임 사용

`Normal.png`는 GL/DX가 파일명에 명시되지 않았다. 제공 MaterialX는 tangent normal로 연결하지만 Y 부호는 명시하지 않는다. 작은 돌출/움푹한 무늬의 방향을 조명 아래 비교한 뒤 사용한다. MaterialX의 Normal 이미지에 `srgb_texture`가 기록돼 있으나 게임에서는 노멀을 선형 데이터로 취급한다.

Color/BaseColor와 Emission은 색 텍스처이고, Normal/Roughness/Metalness/Metallic/AO/Displacement는 감마 보정을 하지 않는 선형 데이터다. 미리보기는 조명/형상까지 합친 참고 이미지라 게임 재질의 Color 맵으로 쓰지 않는다. JPG에는 알파 투명도가 없다.

게임용 파생본은 작은 소품 512px, 일반 면 1024px 정도부터 화면에서 확인한다. 선택한 가까운 큰 면만 2048px를 검토하고 원본 4K/8K 전체를 모든 오브젝트에 직접 올리지 않는다. mipmap·반복 UV·텍스처/재질 공유를 사용하고 원경에서는 normal/AO 등 보조 맵을 생략할 수 있다. 비압축 RGBA8 가정의 정사각 8K 한 장은 mipmap 포함 약 341MiB이므로 파일의 JPG 용량을 GPU 메모리로 보지 않는다. 2:1 원본은 가로세로 비율을 유지한 파생본을 만든다.

Displacement를 메시 분할/충돌 변형으로 자동 적용하지 않는다. 기존 지면·보행 데크·문·차도와 충돌 계약은 유지하고 표면 무늬부터 적용한다. 로우폴리 색상 재질에 Color만 연결한 경우 PBR 반사·노멀·거칠기는 자동으로 표현되지 않는다.

## 출처·라이선스

파일명과 MaterialX 노드에 **Poliigon** 명칭이 있다. 브랜드 표기는 확인했지만 구매/다운로드 경로·계정 권한·이 에셋에 적용되는 라이선스 원문은 이 폴더에서 확인되지 않았다. **라이선스 실제 미확인**: 이 폴더에 이용조건 원문이 없어 허용 범위/재배포 조건을 확정하지 않았다. 원본을 수정하지 않았으며 실제 게임 연결 상태는 상위 문서에서 관리한다.


## 현재 런타임 반영

이번 경량 런타임 팩에는 포함하지 않았다. 이 문서의 위치/맵 사용법은 후속 적용 권장안이며, 현재 게임 적용 사실과 구분한다.
