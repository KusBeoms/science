// W5 FUN 상호작용: 구역별 즐길 거리(data/fun-spots.ts)를 종류 하나(kind 'fun')로 등록한다.
//  timing = 막대가 오가는 걸 초록 칸에서 E (3번, 점수제)   tap = E 연타   ride = 탑승(G.sit 이 기구를 따라감)   feed = 먹이/쓰다듬기(쿨다운)
//  gacha = 뽑기(✦ 내고 상품)   food = 간식(스태미나 가득)   sit = 앉기.  안내는 짧은 문장(동물 반응만 이모지), 돈은 S.cr(✦).
import {S, save} from '../core/state.js';
import {G} from '../core/runtime.js';
import {groundH} from '../core/terrain.js';
import {dist2, eul} from '../core/util.js';
import {sfx} from '../audio/index.js';
import {funClock, rideOvr} from '../data/city-w5.js';
import {FUN_HELP, FUN_NAME, FUN_SPOTS, RIDE_DUR, RIDE_POSE, spotById, type FunSpot} from '../data/fun-spots.js';
import {ferrisAngle} from '../render/city/index.js';
import {addHudLine, toast} from './hud.js';
import type {GameSystem, Interactable, Target} from '../core/types.js';

interface FunT extends Target {
  kind: 'fun';
  id: string;
}
type Timing = Extract<FunSpot, {type: 'timing'}>;
type Tap = Extract<FunSpot, {type: 'tap'}>;
type Play = {k: 'timing'; sp: Timing; t0: number; left: number; res: number[]} | {k: 'tap'; sp: Tap; n: number};
let play: Play | null = null,
  ride: {sp: Extract<FunSpot, {type: 'ride'}>; s: number} | null = null;
const cool = new Map<string, number>();
const now = () => funClock.t;
const count = (id: string) => (S.coins['fun:' + id] = ((S.coins['fun:' + id] as number) || 0) + 1);
const pay = (n: number) => {
  S.cr += n;
  save();
};
const nameOf = (sp: FunSpot) => FUN_NAME[sp.id] || sp.id;
const reach = (sp: FunSpot) => sp.r ?? 4.5;

/** 막대 위치 0..1 (삼각파) */
export function meter(): number {
  if (!play || play.k !== 'timing') return 0;
  const ph = ((now() - play.t0) * play.sp.speed) % 2;
  return ph < 1 ? ph : 2 - ph;
}
export const funState = () => ({play: play ? play.k : null, riding: ride ? ride.sp.id : null, meter: meter()});

function endRide() {
  if (!ride) return;
  const {x, z} = ride.sp.exit;
  G.sit = null;
  G.me.pos.set(x, Math.max(0, groundH(x, z)), z);
  G.me.vy = 0;
  rideOvr.coaster = null;
  rideOvr.yacht = null;
  ride = null;
}
function startRide(sp: Extract<FunSpot, {type: 'ride'}>) {
  ride = {sp, s: 0};
  count(sp.id);
  sfx('open');
  toast(`${nameOf(sp)} 탑승 · E로 내립니다`);
  poseRide();
}
function poseRide() {
  if (!ride) return;
  const p = RIDE_POSE[ride.sp.ride](ride.s, funClock.t, ferrisAngle());
  G.sit = {x: p.x, y: p.y, z: p.z, ry: p.ry};
  if (ride.sp.ride === 'coaster') rideOvr.coaster = (ride.s / 22) % 1;
  if (ride.sp.ride === 'yacht') rideOvr.yacht = {...p, y: p.y - 0.9};
}

function roll(prizes: [string, number, number][]) {
  let r = Math.random();
  for (const p of prizes) if ((r -= p[2]) < 0) return p;
  return prizes[0];
}
function broke(fee: number) {
  if (S.cr >= fee) return false;
  toast('코인이 부족합니다');
  sfx('deny');
  return true;
}
function finishTiming(p: Extract<Play, {k: 'timing'}>) {
  const total = p.res.reduce((a, r) => a + r * p.sp.pay, 0);
  const n = (k: number) => p.res.filter(r => r === k).length;
  toast(`${nameOf(p.sp)} 결과: 완벽 ${n(2)} · 성공 ${n(1)} · 실패 ${n(0)} — ✦ +${total}`, 2.8);
  if (total > 0) sfx('cheer');
  const key = 'fun:best:' + p.sp.id;
  S.coins[key] = Math.max((S.coins[key] as number) || 0, total);
  count(p.sp.id);
  pay(total);
  play = null;
}
function act(sp: FunSpot) {
  switch (sp.type) {
    case 'timing': {
      if (!play) {
        if (broke(sp.fee)) return;
        S.cr -= sp.fee;
        play = {k: 'timing', sp, t0: now(), left: sp.tries, res: []};
        sfx('ping');
        return;
      }
      if (play.k !== 'timing') return;
      const e = Math.abs(meter() - 0.5) * 2,
        r = e < sp.zone * 0.35 ? 2 : e < sp.zone ? 1 : 0;
      play.res.push(r);
      play.left--;
      sfx(r ? 'net' : 'deny');
      if (play.left <= 0) finishTiming(play);
      return;
    }
    case 'tap': {
      if (!play) play = {k: 'tap', sp, n: 0};
      if (play.k !== 'tap') return;
      play.n++;
      sfx('kick');
      if (play.n >= sp.taps) {
        const ok = (cool.get(sp.id) ?? 0) <= now();
        toast(ok ? `${nameOf(sp)} 완료! ✦ +${sp.pay}` : `${nameOf(sp)} 완료. 보상은 잠시 뒤에 받을 수 있습니다`, 2.4);
        if (ok) {
          cool.set(sp.id, now() + sp.cd);
          pay(sp.pay);
          sfx('cheer');
        }
        count(sp.id);
        play = null;
      }
      return;
    }
    case 'ride':
      if (ride) endRide();
      else if (!G.sit) startRide(sp);
      return;
    case 'feed': {
      if ((cool.get(sp.id) ?? 0) > now()) return void toast(sp.icon + ' …', 1.2);
      cool.set(sp.id, now() + sp.cd);
      const n = sp.pay[0] + Math.floor(Math.random() * (sp.pay[1] - sp.pay[0] + 1));
      toast(`${sp.icon} ❤️ ${n ? '✦ +' + n : ''}`);
      sfx(n ? 'buy' : 'ping');
      count(sp.id);
      if (n) pay(n);
      return;
    }
    case 'gacha': {
      if (broke(sp.fee)) return;
      S.cr -= sp.fee;
      const p = roll(sp.prizes);
      toast(p[1] ? `${nameOf(sp)}: ${p[0]} 당첨! ✦ +${p[1]}` : `${nameOf(sp)}: ${p[0]} 아쉽게도 꽝입니다`, 2.6);
      sfx(p[1] ? 'cheer' : 'deny');
      count(sp.id);
      pay(p[1]);
      return;
    }
    case 'food':
      if (broke(sp.fee)) return;
      S.cr -= sp.fee;
      G.stam = 100;
      G.tired = false;
      toast(`${eul(nameOf(sp))} 먹었습니다. 스태미나가 가득 찼습니다`);
      sfx('buy');
      count(sp.id);
      save();
      return;
    case 'sit':
      if (G.sit) return;
      G.sit = {x: sp.x, y: groundH(sp.x, sp.z) + 0.9, z: sp.z, ry: sp.ry ?? 0};
      toast(`${nameOf(sp)}에 앉았습니다`);
  }
}

export const funIt: Interactable<FunT> = {
  kind: 'fun',
  tier: 0,
  find(me) {
    if (G.inside || G.drive || G.match) return null;
    if (ride) return {kind: 'fun', d: 0.1, id: ride.sp.id};
    if (play) return {kind: 'fun', d: 0.1, id: play.sp.id};
    let best: FunT | null = null;
    for (const sp of FUN_SPOTS) {
      const d = dist2(me.pos, sp);
      if (d < reach(sp) && (!best || d < best.d)) best = {kind: 'fun', d, id: sp.id};
    }
    return best;
  },
  info: t => `<b>${spotById(t.id).icon} ${nameOf(spotById(t.id))}</b><br>${FUN_HELP[spotById(t.id).type]}`,
  prompt(t) {
    const sp = spotById(t.id);
    const nm = `${sp.icon} ${nameOf(sp)}`;
    if (sp.type === 'timing') return play && play.k === 'timing' ? `E 지금! (남은 ${play.left}회)` : `E ${nm} 시작${sp.fee ? ' ✦' + sp.fee : ''}`;
    if (sp.type === 'tap') return play && play.k === 'tap' ? `E 연타! ${play.n}/${sp.taps}` : `E ${nm}`;
    if (sp.type === 'ride') return ride ? 'E 내리기' : `E ${nm} 타기`;
    if (sp.type === 'gacha') return `E ${nm} 뽑기 ✦${sp.fee}`;
    if (sp.type === 'food') return `E ${nm} 사 먹기 ✦${sp.fee}`;
    if (sp.type === 'sit') return `E ${nm}에 앉기`;
    return `E ${nm}`;
  },
  off: t => {
    const sp = spotById(t.id);
    return sp.type === 'feed' && (cool.get(sp.id) ?? 0) > now();
  },
  act(t, key) {
    if (key === 'e') act(spotById(t.id));
  },
};

/** 진행 관리: 탑승 위치 갱신·종료, 멀어지면 게임 취소 */
export const funPlaySystem: GameSystem = {
  id: 'funplay',
  update(dt) {
    if (ride) {
      ride.s += dt;
      if (!G.sit || ride.s >= RIDE_DUR[ride.sp.ride] || G.drive || G.inside) endRide();
      else poseRide();
    }
    if (play && (dist2(G.me.pos, play.sp) > reach(play.sp) + 4 || G.inside || G.drive)) play = null;
  },
};

const BAR = 13;
addHudLine(() => {
  if (!play) return null;
  if (play.k === 'tap') return `${nameOf(play.sp)} 연타 ${'▰'.repeat(play.n)}${'▱'.repeat(play.sp.taps - play.n)}`;
  const sp = play.sp,
    cur = Math.round(meter() * (BAR - 1)),
    cells = Array.from({length: BAR}, (_, i) => (i === cur ? '🔸' : Math.abs(i / (BAR - 1) - 0.5) * 2 < sp.zone ? '🟩' : '⬜'));
  return `${nameOf(sp)} ${cells.join('')} 남은 ${play.left}회 · 성공 ${play.res.filter(r => r > 0).length}`;
});
