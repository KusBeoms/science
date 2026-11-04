// 상호작용 대상 탐색 + 하단 정보/프롬프트 표시
import {S, mul} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {dist2, fmt} from '../core/util.js';
import {nests, nestPos} from '../core/layout.js';
import {SHOP_AT, locked, slotPos} from '../core/geometry.js';
import {P} from '../data/planets.js';
import {SH, Z} from '../data/zones.js';
import {infoHTML} from '../game/hud.js';
import {$} from '../core/util.js';
import type {Target} from '../core/types.js';

export function updateTarget(raw: number) {
  const me = G.me;
  // 대상 탐색
  let target = null as Target | null,
    bd = 5;
  nests.forEach((n, zi) => {
    if (locked(zi)) return;
    n.s.forEach((id, k) => {
      if (n.t[k] > 0) return;
      const d = dist2(me.pos, nestPos(zi, k));
      if (d < bd) {
        bd = d;
        target = {kind: 'nest', z: zi, k, id};
      }
    });
  });
  for (let i = 0; i < S.slots; i++) {
    const o = S.base[i];
    if (!o) continue;
    const d = dist2(me.pos, slotPos(i));
    if (d < bd) {
      bd = d;
      target = {kind: 'base', i, id: o.id};
    }
  }
  if (G.pickOv && (G.pickOv.t -= raw) > 0) {
    const pk = G.pickOv.pk;
    if (pk.kind === 'base' && S.base[pk.i]) {
      const d = dist2(me.pos, slotPos(pk.i));
      if (!target || d <= 7) target = {kind: 'base', i: pk.i, id: S.base[pk.i]!.id};
    }
  } else G.pickOv = null;
  if (!target || bd > 3.5) {
    if (dist2(me.pos, SHOP_AT) < 7) target = {kind: 'npc'};
    else if (S.zone < Z.length && Math.abs(me.pos.z - (Z[S.zone].z + SH)) < 7 && Math.abs(me.pos.x) < SH + 2)
      target = {kind: 'gate', i: S.zone};
  }
  G.target = target;
  const inf = $('#info'),
    pr = $('#prompt');
  if (target && !paused()) {
    pr.style.display = 'block';
    pr.classList.remove('off');
    if (target.kind === 'nest') {
      const cd = nests[target.z].cd[target.k];
      inf.style.display = 'block';
      inf.innerHTML = infoHTML(P[target.id], null);
      pr.textContent = cd > 0 ? `재도전 ${Math.ceil(cd)}s` : 'E 훔치기 (문제 풀이 · ⏸)';
      if (cd > 0) pr.classList.add('off');
    } else if (target.kind === 'base') {
      const o = S.base[target.i]!;
      inf.style.display = 'block';
      inf.innerHTML = infoHTML(P[o.id], o);
      pr.textContent =
        o.left > 0 ? `성장 중 ${Math.ceil(o.left)}s · F 판매` : `F 판매 +${fmt((P[o.id].price / 2) * mul(o))}`;
    } else if (target.kind === 'npc') {
      inf.style.display = 'block';
      inf.innerHTML = '<b>상점 아저씨</b><br>스프링 · 가방 · 신발 · 기지 꾸미기';
      pr.textContent = 'E 상점 열기';
    } else {
      inf.style.display = 'block';
      inf.innerHTML = `<b>${target.i + 1}단계 ${Z[target.i].ic} ${Z[target.i].n}</b><br>통합과학 문제 3개 중 2개를 맞히면 문이 열린다`;
      pr.textContent = `E 🔒 ${target.i + 1}단계 시험 보기`;
    }
  } else {
    inf.style.display = 'none';
    pr.style.display = 'none';
  }
}
