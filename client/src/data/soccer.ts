// 축구 경기장 규격 (FIFA/FC 온라인 표준 105×68, 골문 7.32, 페널티 박스 16.5×40.3, 경기 10분 = 전후반 5분) (월드 좌표). 긴 변이 x 축, 골대는 양 끝(x = cx ± hl). 렌더(render/city/stadium.ts)와 경기(systems/soccer.ts)가 같이 쓴다.
export const PITCH = {cx: 270, cz: -270, hl: 52.5, hw: 34, goalHalf: 3.66, goalDepth: 2.6},
  /** 킥오프 안내판(E) 위치 = 센터 서클 */
  KICKOFF = {x: PITCH.cx, z: PITCH.cz},
  /** 스타디움 전체 사각형 [x0,z0,x1,z1] 과 남쪽 출입구 */
  STADIUM = {rect: [206, -334, 334, -206] as const, gateX: PITCH.cx, gateHalf: 8, stand: 10.4},
  MATCH_SEC = 600;
