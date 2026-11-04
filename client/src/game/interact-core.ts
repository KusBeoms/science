// 기본 상호작용 종류: 둥지 행성(nest)·기지 슬롯(base)·상점 점원(npc)·섹터 문(gate). 등록은 systems/index.ts
import {S, sellValue} from '../core/state.js';
import {G} from '../core/runtime.js';
import {dist2, fmt} from '../core/util.js';
import {nests, nestPos} from '../core/layout.js';
import {SHOP_AT, nearGate, slotPos} from '../core/geometry.js';
import {isNext, locked, reqMissing} from '../core/progress.js';
import {P} from '../data/planets.js';
import {SECTORS} from '../data/sectors.js';
import {infoHTML, toast} from './hud.js';
import {openGate, sell, tryGrab} from './actions.js';
import {openShop} from './shop-ui.js';
import type {Interactable, Target} from '../core/types.js';

type NestT = Target & {z: number; k: number; id: number};
type BaseT = Target & {i: number; id: number};
type GateT = Target & {i: number};

export const nestIt: Interactable<NestT> = {
  kind: 'nest',
  tier: 0,
  find(me) {
    let best: NestT | null = null;
    G.chunks.forEach((c, zi) => {
      if (!c || locked(zi)) return;
      const n = nests[zi]!;
      n.s.forEach((id, k) => {
        if (n.t[k] > 0) return;
        const d = dist2(me.pos, nestPos(zi, k));
        if (d < 5 && (!best || d < best.d)) best = {kind: 'nest', d, z: zi, k, id};
      });
    });
    return best;
  },
  info: t => infoHTML(P[t.id], null),
  prompt(t) {
    const cd = nests[t.z]!.cd[t.k];
    return cd > 0 ? `재도전 ${Math.ceil(cd)}s` : 'E 훔치기 (문제 풀이 · ⏸)';
  },
  off: t => nests[t.z]!.cd[t.k] > 0,
  act(t, key) {
    if (key === 'e') tryGrab(t.z, t.k);
  },
  click(pk) {
    if (dist2(G.me.pos, nestPos(pk.z, pk.k)) < 7) tryGrab(pk.z, pk.k);
    else toast('더 가까이 가세요');
  },
};
export const baseIt: Interactable<BaseT> = {
  kind: 'base',
  tier: 0,
  find(me) {
    let best: BaseT | null = null;
    for (let i = 0; i < S.slots; i++) {
      const o = S.base[i];
      if (!o) continue;
      const d = dist2(me.pos, slotPos(i));
      if (d < 5 && (!best || d < best.d)) best = {kind: 'base', d, i, id: o.id};
    }
    // 화면에서 클릭한 슬롯은 4초간 우선 (7 안이면 무조건, 멀면 다른 대상이 없을 때만)
    const ov = G.pickOv && G.pickOv.pk;
    if (ov && ov.kind === 'base' && S.base[ov.i]) {
      const d = dist2(me.pos, slotPos(ov.i));
      return {kind: 'base', d: d <= 7 ? -1 : 4.99, i: ov.i, id: S.base[ov.i]!.id};
    }
    return best;
  },
  info: t => infoHTML(P[S.base[t.i]!.id], S.base[t.i]),
  prompt(t) {
    const o = S.base[t.i]!;
    return o.left > 0 ? `성장 중 ${Math.ceil(o.left)}s · F 판매` : `F 판매 +${fmt(sellValue(o))}`;
  },
  tapKey: 'f',
  act(t, key) {
    if (key === 'f') sell(t.i);
  },
};
export const npcIt: Interactable = {
  kind: 'npc',
  tier: 1,
  find(me) {
    const d = dist2(me.pos, SHOP_AT);
    return d < 7 ? {kind: 'npc', d} : null;
  },
  info: () => '<b>상점 아저씨</b><br>스프링 · 가방 · 신발 · 기지 꾸미기',
  prompt: () => 'E 상점 열기',
  act(_t, key) {
    if (key === 'e') openShop();
  },
  click() {
    if (dist2(G.me.pos, SHOP_AT) < 9) openShop();
    else toast('상점 아저씨에게 더 가까이 가세요');
  },
};
export const gateIt: Interactable<GateT> = {
  kind: 'gate',
  tier: 1,
  find(me) {
    for (let i = 0; i < SECTORS.length; i++)
      if (isNext(i) && nearGate(i, me.pos.x, me.pos.z, 7)) return {kind: 'gate', d: 6, i};
    return null;
  },
  info(t) {
    const s = SECTORS[t.i],
      miss = reqMissing(t.i);
    return (
      `<b>${t.i + 1}단계 ${s.icon} ${s.name}</b><br>통합과학 문제 3개 중 2개를 맞히면 문이 열린다` +
      (miss.length ? `<br>필요: <i>${miss.join(' · ')}</i>` : '')
    );
  },
  prompt: t => (reqMissing(t.i).length ? `🔒 ${t.i + 1}단계 — 조건 미달` : `E 🔒 ${t.i + 1}단계 시험 보기`),
  off: t => reqMissing(t.i).length > 0,
  act(t, key) {
    if (key === 'e') openGate(t.i);
  },
  click(pk) {
    if (isNext(pk.i) && nearGate(pk.i, G.me.pos.x, G.me.pos.z, 9)) openGate(pk.i);
    else toast(!locked(pk.i) ? '이미 열린 문' : isNext(pk.i) ? '문에 더 가까이 가세요' : '앞 단계부터 통과해야 한다');
  },
};
export const CORE_INTERACTABLES = [nestIt, baseIt, npcIt, gateIt] as Interactable[];
