# 플레이어 외형·카메라·차량 승하차 (2026-11-06)

사용자 요청으로 기본 머리카락을 제거하고 눈동자 시선, 차량에서의 자유 카메라, 승하차 모션과 위쪽 시야를 추가했다. 농촌/교외 주택 출입은 [RURAL_INTERIORS](RURAL_INTERIORS.md)에 정리했다.

## 외형과 눈동자

`render/characters.ts`는 사각 머리와 흰자, 분리한 눈동자/하이라이트를 사용한다. 기본260삼각형 예산과 모자·안경·의상·관절 계약은 유지한다. `characters-gaze.ts`가 최종 렌더 카메라를 머리 로컬 좌표로 변환해 동공만 X±0.055/Y±0.065 범위에서 부드럽게 옮긴다. 부모의 회전·배율에도 대응하고 프레임마다 벡터를 생성하지 않는다. 시민은 기존 인스턴싱과 중앙 시선을 유지하며 기본 머리카락만 제거했다.

## 자유 카메라와 하늘

`systems/camera.ts`의 `updateFollowCamera(raw)`를 loop에서 호출한 뒤 `cineCamera()`가 컷신 시점을 덮어쓰고, 마지막 카메라로 눈동자를 갱신한다.

- 마우스 드래그·포인터락·터치 회전/핀치·휠 입력 시각을 기록한다. 누른 상태와 창 밖에서의 해제·취소·blur도 처리한다.
- 차량 운전은 카메라 yaw를 직접 바꾸지 않는다. 수동 조작 종료2초 후 차량 뒤쪽으로 yaw만 부드럽게 복귀한다. 정차·후진 중에도 작동하며 pitch는 그대로 둔다.
- 드래그하는 동안, 승하차 중, 실내·일시정지·컷신 중에는 자동 복귀하지 않는다.
- pitch는 위쪽75°까지 허용한다. 음수 pitch에서는 카메라를 눈높이/지면 위에 두고 위로 바라보는 방향을 별도로 계산한다. 양수 구간의 기존 궤도 카메라는 유지한다.
- 가상 실내 좌표에는 외부 산 높이를 적용하지 않는다.

## 승하차 모션과 안전한 취소

`systems/vehicle-transition.ts`가 기존 캐릭터 관절을 이용해0.66초 동안 차 옆 접근→몸 넣기 또는 좌석→안전 위치로 나오는 동작을 만든다. 차량 모서리를 돌아가는 보행 경로를 먼저 확인한다. 차량 모델·텍스처·메시를 추가하지 않는다.

UI의 E 탑승/하차만 animate옵션을 사용하며 기존 `enterVeh(v)`, `exitVeh()`의 동기 API는 유지한다. 모션 동안 걷기·중복 상호작용·운전 물리와 다른 수영/자전거 포즈가 동작을 덮어쓰지 않는다. 완료하면 운전 또는 보행 상태로 돌아간다.

하차는 정차한 자차의 충돌체까지 포함해 안전한 발 디딜 위치와 짧은 탈출 경로를 검사한다. 공간이 없으면 운전 상태를 보존한다. 택시·포탈·검거·리스폰·침수 탈출은 `exitVeh(true)`로 모션을 즉시 취소하고 목적지로 이동한다. 차량 제거/고장 또는 외부 위치 변경도 모션을 취소하며 새 위치를 보존한다.

## 검수와 화면

기능 스펙은 `character-gaze.spec.ts`, `camera-control.spec.ts`, `vehicle-transition.spec.ts`에 있다. 기존 실내·차량·교외·물·컷신·보행 검사도 함께 실행한다. GPU FPS를 보증하는 측정은 아니다.

```sh
cd client
npx tsc
npx playwright test tests/e2e/character-gaze.spec.ts tests/e2e/camera-control.spec.ts tests/e2e/vehicle-transition.spec.ts tests/e2e/rural-interiors.spec.ts
PLAYER_REVIEW=1 npx playwright test tests/e2e/zz-controls-review.spec.ts
```

검수 도구는 `tests/out/rural-lodge-entry.png`, `rural-house-interior.png`, `vehicle-boarding.png`, `vehicle-exiting.png`, `camera-sky.png`를 생성한다. 이 도구는 기능 스펙 수에 포함하지 않는다.

최종 타입 빌드와 관련 기능 스펙30개를 분할 실행해 통과했다. 신규 외형/카메라/모션/주택11개와 기존 실내·교외·경관·차량 파손/침수·컷신·포탈·고가도로·다리 보행·상점/자전거19개다. 문턱의 부동소수 끝점 누락과 테스트의 비동기 대기 문제를 보정한 뒤 실패 항목을 재검증했다. 검수 도구1개도 통과했고 화면을 직접 확인했다. 최신 스폰93,446삼각형/393 calls로95k삼각형 기준을 유지했다.
