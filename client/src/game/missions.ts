// 미션 진행 체크 (매 프레임)
import {S, save} from '../core/state.js';
import {setTxt, fmt} from '../core/util.js';
import {MS} from '../data/missions.js';
import {toast} from './hud.js';

export function missionTick() {
  if (S.mi >= MS.length) {
    setTxt('#mission', '🏆 우주 도둑!');
    return;
  }
  const m = MS[S.mi],
    cur = Math.min(m[1](), m[2]);
  if (cur >= m[2]) {
    S.cr += m[3];
    toast(`🎯 ${m[0]} 완료! +${fmt(m[3])}`, 3);
    S.mi++;
    save();
    return;
  }
  setTxt('#mission', `🎯 ${m[0]} (${cur}/${m[2]}) · +${fmt(m[3])}`);
}
