// 플레이어 행동: 훔치기/문 열기/잡힘/리스폰/입고/판매/상호작용
import {S, save, cap, freeCount, freeSlot, mul, newPlanet} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {nests} from '../core/layout.js';
import {SPAWN, locked} from '../core/geometry.js';
import {fmt, rnd, shuffle} from '../core/util.js';
import {MUT, P, pickFrom} from '../data/planets.js';
import {Z} from '../data/zones.js';
import {PQ} from '../data/quiz-planet.js';
import {GQ} from '../data/quiz-gate.js';
import {syncCarry} from '../render/gear.js';
import {flash, toast} from './hud.js';
import {openQuiz} from './quiz.js';
import {openShop} from './shop-ui.js';

export function tryGrab(zi: number, k: number) {
  if (paused() || locked(zi)) return;
  if (G.carry.length >= cap())
    return toast(
      cap() > 1 ? '가방이 가득 찼다 — 기지에 가져다 놓자' : '손이 가득! 상점에서 봉다리를 사면 더 들 수 있다'
    );
  if (freeCount() <= G.carry.length) return toast('기지 슬롯이 가득 찼다 — 판매하거나 칸을 늘리자');
  if (nests[zi].t[k] > 0) return; // 이미 가져갔거나 다시 자라는 중인 둥지
  if (nests[zi].cd[k] > 0) return toast(`재도전까지 ${Math.ceil(nests[zi].cd[k])}s`);
  const id = nests[zi].s[k],
    p = P[id];
  openQuiz({
    title: `⏸ 시간 정지 · ${p.name} — 문제를 맞혀야 훔칠 수 있다`,
    qs: [PQ[p.name]],
    need: 1,
    onDone(ok) {
      if (ok) {
        G.carry.push({id, z: zi, k, st: 1});
        nests[zi].t[k] = 1e9;
        syncCarry();
        toast('도망쳐! 기지로!');
      } else {
        nests[zi].cd[k] = 15;
        toast('오답 — 15초 뒤 다시 도전');
      }
    },
  });
}
export function openGate() {
  const zi = S.zone;
  if (zi >= Z.length || paused()) return;
  const qs = shuffle(GQ.slice()).slice(0, 3);
  openQuiz({
    title: `🔒 ${zi + 1}단계 ${Z[zi].ic} ${Z[zi].n} 입장 시험 — 3문제 중 2문제`,
    qs,
    need: 2,
    onDone(ok) {
      if (ok) {
        S.zone = Math.max(S.zone, zi + 1);
        toast(`🔓 ${zi + 1}단계 열림! ${Z[zi].ic} ${Z[zi].n}`, 3);
        flash('#7cf09a', 0.35);
        save();
      } else toast('통과 실패 — 다시 도전하세요');
    },
  });
}
export function loseCarry() {
  G.carry.forEach(c => {
    nests[c.z].s[c.k] = c.id;
    nests[c.z].t[c.k] = 0;
  });
  G.carry = [];
  syncCarry();
}
export function caught() {
  const had = G.carry.length,
    lost = Math.floor(S.cr * (had ? 0.15 : 0.05));
  S.cr -= lost;
  toast(`잡혔다!${had ? ' 행성을 빼앗기고' : ''} -${fmt(lost)}`);
  loseCarry();
  G.me.pos.set(SPAWN.x, 0, SPAWN.z);
  G.me.vy = 0;
  flash('#f33', 0.5);
}
export function respawn() {
  const had = G.carry.length;
  if (had) loseCarry();
  G.me.pos.set(SPAWN.x, 0, SPAWN.z);
  G.me.vy = 0;
  toast(had ? '우주로 떨어졌다! 행성은 제자리로 돌아갔다' : '우주로 떨어져서 스폰 지점으로 돌아왔다');
}
export function deposit() {
  const msg: string[] = [];
  while (G.carry.length) {
    const i = freeSlot();
    if (i < 0) {
      if (performance.now() - G.fullToastAt > 3000) {
        G.fullToastAt = performance.now();
        toast('슬롯이 가득 찼다 — 판매하세요');
      }
      break;
    }
    const c = G.carry.shift()!,
      id = c.id,
      np = newPlanet(id, c.st);
    S.base[i] = np;
    S.stolen++;
    msg.push(P[id].name + (np.mut ? ` (${MUT[np.mut][0]})` : ''));
    if (!S.dex[id]) {
      S.dex[id] = 1;
      const rw = P[id].price / 10;
      S.cr += rw;
      toast(`📖 도감 등록! +${fmt(rw)}`, 2.6);
    }
    nests[c.z].s[c.k] = pickFrom(Z[c.z].pool);
    nests[c.z].t[c.k] = rnd(8, 15);
  }
  syncCarry();
  if (msg.length) {
    toast(msg.join(', ') + ' 훔쳤다!');
    save();
  }
}
export function sell(i: number) {
  const o = S.base[i];
  if (!o) return; // 라이벌이 막 훔쳐 갔거나 이미 판 칸이면 무시
  const p = P[o.id],
    v = (p.price / 2) * mul(o);
  S.cr += v;
  S.base[i] = null;
  toast(`+${fmt(v)}`);
  save();
}
export function act(k: string) {
  const target = G.target;
  if (!target || paused()) return;
  if (target.kind === 'nest' && k === 'e') tryGrab(target.z, target.k);
  else if (target.kind === 'base' && k === 'f') sell(target.i);
  else if (target.kind === 'npc' && k === 'e') openShop();
  else if (target.kind === 'gate' && k === 'e') openGate();
}
