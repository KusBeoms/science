# 텍스처 원본 카탈로그와 게임 적용

이 디렉터리는 사용자가 제공한 **25개 재질 세트(원본 약3.3GiB)** 보관소다. 각 재질 및 `8K`/`textures` 하위 폴더의 README에 실제 이미지로 확인한 스타일·색·표면·용도와 파일별 해상도·맵 역할을 기록했다.

## 현재 게임에서 사용하는 방식

원본의 Color/BaseColor/Albedo/Diffuse에서 표면 무늬를 추출해 **512×512 RGBA PNG4장,16종**으로 패킹한다. RGBA각채널은 별도 재질이며 **A채널도 투명도가 아닌 질감 데이터**다. 기존 건물·지형 팔레트와 낮밤 조명은 유지하고 근거리에서 실제 잔디·돌·목재·금속 무늬의 밝기 변화를 곱한다. 원본의 RGB색/PBR광택을 그대로 렌더링하는 방식은 아니다.

- 지형: 정돈된/거친 잔디·목초지·숲 바닥·흙·모래 곶·호안 자갈·암석 사면.
- 도시: 차도 아스팔트·보도/광장 포장돌. 기존 차선·표지·창문은 모델로 유지한다.
- 건물/농촌: 목재 문·산장·목재 가구, 지붕·헛간의 골판 금속, 금속 부품과 사일로 표면.
- 실내: 타일 바닥과 의자 방석/등받이의 부클레 직물.

전체 파생 PNG는 **3,163,013bytes(약3.02MiB)**, mipmap 포함 PNG4장의 GPU 메모리는 **약5.33MiB**, CPU생성 지형분류 마스크까지 합하면 **약5.69MiB**다. 원본4K/8K 한 장도 브라우저에 요청하지 않는다. 공유 Lambert재질1개를 사용하고 새 메시·삼각형·드로우패스를 추가하지 않는다. POT반복·mipmap·anisotropy≤4와180~350u 원경대비감쇠를 적용한다. 텍스처가 실패하면 기본색으로 계속 렌더한다.

## 생성과 파일 관리

```sh
python3 -m venv /tmp/science-texture-tools
/tmp/science-texture-tools/bin/pip install -r client/tools/texture-requirements.txt
/tmp/science-texture-tools/bin/python client/tools/build_surface_textures.py
cd client && npm run build
```

게임이 읽는 파일은 `client/public/assets/surfaces/`에 커밋된 파생 PNG와 `manifest.json`이다. manifest는 원본 상대경로·SHA256·실해상도·채널·추출영역과 배포용 해시를 남긴다. 2:1 원본은 비율을 유지하고 반복하여 정사각 팩을 만든다. Road011A는 차선 없는 아스팔트 영역만 사용해 기존 게임 차선과 맞춘다.

원본과 Blender/MaterialX/USD/Godot 파일은 로컬에 보존하고 git 및 Docker build context에서 제외한다. 소스 패키지를 다시 제공하면 생성 스크립트로 같은 파생본을 만들 수 있다. **원본/preview는 게임에 직접 로드하지 않는다.**

## 재질 목록

| 재질 폴더 | 현재 런타임 |
|---|---|
| [CorrugatedSteel009_4K-JPG](<Uncompressed/CorrugatedSteel009_4K-JPG/README.md>) | corrugated (`built-a.png` A) |
| [Facade007_4K-JPG](<Uncompressed/Facade007_4K-JPG/README.md>) | 자료 보관·다음 적용 후보 |
| [Facade010_4K-JPG](<Uncompressed/Facade010_4K-JPG/README.md>) | 자료 보관·다음 적용 후보 |
| [Facade013_4K-JPG](<Uncompressed/Facade013_4K-JPG/README.md>) | 자료 보관·다음 적용 후보 |
| [Facade017_4K-JPG](<Uncompressed/Facade017_4K-JPG/README.md>) | 자료 보관·다음 적용 후보 |
| [Grass003_4K-JPG](<Uncompressed/Grass003_4K-JPG/README.md>) | forest-grass (`natural-a.png` G) |
| [Grass005_4K-JPG](<Uncompressed/Grass005_4K-JPG/README.md>) | lawn (`natural-a.png` R) |
| [Ground103_8K-JPG](<Uncompressed/Ground103_8K-JPG/README.md>) | soil (`natural-b.png` R) |
| [Ground104_8K-JPG](<Uncompressed/Ground104_8K-JPG/README.md>) | dry-earth (`natural-b.png` G) |
| [Ground110_4K-JPG](<Uncompressed/Ground110_4K-JPG/README.md>) | 자료 보관·다음 적용 후보 |
| [Leaking019B_8K-JPG](<Uncompressed/Leaking019B_8K-JPG/README.md>) | 자료 보관·다음 적용 후보 |
| [Metal048B_4K-JPG](<Uncompressed/Metal048B_4K-JPG/README.md>) | 자료 보관·다음 적용 후보 |
| [Metal055C_4K-JPG](<Uncompressed/Metal055C_4K-JPG/README.md>) | rust (`built-b.png` G) |
| [Metal062C_4K-JPG](<Uncompressed/Metal062C_4K-JPG/README.md>) | 자료 보관·다음 적용 후보 |
| [PX_Grass_Lawn_04_4K](<Uncompressed/PX_Grass_Lawn_04_4K/README.md>) | rough-lawn (`natural-a.png` B) |
| [PavingStones150_4K-JPG](<Uncompressed/PavingStones150_4K-JPG/README.md>) | paving (`built-a.png` R) |
| [Poliigon_BoucleFabricBubbly_7827](<Uncompressed/Poliigon_BoucleFabricBubbly_7827/README.md>) | fabric (`built-b.png` A) |
| [Poliigon_GrassPatchyGround_4585 (1)](<Uncompressed/Poliigon_GrassPatchyGround_4585 (1)/README.md>) | pasture (`natural-a.png` A) |
| [Poliigon_MetalSteelBrushed_7174](<Uncompressed/Poliigon_MetalSteelBrushed_7174/README.md>) | steel (`built-b.png` R) |
| [Poliigon_WoodVeneerOak_7760](<Uncompressed/Poliigon_WoodVeneerOak_7760/README.md>) | 자료 보관·다음 적용 후보 |
| [Road011A_4K-JPG](<Uncompressed/Road011A_4K-JPG/README.md>) | asphalt (`built-a.png` G) |
| [Tiles138_4K-JPG](<Uncompressed/Tiles138_4K-JPG/README.md>) | tile (`built-b.png` B) |
| [Wood095_8K-JPG](<Uncompressed/Wood095_8K-JPG/README.md>) | wood (`built-a.png` B) |
| [dry_river_pebbles_4k.blend](<Uncompressed/dry_river_pebbles_4k.blend/README.md>) | pebbles (`natural-b.png` B) |
| [marble_cliff_03_4k.blend](<Uncompressed/marble_cliff_03_4k.blend/README.md>) | cliff (`natural-b.png` A) |

원본들에는 현재 라이선스 원문이 포함되어 있지 않다. 공급사명/파일명으로 추정한 출처와 실제 이용조건 확인을 구분하며, 각 폴더에 발견된 정보만 기록했다. Facade세트의 완성 창문·야간패턴, 금속성 금박/흰도금재 등은 현 게임 구조와 용도가 맞는 별도 표면의 후보로 남긴다. Normal/Roughness/AO/Displacement/Emission은 이번 런타임에서 사용하지 않는다.

[구현·성능·검증 문서](../../docs/tech/TEXTURES.md)
