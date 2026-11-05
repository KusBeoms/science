// 경기 규격·출입구는 그대로 두고 관람 시설을 관중석 부지 안에 추가한다.
import {PITCH, STADIUM} from '../../data/soccer.js';
import {PAL} from '../lowpoly/palette.js';
import {box, panel} from '../lowpoly/prim.js';
import {beam} from '../lowpoly/structure.js';
export function stadiumDetails(): any[] {
  const parts: any[] = [], {hl, hw, goalHalf: gh, goalDepth: gd} = PITCH;
  // 얇은 후면·윗면 그물: 막힌 판 대신 그물 너머가 보인다.
  for (const s of [-1, 1]) {
    const x = s * (hl + gd);
    for (let z = -gh; z <= gh; z += 0.8) parts.push(beam([x, 0, z], [x, 3.2, z], 0.035, PAL.cloud), beam([s * hl, 3.2, z], [x, 3.2, z], 0.035, PAL.cloud));
    for (let y = 0.6; y <= 3.2; y += 0.6) parts.push(beam([x, y, -gh], [x, y, gh], 0.035, PAL.cloud));
  }
  // 남·북 캐노피는 중앙 개방, 양끝 기둥은 기존 스탠드 내부.
  for (const sz of [-1, 1]) {
    const z = sz * 59;
    for (const x of [-58, -30, 30, 58]) {
      parts.push(box(0.5, 15, 0.5, PAL.steel, x, 0, z));
      parts.push(beam([x, 14, z], [x, 11.5, z - sz * 9], 0.4, PAL.steel));
    }
    for (const sx of [-1, 1]) parts.push(box(56, 0.5, 9, PAL.cloud, sx * 34, 14.5, z - sz * 3));
    for (let x = -60; x <= 60; x += 14) {
      if (sz > 0 && Math.abs(x) < STADIUM.gateHalf + 2) continue;
      for (let r = 0; r < 4; r++) parts.push(box(1, 0.06, 2.5, PAL.stone, x, (r + 1) * 2.4 + 0.04, sz * (51 + r * 2.6)));
    }
  }
  // 양팀 벤치·터널. 피치 밖, 남쪽 문 통로는 열어 둔다.
  for (const s of [-1, 1]) {
    parts.push(box(11, 0.35, 1.4, s < 0 ? PAL.red : PAL.blue, s * 24, 1, hw + 6), box(12, 0.3, 3.5, PAL.glass, s * 24, 3.7, hw + 6));
    for (const x of [-5, 5]) parts.push(box(0.2, 3.6, 0.2, PAL.steel, s * 24 + x, 0, hw + 7));
  }
  parts.push(box(0.5, 4, 8, PAL.steel, -STADIUM.gateHalf - 0.5, 0, 59), box(0.5, 4, 8, PAL.steel, STADIUM.gateHalf + 0.5, 0, 59), box(STADIUM.gateHalf * 2 + 1.5, 0.4, 8, PAL.coal, 0, 4, 59));
  // 전광판: 아이콘/점수 0:0, 광고는 팔레트 도형으로.
  parts.push(box(18, 7, 1, PAL.coal, 0, 13.5, -60));
  for (const s of [-1, 1]) {
    for (const dx of [-1.4, 1.4]) parts.push(box(0.4, 3.2, 0.1, PAL.white, s * 4 + dx, 15, -59.4));
    for (const y of [15, 17.8]) parts.push(box(2.8, 0.4, 0.1, PAL.white, s * 4, y, -59.4));
  }
  for (const y of [15.6, 17]) parts.push(box(0.4, 0.4, 0.1, PAL.amber, 0, y, -59.4));
  for (let x = -42; x <= 42; x += 14) for (const s of [-1, 1]) parts.push(panel(10, 1.2, x % 3 ? PAL.blue : PAL.amber, x, 0.9, s * (hw + 11), s < 0 ? 0 : Math.PI));
  return parts;
}
