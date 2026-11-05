// 야생지 시스템: 풍차·간수 애니메이션, 산 정상 도전(깃발 E, 처음 오르면 보상), 물에 들어가면 느려짐.
import {S, save} from '../core/state.js';
import {G} from '../core/runtime.js';
import {dist2} from '../core/util.js';
import {SUMMIT} from '../data/wild.js';
import {waterAt} from '../core/water.js';
import {ripple, rippleUpdate, splashAt, splashUpdate} from '../render/water-fx.js';
import {wildUpdate} from '../render/wild.js';
import {toast} from '../game/hud.js';
import {sfx} from '../audio/index.js';
import type {GameSystem, Interactable, Target} from '../core/types.js';

/** 물 상태: 0 = 뭍, 1 = 걸어서 건넘(수심 0.4~1.3), 2 = 헤엄(수심 1.3+) — 빠져 죽지 않는다 */
let wet = 0,
  rippleT = 0,
  swimK = 0;
const WADE = 0.4,
  SWIM = 1.3;
function swim(dt: number) {
  const me = G.me;
  if (!me || G.drive || G.inside) {
    if (swimK && me) me.rotation.x = swimK = 0;
    wet = 0;
    return;
  }
  const w = waterAt(me.pos.x, me.pos.z),
    d = w ? w.depth : 0,
    // 점프로 수면 위에 떠 있으면(발이 수면보다 한참 위) 물 판정 무시
    inWater = !!w && me.pos.y < w.y - 0.15,
    state = inWater && d > SWIM ? 2 : inWater && d > WADE ? 1 : 0;
  if (state && !wet) {
    sfx('splash'); // 입수: 물보라 + 큰 파문
    splashAt(me.pos.x, w!.y, me.pos.z);
    ripple(me.pos.x, w!.y, me.pos.z, true);
  }
  wet = state;
  if (state === 2) {
    // 수면에 떠서 헤엄: 몸을 앞으로 눕히고 출렁인다
    const ty = w!.y - 0.45 + Math.sin(performance.now() / 420) * 0.05;
    me.pos.y += (ty - me.pos.y) * Math.min(1, dt * 12);
    me.vy = 0;
  }
  if (state === 1 && me.vy < 0 && me.pos.y < w!.y - 0.1) me.vy *= 0.5;
  const want = state === 2 ? 1.05 : 0;
  swimK += (want - swimK) * Math.min(1, dt * 8);
  if (Math.abs(swimK) < 0.01) swimK = 0;
  me.rotation.order = 'YXZ';
  me.rotation.x = swimK;
  const moving = G.keys.KeyW || G.keys.KeyA || G.keys.KeyS || G.keys.KeyD || G.keys.ArrowUp || G.keys.ArrowDown || G.keys.ArrowLeft || G.keys.ArrowRight;
  if (state && moving && (rippleT -= dt) <= 0) {
    rippleT = state === 2 ? 0.4 : 0.3;
    ripple(me.pos.x, w!.y, me.pos.z);
  }
}
export const wildSystem: GameSystem = {
  id: 'wild',
  update(dt, raw) {
    if (G.me && G.me.pos.z > 650) wildUpdate(raw);
    swim(dt);
    rippleUpdate(raw);
    splashUpdate(raw);
  },
  /** 물속은 천천히: 허리 깊이까지 ×0.75, 헤엄 ×0.55 (호수·바다 모두, 수면 높이는 호수 level 기준) */
  speedMul: () => (wet === 2 ? 0.55 : wet === 1 ? 0.75 : 1),
};
interface SummitT extends Target {
  kind: 'summit';
}
export const summitIt: Interactable<SummitT> = {
  kind: 'summit',
  tier: 0,
  find(me) {
    if (G.inside || G.drive) return null;
    const d = dist2(me.pos, SUMMIT);
    return d < 6 ? {kind: 'summit', d} : null;
  },
  info: () => '<b>정상</b>',
  prompt: () => 'E 정상 인증하기',
  act(_t, key) {
    if (key !== 'e') return;
    if (S.coins.summit) return toast('이미 정복한 정상입니다');
    S.coins.summit = 1;
    S.cr += 600;
    toast('정상에 올랐습니다. ✦ +600', 3.5);
    sfx('buy');
    save();
  },
};
