// 운전 중 차 상태 HUD: 차체/엔진 게이지(글자 라벨+막대) + 경고 아이콘. addHudLine 레지스트리.
import {G} from '../core/runtime.js';
import {addHudLine} from './hud.js';

const bar = (n: number) => {
  const k = Math.round(Math.max(0, Math.min(100, n)) / 20);
  return '▰'.repeat(k) + '▱'.repeat(5 - k);
};
addHudLine(() => {
  const v = G.drive,
    d = v?.d;
  if (!d || (d.hp > 99 && d.engine > 99 && !d.broken)) return null;
  const warn = d.broken ? (d.cause === 'water' ? '침수 고장. 튜닝샵에서 수리하세요' : '엔진 고장. 튜닝샵에서 수리하세요') : d.inW ? '물에 잠기는 중' : d.engine < 30 || d.hp < 25 ? '위험합니다' : d.engine < 60 ? '엔진 점검 필요' : '';
  return `차체 ${bar(d.hp)}  엔진 ${bar(d.engine)} ${warn}`;
});
