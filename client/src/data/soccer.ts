// 축구 경기장 규격 (월드 좌표). 긴 변이 x 축, 골대는 양 끝(x = cx ± hl). 렌더(render/city/stadium.ts)와 경기(systems/soccer.ts)가 같이 쓴다.
export const PITCH = {cx: 272, cz: -270, hl: 45, hw: 28, goalHalf: 6, goalDepth: 3.2},
  /** 킥오프 안내판(E) 위치 = 센터 서클 */
  KICKOFF = {x: PITCH.cx, z: PITCH.cz},
  /** 스타디움 전체 사각형 [x0,z0,x1,z1] 과 남쪽 출입구 */
  STADIUM = {rect: [212, -325, 332, -215] as const, gateX: PITCH.cx, gateHalf: 8, stand: 12},
  MATCH_SEC = 180;
