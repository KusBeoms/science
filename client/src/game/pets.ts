// 펫: 펫샵에서 사서 함께 다니는 동행 동물. 소유 S.own['pet:<id>'], 함께 다니는 펫 = S.coins.pet(PETS 인덱스+1, 0 = 없음).
// 기존 야생 동물 쓰다듬기(systems/wildlife.ts)와 같은 방식으로 펫에게 E 를 누르면 쓰다듬는다(S.coins.pets 카운터 공유).
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {groundH} from '../core/terrain.js';
import {dist2, eul} from '../core/util.js';
import {PETS, priceTag, type PetType} from '../data/shops2.js';
import {buildPet} from '../render/pets.js';
import {toast} from './hud.js';
import {big, card, commit, crHead, openPanel, pay} from './shops2-ui.js';
import {addSold, stockLeft} from './shops2.js';
import {fmt} from '../core/util.js';
import {sfx} from '../audio/index.js';
import type {GameSystem, Interactable, Target} from '../core/types.js';

let mesh: any = null,
  shown = '',
  bob = 0,
  cheer = 0;
const pos = {x: 0, z: 0, ry: 0};
export const activePet = (): PetType | undefined => PETS[(S.coins.pet || 0) - 1];
function show() {
  const a = activePet();
  if (shown === (a?.id || '')) return;
  if (mesh) {
    G.scene.remove(mesh);
    mesh.traverse((o: any) => o.geometry && o.geometry.dispose());
    mesh = null;
  }
  shown = a?.id || '';
  if (a) {
    mesh = buildPet(a);
    G.scene.add(mesh);
    pos.x = G.me.pos.x - 2;
    pos.z = G.me.pos.z - 2;
  }
}
export function setPet(id: string) {
  S.coins.pet = Math.max(0, PETS.findIndex(p => p.id === id) + 1);
  show();
}
interface PetT extends Target {
  kind: 'pet';
}
export const petIt: Interactable<PetT> = {
  kind: 'pet',
  tier: 0,
  find(me) {
    return mesh && mesh.visible && !G.inside && !G.drive && dist2(me.pos, pos) < 2.6 ? {kind: 'pet', d: dist2(me.pos, pos)} : null;
  },
  info: () => `<b>${activePet()?.icon || '🐾'}</b>`,
  prompt: () => `E 쓰다듬기 ${activePet()?.icon || '🐾'}`,
  act(_t, key) {
    if (key !== 'e' || cheer > 0) return;
    cheer = 1.4;
    S.coins.pets = ((S.coins.pets as number) || 0) + 1;
    toast(`${activePet()!.icon} ❤️💗`);
    sfx('buy');
  },
};

export const petsSystem: GameSystem = {
  id: 'pets',
  onLoad: () => show(),
  update(dt) {
    if (!G.me) return;
    show();
    if (!mesh) return;
    const hide = !!(G.inside || G.drive || G.match);
    mesh.visible = !hide;
    if (hide) return;
    const m = G.me.pos,
      d = Math.hypot(m.x - pos.x, m.z - pos.z);
    if (d > 40) [pos.x, pos.z] = [m.x - 2, m.z - 2];
    else if (d > 2.4) {
      const sp = Math.min(d - 2.2, 16 * dt + 0.2),
        k = sp / d;
      pos.x += (m.x - pos.x) * k;
      pos.z += (m.z - pos.z) * k;
      pos.ry = Math.atan2(m.x - pos.x, m.z - pos.z);
      bob += dt * 14;
    } else bob += dt * 3;
    cheer = Math.max(0, cheer - dt);
    const h = groundH(pos.x, pos.z);
    mesh.position.set(pos.x, (h > -Infinity ? h : m.y) + Math.abs(Math.sin(bob)) * (d > 2.4 ? 0.22 : 0.04) + (cheer > 0 ? Math.abs(Math.sin(cheer * 9)) * 0.5 : 0), pos.z);
    mesh.rotation.y = pos.ry;
  },
};

export function openPetShop() {
  const pan = openPanel();
  const draw = () => {
    pan.title.innerHTML = crHead('🐾');
    pan.grid.innerHTML = '';
    pan.hint.textContent = '오늘의 특가 −25% · 지금 세일 −10% · 일부는 하루 한정입니다';
    PETS.forEach((p, i) => {
      const have = !!S.own['pet:' + p.id],
        on = activePet()?.id === p.id,
        left = p.ltd ? stockLeft('pet-' + p.id, p.ltd) : 99,
        pt = priceTag('petshop', PETS.length, i, p.price),
        dead = !have && left <= 0;
      pan.grid.appendChild(
        card(
          `${pt.tag && !have ? `<i class="tag">${pt.tag}</i>` : ''}${big(p.icon)}<b>${p.name}</b>${p.ltd && !have ? `<span>남은 수량 ${left}</span>` : ''}<em>${on ? '함께 다니는 중' : have ? '데려가기' : dead ? '매진' : '✦ ' + fmt(pt.price)}</em>`,
          () => {
            if (dead || (!have && p.ltd && stockLeft('pet-' + p.id, p.ltd) <= 0)) return;
            if (!have) {
              if (!pay(pt.price)) return;
              if (p.ltd) addSold('pet-' + p.id);
              S.own['pet:' + p.id] = 1;
              toast(`${eul(p.name)} 데려왔습니다`);
            }
            setPet(on && have ? '' : p.id);
            commit();
            draw();
          },
          on ? 'eq' : have ? 'own' : dead || S.cr < pt.price ? 'locked' : ''
        )
      );
    });
  };
  draw();
}
