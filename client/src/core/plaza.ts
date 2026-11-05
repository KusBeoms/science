// 도시 포탈 광장: 우주항 광장(data/city.ts 'port' 사각형 x −44~44, z 112~148)의 남쪽 띠. 12 섹터 포탈 기둥이 한 줄로 선다.
// 좌표 한 곳(여기)만 바꾸면 기둥·허브 패드·E 상호작용이 모두 따라간다.
export const PLAZA = {x: 0, z: 138, rowZ: 144.5, pitch: 6, halfW: 38, halfD: 9};
/** i 번째(0~) 섹터 포탈 기둥 위치 (12개를 x 방향으로 가운데 정렬) */
export const pillarPos = (i: number, n = 12) => ({x: PLAZA.x + (i - (n - 1) / 2) * PLAZA.pitch, z: PLAZA.rowZ});
/** 광장 안 (E 로 우주 지도를 여는 범위) */
export const inPlaza = (x: number, z: number) => Math.abs(x - PLAZA.x) < PLAZA.halfW && Math.abs(z - PLAZA.z) < PLAZA.halfD;
