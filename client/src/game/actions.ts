// 플레이어 행동: 훔치기/문 열기/잡힘/리스폰/입고/판매/상호작용 키
import {S, save, cap, freeCount, freeSlot, newPlanet, sellValue} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {nestOf, poolOf} from '../core/layout.js';
import {SPAWN} from '../core/geometry.js';
import {locked, reqMissing, unlockSector} from '../core/progress.js';
import {fmt, rnd, shuffle} from '../core/util.js';
import {MUT, P, pickFrom} from '../data/planets.js';
import {DEX_REWARD_DIV} from '../data/pacing.js';
import {SECTORS} from '../data/sectors.js';
import {PQ} from '../data/quiz-planet.js';
import {GQ, GQU} from '../data/quiz-gate.js';
import {syncCarry} from '../render/gear.js';
import {flash, toast} from './hud.js';
import {interactableOf} from './interactables.js';
import {openQuiz} from './quiz.js';
import {sfx} from '../audio/index.js';

export function tryGrab(zi: number, k: number) {
  if (paused() || locked(zi)) return;
  const n = nestOf(zi);
  if (G.carry.length >= cap())
    return toast(
      cap() > 1 ? '가방이 가득 찼다 — 기지에 가져다 놓자' : '손이 가득! 상점에서 봉다리를 사면 더 들 수 있다'
    );
  if (freeCount() <= G.carry.length) return toast('기지 슬롯이 가득 찼다 — 판매하거나 칸을 늘리자');
  if (n.t[k] > 0) return; // 이미 가져갔거나 다시 자라는 중인 둥지
  if (n.cd[k] > 0) return toast(`재도전까지 ${Math.ceil(n.cd[k])}s`);
  const id = n.s[k],
    p = P[id];
  openQuiz({
    title: `⏸ 시간 정지 · ${p.name} — 문제를 맞혀야 훔칠 수 있다`,
    qs: [PQ[p.name] || shuffle(GQ.slice())[0]], // 행성 문제가 아직 없으면 입장 시험 문제로 대신한다
    need: 1,
    onDone(ok) {
      if (ok) {
        G.carry.push({id, z: zi, k, st: 1});
        n.t[k] = 1e9;
        syncCarry();
        toast('도망쳐! 기지로!');
        sfx('steal');
      } else {
        n.cd[k] = 15;
        sfx('quizFail');
        toast('오답 — 15초 뒤 다시 도전');
      }
    },
  });
}
/** 섹터 zi 입장 시험. 해금 조건(도감·신발·이동 수단·챕터)을 못 채웠으면 안내만 한다 */
export function openGate(zi: number) {
  if (!locked(zi) || paused()) return;
  const miss = reqMissing(zi),
    s = SECTORS[zi];
  if (miss.length) return toast(`🔒 ${zi + 1}단계 조건: ${miss.join(' · ')}`, 3);
  const bank = s.units.flatMap(u => GQU[u] || []),
    qs = shuffle((bank.length >= 3 ? bank : GQ).slice()).slice(0, 3);
  openQuiz({
    title: `🔒 ${zi + 1}단계 ${s.icon} ${s.name} 입장 시험 — 3문제 중 2문제`,
    qs,
    need: 2,
    onDone(ok) {
      if (ok) {
        unlockSector(zi);
        sfx('quizPass');
        toast(`🔓 ${zi + 1}단계 열림! ${s.icon} ${s.name}`, 3);
        flash('#7cf09a', 0.35);
        save();
      } else {
        toast('통과 실패 — 다시 도전하세요');
        sfx('quizFail');
      }
    },
  });
}
export function loseCarry() {
  G.carry.forEach(c => {
    const n = nestOf(c.z);
    n.s[c.k] = c.id;
    n.t[c.k] = 0;
  });
  G.carry = [];
  syncCarry();
}
export function caught() {
  const had = G.carry.length,
    lost = Math.floor(S.cr * (had ? 0.15 : 0.05));
  S.cr -= lost;
  sfx('caught');
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
  sfx('fall');
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
      const rw = P[id].price / DEX_REWARD_DIV;
      S.cr += rw;
      toast(`📖 도감 등록! +${fmt(rw)}`, 2.6);
      sfx('dex');
    }
    const n = nestOf(c.z);
    n.s[c.k] = pickFrom(poolOf(c.z));
    n.t[c.k] = rnd(8, 15);
  }
  syncCarry();
  if (msg.length) {
    toast(msg.join(', ') + ' 훔쳤다!');
    sfx('stash');
    save();
  }
}
export function sell(i: number) {
  const o = S.base[i];
  if (!o) return; // 라이벌이 막 훔쳐 갔거나 이미 판 칸이면 무시
  const v = sellValue(o);
  S.cr += v;
  S.base[i] = null;
  toast(`+${fmt(v)}`);
  sfx('sell');
  save();
}
/** E/F 키·프롬프트 터치: 현재 대상의 종류에 등록된 act 로 보낸다 */
export function act(k: 'e' | 'f') {
  const target = G.target;
  if (!target || paused()) return;
  const it = interactableOf(target.kind);
  if (it) it.act(target, k);
}
