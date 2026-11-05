# 은회색 골강판 — CorrugatedSteel009_4K-JPG

## 스타일과 실제 용도

차가운 은회색의 평행 골, 어두운 이음선과 작은 갈색 부식점이 보이는 산업용 금속. 미리보기의 강한 하이라이트는 조명 효과이며 Color에는 그 반사가 그대로 들어 있지 않다.

- 현실적인 용도: 창고 외장, 공장 지붕, 셔터, 농기계 보관소 벽. 골 방향을 실제 패널 시공 방향에 맞춘다.
- 게임 권장 위치: 동부 탱크/설비 구역·정비소의 셔터, 농촌 창고 지붕에 제한적으로 반복. 금문교 주탑처럼 매끈한 도장 강재에는 다른 재질이 어울린다.
- 적용 주의: 2:1 이미지 비율을 유지하고 UV 반복도 두 축을 따로 조절한다. 골은 노멀로 표현하고 먼 거리에서는 Color만 남긴다.

![재질 미리보기](CorrugatedSteel009.png)

## 실제 파일과 맵 역할

2026-11-06 로컬 이미지 헤더를 직접 읽은 실측값이다. 폴더 이름의 4K/8K를 모든 이미지 크기로 가정하지 않는다.

표의 `L`은 8bit 회색조, `RGB`는 색 3채널, `RGBA`는 알파 포함 4채널이다.

| 파일 | 실제 해상도 / 형식 | 역할 |
|---|---|---|
| `CorrugatedSteel009.png` | 512×512 · PNG · RGBA | 재질 적용 예시 미리보기; 색/노멀 맵이 아님 |
| `CorrugatedSteel009_4K-JPG_AmbientOcclusion.jpg` | 4096×2048 · JPEG · L | 미세 틈/접촉 차폐; 선형 데이터, 별도 AO 입력 |
| `CorrugatedSteel009_4K-JPG_Color.jpg` | 4096×2048 · JPEG · RGB | 기본색/albedo; sRGB |
| `CorrugatedSteel009_4K-JPG_Displacement.jpg` | 4096×2048 · JPEG · L | 높이/변위; 선형 데이터, 원본 해석/중립값 확인 후 사용 |
| `CorrugatedSteel009_4K-JPG_Metalness.jpg` | 4096×2048 · JPEG · L | 금속/비금속 비율; 선형 데이터 |
| `CorrugatedSteel009_4K-JPG_NormalDX.jpg` | 4096×2048 · JPEG · RGB | DirectX(-Y) 접선공간 노멀; GL과 동시 사용하지 않음 |
| `CorrugatedSteel009_4K-JPG_NormalGL.jpg` | 4096×2048 · JPEG · RGB | OpenGL(+Y) 접선공간 노멀; 선형 데이터, 게임 우선 후보 |
| `CorrugatedSteel009_4K-JPG_Roughness.jpg` | 4096×2048 · JPEG · L | 거칠기; 선형 데이터, 밝을수록 거침 |

보조 재질 파일: `CorrugatedSteel009_4K-JPG.blend`, `CorrugatedSteel009_4K-JPG.mtlx`, `CorrugatedSteel009_4K-JPG.tres`, `CorrugatedSteel009_4K-JPG.usdc`. Blender/USD/MaterialX/Godot용 재질 정의이며 브라우저 런타임이 그대로 읽는 이미지가 아니다.

## 게임 적용과 성능

`NormalGL.jpg`를 우선 사용한다. `NormalDX.jpg`는 Y(녹색) 방향이 반대인 대안이므로 함께 겹쳐 쓰지 않는다. DX만 쓸 때는 대상 재질의 Y 방향 변환이 필요하며 오목/볼록을 조명 아래 확인한다.

Color/BaseColor와 Emission은 색 텍스처이고, Normal/Roughness/Metalness/Metallic/AO/Displacement는 감마 보정을 하지 않는 선형 데이터다. 미리보기는 조명/형상까지 합친 참고 이미지라 게임 재질의 Color 맵으로 쓰지 않는다. JPG에는 알파 투명도가 없다.

게임용 파생본은 작은 소품 512px, 일반 면 1024px 정도부터 화면에서 확인한다. 선택한 가까운 큰 면만 2048px를 검토하고 원본 4K/8K 전체를 모든 오브젝트에 직접 올리지 않는다. mipmap·반복 UV·텍스처/재질 공유를 사용하고 원경에서는 normal/AO 등 보조 맵을 생략할 수 있다. 비압축 RGBA8 가정의 정사각 8K 한 장은 mipmap 포함 약 341MiB이므로 파일의 JPG 용량을 GPU 메모리로 보지 않는다. 2:1 원본은 가로세로 비율을 유지한 파생본을 만든다.

Displacement를 메시 분할/충돌 변형으로 자동 적용하지 않는다. 기존 지면·보행 데크·문·차도와 충돌 계약은 유지하고 표면 무늬부터 적용한다. 로우폴리 색상 재질에 Color만 연결한 경우 PBR 반사·노멀·거칠기는 자동으로 표현되지 않는다.

## 출처·라이선스와 적용 상태

이름과 패키지 구성은 **ambientCG 계열로 추정**하지만, 이 폴더 안의 공급사 원문/출처 URL로 확정한 것은 아니다. **라이선스 실제 미확인**: 로컬에 LICENSE/COPYING/이용조건 원문이 없어 허용 범위·재배포 조건을 확정하지 않았다. 공급사 추정과 사용권 확인을 구분한다.

이 문서는 원본 분류와 게임 적용 권장안이다. 최종 런타임 연결/파생 에셋 현황은 [텍스처 상위 README](../../README.md)에서 통합 관리한다. 원본 이미지/재질 파일은 변경하지 않았다.


## 현재 런타임 반영

- `corrugated` → `built-a.png`의 **A채널**. 원본 휘도 무늬를512px로 정규화하여 사용한다. RGB/PBR원본을 직접 연결하지 않는다.
