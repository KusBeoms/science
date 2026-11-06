// 건물 안으로 들어가기/나오기와 방 안 상호작용(상점 계산대·딜러·튜닝·차고·침대·의자). 방 생성은 render/interior.ts, 충돌은 core/terrain.ts setRoom.
import {G} from '../core/runtime.js';
import {nearbyExit} from '../core/exit-position.js';
import {groundH, setRoom} from '../core/terrain.js';
import {dist2} from '../core/util.js';
import {ENTERABLES, PURPOSE_INFO} from '../data/interiors.js';
import {buildRoom, type Room} from '../render/interior.js';
import {sitPose} from '../render/characters.js';
import {openShop} from './shop-ui.js';
import {openCarShop} from './car-shop.js';
import {openShop2} from './shops2.js';
import type {ShopPurpose} from '../data/shops2.js';
import {toast} from './hud.js';
import {rideLift} from './lift.js';
import {S} from '../core/state.js';
import type {GameSystem, Interactable, Target} from '../core/types.js';

let prevCam = 11;
let roomCollision: {rect: Room['rect']; solids: Room['solids']} | null = null;
let roomWallMaterial: any = null;
let flashEl: HTMLElement | null = null;
function disposeRoom(grp: any) {
  G.scene.remove(grp);
  const geometry = new Set<any>();
  grp.traverse((o: any) => o.geometry && geometry.add(o.geometry));
  geometry.forEach(g => g.dispose());
  // render/interior creates one private BackSide wall material; the other materials are shared.
  roomWallMaterial?.dispose();
  roomWallMaterial = null;
}
function flash() {
  if (!flashEl) {
    flashEl = document.createElement('div');
    flashEl.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:60;transition:opacity .35s';
    document.body.appendChild(flashEl);
  }
  flashEl.style.transition = 'none';
  flashEl.style.opacity = '0.85';
  requestAnimationFrame(() => {
    if (!flashEl) return;
    flashEl.style.transition = 'opacity .35s';
    flashEl.style.opacity = '0';
  });
}

export function enterBuilding(i: number) {
  if (G.inside || G.drive || !ENTERABLES[i]) return;
  const e = ENTERABLES[i],
    ret = {x: e.door.x, y: e.door.y ?? groundH(e.door.x, e.door.z, G.me.pos.y), z: e.door.z},
    room: Room = buildRoom(e);
  roomWallMaterial = room.grp.children.find((o: any) => o.material?.side === THREE.BackSide)?.material;
  G.scene.add(room.grp);
  setRoom(roomCollision = {rect: room.rect, solids: room.solids});
  G.inside = {i, grp: room.grp, spots: room.spots, ret};
  G.sit = null;
  G.me.pos.set(room.spawn.x, 0, room.spawn.z);
  G.me.vy = 0;
  G.yaw = 0;
  G.pitch = 1.0;
  prevCam = G.camDist;
  G.camDist = 8;
  flash();
  if (S.props[e.id]) toast('내 건물입니다');
}
/** force is reserved for callers that immediately relocate the player (taxi/rescue). */
export function leaveBuilding(force = false): boolean {
  const ins = G.inside;
  if (!ins) return false;
  // Inspect outdoor collisions before destroying the room. A parked vehicle may now occupy its door.
  setRoom(null);
  const exit = nearbyExit(ins.ret);
  if (!exit && !force) {
    setRoom(roomCollision);
    toast('문 앞이 막혀 있습니다. 잠시 후 다시 나가세요');
    return false;
  }
  disposeRoom(ins.grp);
  setRoom(null);
  G.inside = null;
  roomCollision = null;
  G.target = null;
  G.pickOv = null;
  G.camDist = prevCam;
  G.pitch = 0.45;
  G.sit = null;
  const out = exit || ins.ret;
  G.me.pos.set(out.x, out.y, out.z);
  G.me.visible = true;
  G.me.vy = 0;
  flash();
  return true;
}

interface EnterT extends Target {
  kind: 'enter';
  i: number;
}
export const enterIt: Interactable<EnterT> = {
  kind: 'enter',
  tier: 0,
  find(me) {
    if (G.inside || G.drive) return null;
    let best = -1,
      bd = 3.4;
    ENTERABLES.forEach((e, i) => {
      if (e.door.y !== undefined && Math.abs(me.pos.y - e.door.y) > 1.6) return;
      const d = dist2(me.pos, e.door);
      if (d < bd) [best, bd] = [i, d];
    });
    return best < 0 ? null : {kind: 'enter', d: bd, i: best};
  },
  info: t => `<b>${PURPOSE_INFO[ENTERABLES[t.i].purpose].icon} ${PURPOSE_INFO[ENTERABLES[t.i].purpose].name}</b>`,
  prompt: t => `E 들어가기 (${PURPOSE_INFO[ENTERABLES[t.i].purpose].name})`,
  act(t, key) {
    if (key === 'e') enterBuilding(t.i);
  },
};

/** 방 안 가구 효과: 쉬기·간식(스태미나)·코인(소액)·관람/독서(도감 기록 없이 이모지)·노래·운동(잠시 빨라짐)·볼링·수영·치료 */
let buffT = 0,
  useCd: Record<string, number> = {};
export const interiorBuff = () => (buffT > 0 ? 1.15 : 1);
export const giveBuff = (sec: number) => (buffT = Math.max(buffT, sec));
function useFx(fx: string, icon: string) {
  if (fx === 'lift') return rideLift(icon, 30 + (Math.floor(G.gameT) % 25)); // W6 DOWNTOWN: 엘리베이터 연출(쿨다운 없음)
  const now = G.gameT;
  if ((useCd[icon + fx] || 0) > now) return toast('잠시 뒤에 다시 이용하세요');
  useCd[icon + fx] = now + 20;
  switch (fx) {
    case 'snack': G.stam = Math.min(100, G.stam + 50); toast('맛있게 먹었습니다. 스태미나 +50'); break;
    case 'heal': G.stam = 100; G.tired = false; toast('컨디션이 회복되었습니다'); break;
    case 'coin': S.cr += 8; toast('코인 ✦ +8을 얻었습니다'); break;
    case 'bowl': { const pins = 3 + Math.floor(Math.random() * 8); S.cr += pins; toast(`핀 ${pins}개를 쓰러뜨렸습니다. ✦ +${pins}`); break; }
    case 'train': buffT = 60; toast(`${icon} 운동 완료 — 60초간 빨라진다`); break;
    case 'sing': toast('신나게 노래했습니다'); break;
    case 'swim': G.stam = 100; toast('수영으로 상쾌해졌습니다. 스태미나 회복'); break;
    default: toast('잠시 즐겼습니다');
  }
}
interface RoomT extends Target {
  kind: 'room';
  s: number;
}
const PROMPT: Record<string, string> = {
  exit: 'E 나가기', shop: 'E 둘러보기', dealer: 'E 차량 구매', tuning: 'E 튜닝·개조', garage: 'E 차고·등록',
  shop2: 'E 쇼핑하기', bed: 'E 쉬기', seat: 'E 앉기', tv: 'E TV 보기', use: 'E 이용하기',
};
export const roomIt: Interactable<RoomT> = {
  kind: 'room',
  tier: 0,
  find(me) {
    const ins = G.inside;
    if (!ins || G.sit) return null;
    let best = -1,
      bd = 2.6;
    ins.spots.forEach((s, i) => {
      const d = dist2(me.pos, s);
      if (d < bd) [best, bd] = [i, d];
    });
    return best < 0 ? null : {kind: 'room', d: bd, s: best};
  },
  info: t => `<b>${G.inside!.spots[t.s].icon || PROMPT[G.inside!.spots[t.s].kind].slice(2)}</b>`,
  prompt: t => (G.inside!.spots[t.s].kind === 'use' ? `E 이용하기 ${G.inside!.spots[t.s].icon}` : PROMPT[G.inside!.spots[t.s].kind]),
  act(t, key) {
    if (key !== 'e' || !G.inside) return;
    const sp = G.inside.spots[t.s];
    switch (sp.kind) {
      case 'exit': return leaveBuilding();
      case 'shop': return openShop();
      case 'shop2': return openShop2(sp.fx as ShopPurpose);
      case 'dealer': return openCarShop('buy');
      case 'tuning': return openCarShop('tune');
      case 'garage': return openCarShop('garage');
      case 'bed':
        G.stam = 100;
        G.tired = false;
        return toast('충분히 쉬었습니다. 스태미나 회복');
      case 'seat':
        G.sit = {x: sp.x, y: 0.9, z: sp.z, ry: sp.ry ?? 0};
        return;
      case 'tv': return toast('우주 방송이 나옵니다');
      case 'use': return useFx(sp.fx!, sp.icon!);
    }
  },
};
void sitPose;

/** 방 밖으로 순간이동(리스폰 등)하면 방을 정리한다 */
export const interiorSystem: GameSystem = {
  id: 'interior',
  speedMul: () => interiorBuff(),
  update(dt) {
    if (buffT > 0) buffT -= dt;
    const ins = G.inside;
    if (!ins) return;
    if (Math.abs(G.me.pos.x - 1500) > 40 || Math.abs(G.me.pos.z - 1500) > 40) {
      disposeRoom(ins.grp);
      setRoom(null);
      G.inside = null;
      roomCollision = null;
      G.sit = null;
      G.target = null;
      G.camDist = prevCam;
    }
  },
};
