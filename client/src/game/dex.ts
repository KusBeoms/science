// 도감 UI
import {S, dexN} from '../core/state.js';
import {G, paused, releaseLock} from '../core/runtime.js';
import {$, fmt} from '../core/util.js';
import {P} from '../data/planets.js';
import {SECTORS} from '../data/sectors.js';
import {sfx} from '../audio/index.js';

/** 행성이 처음 나오는 섹터 인덱스 (어느 풀에도 없으면 -1) */
export const stageOf = (id: number) => SECTORS.findIndex(s => s.pool.includes(id));
const nf = (n: number) => (n >= 100 ? Math.round(n) + '' : n >= 1 ? n.toFixed(1) : n.toFixed(3));
export function renderDex(sel?: number | null) {
  $('#dn').textContent = `${dexN()}/${P.length}`;
  const g = $('#dgrid');
  g.innerHTML = '';
  // 섹터별 묶음 (행성은 처음 나오는 섹터에만), 어느 섹터에도 없는 행성은 "기타"
  const groups = SECTORS.map((s, i) => ({h: `${i + 1}단계 ${s.icon} ${s.name}`, ps: P.filter(p => stageOf(p.id) === i)}));
  groups.push({h: '기타', ps: P.filter(p => stageOf(p.id) < 0)});
  groups.forEach(gr => {
    if (!gr.ps.length) return;
    const hd = document.createElement('div');
    hd.className = 'dh';
    hd.textContent = `${gr.h} · ${gr.ps.filter(p => S.dex[p.id]).length}/${gr.ps.length}`;
    g.append(hd);
    gr.ps.forEach(p => {
      const have = !!S.dex[p.id],
        d = document.createElement('div');
      d.className = 'de' + (have ? '' : ' lk') + (sel === p.id ? ' sel' : '');
      d.innerHTML = `<i style="background:radial-gradient(circle at 32% 28%,${p.c1},${p.c2} 72%,#000 140%)"></i>${have ? p.name : '???'}`;
      d.onclick = () => renderDex(p.id);
      g.append(d);
    });
  });
  const inf = $('#dinf');
  if (sel == null) inf.innerHTML = '행성을 훔치면 도감에 등록됩니다 (1종당 수익 +2%, 첫 등록 보상)';
  else {
    const p = P[sel];
    inf.innerHTML = S.dex[sel]
      ? `<b>${p.name}</b> · ${p.grp}<br>질량 <i>${nf(p.M)} M⊕</i> · 반지름 <i>${nf(p.R)} R⊕</i> · 중력 <i>${p.g.toFixed(2)}g</i> · 탈출속도 <i>${p.ve.toFixed(1)}km/s</i><br>${p.fact}`
      : `<b>???</b> · ${p.grp}<br>${stageOf(sel) < 0 ? '아직 발견 장소 미정' : `${stageOf(sel) + 1}단계 ${SECTORS[stageOf(sel)].name}에서 발견`} · 가격 ${fmt(p.price)}`;
  }
}
export function toggleDex(on: boolean) {
  if (on && paused()) return;
  G.dexOpen = on;
  sfx(on ? 'open' : 'close');
  $('#dex').classList.toggle('on', on);
  if (on) {
    releaseLock();
    renderDex();
  }
}
