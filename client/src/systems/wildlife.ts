// 야생지 동물(소·토끼·사슴·낙타·오리)과 낚시. 동물은 상자 모델로 구역 안을 어슬렁거리고, 토끼·사슴은 다가가면 도망친다. 소·낙타·오리는 E 로 쓰다듬는다.
// 낚시: 호수/해변 물가에서 E → 찌 던지기 → 입질(❗) 순간에 E → 물고기. 잡은 수는 S.coins['fish:*'] 에 저장.
import {animalModel} from '../render/animals.js';
import {S, save} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {dist2, eul} from '../core/util.js';
import {groundH, solidAt} from '../core/terrain.js';
import {COUNTRY, DESERT, LAKES, MOUNTAIN} from '../data/wild.js';
import {waterAt} from '../core/water.js';
import {PAL} from '../render/lowpoly/palette.js';
import {box} from '../render/lowpoly/prim.js';
import {lowMat, mergePlaced, type Placed} from '../render/lowpoly/merge.js';
import {mulberry32} from '../render/lowpoly/rng.js';
import {toast} from '../game/hud.js';
import {sfx} from '../audio/index.js';
import type {GameSystem, Interactable, Target} from '../core/types.js';

type Kind = 'cow' | 'rabbit' | 'deer' | 'camel' | 'duck';
interface Animal {
  kind: Kind;
  m: any;
  x: number;
  z: number;
  tx: number;
  tz: number;
  wait: number;
  ry: number;
  home: {x: number; z: number; r: number};
  flee: number;
  pet: number;
}
const INFO: Record<Kind, {icon: string; speed: number; fleeR: number; pettable: boolean; sound: string}> = {
  cow: {icon: '🐮', speed: 1.6, fleeR: 0, pettable: true, sound: 'moo'},
  rabbit: {icon: '🐇', speed: 3, fleeR: 11, pettable: false, sound: ''},
  deer: {icon: '🦌', speed: 4, fleeR: 17, pettable: false, sound: ''},
  camel: {icon: '🐫', speed: 1.8, fleeR: 0, pettable: true, sound: 'moo'},
  duck: {icon: '🦆', speed: 1.2, fleeR: 0, pettable: true, sound: 'splash'},
};
const animals: Animal[] = [];
export const animalCount = () => animals.length;
let built = false;
function spawn(kind: Kind, x: number, z: number, r: number) {
  const m = animalModel(kind);
  const y = kind === 'duck' ? (waterAt(x, z)?.y ?? groundH(x, z)) : Math.max(groundH(x, z), -99);
  m.position.set(x, y, z);
  G.scene.add(m);
  animals.push({kind, m, x, z, tx: x, tz: z, wait: Math.random() * 3, ry: Math.random() * 6, home: {x, z, r}, flee: 0, pet: 0});
}
function build() {
  built = true;
  const rnd = mulberry32(88);
  const [cx0, cz0, cx1, cz1] = COUNTRY;
  for (let k = 0; k < 14; k++) spawn('cow', cx0 + 20 + rnd() * (cx1 - cx0 - 40), cz0 + 20 + rnd() * (cz1 - cz0 - 40), 22);
  for (let k = 0; k < 16; k++) spawn('rabbit', -40 + rnd() * 120, 880 + rnd() * 60, 40);
  for (let k = 0; k < 9; k++) {
    const a = rnd() * 6.28;
    spawn('deer', MOUNTAIN.x + 20 + Math.cos(a) * 150, MOUNTAIN.z + 150 + Math.sin(a) * 120, 50);
  }
  for (let k = 0; k < 8; k++) spawn('camel', DESERT.x0 + 120 + rnd() * 150, DESERT.z0 + 50 + rnd() * 60, 30); // 모래 반도(가지) 위
  for (const L of LAKES) for (let k = 0; k < (L.r > 100 ? 9 : 4); k++) spawn('duck', L.x + (rnd() - 0.5) * L.r, L.z + (rnd() - 0.5) * L.r, L.r * 0.4);
}
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------- 낚시 ----------
type Fishing = {phase: 'wait' | 'bite'; t: number; x: number; z: number; y: number; bob: any};
let fishing: Fishing | null = null;
const FISH = [
  {icon: '🐟', p: 0.58, v: 20, id: 'fish'},
  {icon: '🐠', p: 0.24, v: 60, id: 'tropical'},
  {icon: '🐡', p: 0.1, v: 150, id: 'puffer'},
  {icon: '🦈', p: 0.07, v: 400, id: 'shark'},
  {icon: '👢', p: 0.01, v: 1, id: 'boot'},
];
const FISHNAME: Record<string, string> = {fish: '물고기', tropical: '열대어', puffer: '복어', shark: '상어', boot: '낡은 장화'};
function waterAhead(): {x: number; z: number; y: number} | null {
  const h = G.me.rotation.y;
  for (let d = 3; d <= 8; d += 1) {
    const x = G.me.pos.x + Math.sin(h) * d,
      z = G.me.pos.z + Math.cos(h) * d,
      g = groundH(x, z),
      w = waterAt(x, z); // 호수(수면 level 은 호수마다 다름)·바다 모두
    if (w && w.depth > 0.6) return {x, z, y: w.y};
    if (g === -Infinity && z > 340) return {x, z, y: -4.6}; // 바다(땅 밖)
  }
  return null;
}
const stopFishing = () => {
  if (fishing) G.scene.remove(fishing.bob);
  fishing = null;
};

export const wildlifeSystem: GameSystem = {
  id: 'wildlife',
  update(dt, raw) {
    if (!G.me || G.me.pos.z < 650) {
      if (fishing && G.me.pos.z < 330) stopFishing();
      if (G.me.pos.z < 330) return;
    }
    if (!built && G.me.pos.z > 600) build();
    if (paused()) return;
    for (const a of animals) {
      const info = INFO[a.kind],
        dm = Math.hypot(G.me.pos.x - a.x, G.me.pos.z - a.z);
      if (dm > 170) continue;
      let spd = 0;
      if (info.fleeR && dm < info.fleeR) {
        const dx = a.x - G.me.pos.x,
          dz = a.z - G.me.pos.z;
        a.tx = a.x + (dx / (dm || 1)) * 14;
        a.tz = a.z + (dz / (dm || 1)) * 14;
        a.wait = 0;
        spd = info.speed * 2.6;
      } else if (a.wait > 0) a.wait -= dt;
      else {
        const dx = a.tx - a.x,
          dz = a.tz - a.z,
          d = Math.hypot(dx, dz);
        if (d < 0.6) {
          a.wait = 1 + Math.random() * 5;
          const ang = Math.random() * 6.28,
            r = Math.random() * a.home.r;
          a.tx = a.home.x + Math.cos(ang) * r;
          a.tz = a.home.z + Math.sin(ang) * r;
        } else spd = info.speed;
      }
      if (spd) {
        const dx = a.tx - a.x,
          dz = a.tz - a.z,
          d = Math.hypot(dx, dz) || 1,
          nx = a.x + (dx / d) * spd * dt,
          nz = a.z + (dz / d) * spd * dt,
          g = groundH(nx, nz);
        const wn = waterAt(nx, nz),
          waterOK = a.kind === 'duck' ? !!wn && wn.depth > 0.4 : !wn || wn.depth < 0.3;
        if (g > -Infinity && waterOK && !solidAt(nx, nz, 0.8)) {
          a.x = nx;
          a.z = nz;
        } else a.wait = 0.5;
        a.ry += wrapA(Math.atan2(dx, dz) - a.ry) * Math.min(1, dt * 6);
      }
      const gy = a.kind === 'duck' ? (waterAt(a.x, a.z)?.y ?? -4.6) + 0.05 : Math.max(groundH(a.x, a.z), -50);
      a.m.position.set(a.x, gy + (spd ? Math.abs(Math.sin(performance.now() / 120 + a.x)) * 0.25 : 0), a.z);
      a.m.rotation.y = a.ry;
      if (a.pet > 0) a.pet -= dt;
    }
    // 낚시
    if (fishing) {
      const f = fishing;
      if (G.keys.KeyW || G.keys.KeyA || G.keys.KeyS || G.keys.KeyD || G.keys.ArrowUp || G.keys.ArrowDown) stopFishing();
      else {
        f.bob.position.y = f.y + 0.15 + Math.sin(performance.now() / 300) * 0.08 + (f.phase === 'bite' ? Math.abs(Math.sin(performance.now() / 60)) * 0.4 : 0);
        if ((f.t -= dt) <= 0) {
          if (f.phase === 'wait') {
            f.phase = 'bite';
            f.t = 1.4;
            sfx('bite');
            toast('입질이 왔습니다. E 키로 낚으세요', 1.4);
          } else {
            toast('물고기를 놓쳤습니다');
            stopFishing();
          }
        }
      }
    }
    void raw;
  },
};

interface AnimalT extends Target {
  kind: 'animal';
  a: Animal;
}
export const animalIt: Interactable<AnimalT> = {
  kind: 'animal',
  tier: 0,
  find(me) {
    if (G.inside || G.drive) return null;
    let best: Animal | null = null,
      bd = 3.4;
    for (const a of animals) {
      if (!INFO[a.kind].pettable) continue;
      const d = dist2(me.pos, a);
      if (d < bd) [best, bd] = [a, d];
    }
    return best ? {kind: 'animal', d: bd, a: best} : null;
  },
  info: t => `<b>${INFO[t.a.kind].icon}</b>`,
  prompt: t => `E ${INFO[t.a.kind].icon} 쓰다듬기`,
  act(t, key) {
    if (key !== 'e' || t.a.pet > 0) return;
    t.a.pet = 1.2;
    t.a.wait = 2;
    toast(`${INFO[t.a.kind].icon} ❤️`);
    if (INFO[t.a.kind].sound) sfx(INFO[t.a.kind].sound as 'moo');
    S.coins.pets = ((S.coins.pets as number) || 0) + 1;
  },
};
interface FishT extends Target {
  kind: 'fish';
}
export const fishIt: Interactable<FishT> = {
  kind: 'fish',
  tier: 0,
  find() {
    if (G.inside || G.drive || G.me.pos.z < 330) return null;
    if (fishing) return {kind: 'fish', d: 0.5};
    return waterAhead() ? {kind: 'fish', d: 3} : null;
  },
  info: () => '<b>낚시</b>',
  prompt: () => (!fishing ? 'E 낚시하기' : fishing.phase === 'bite' ? 'E 지금 낚기' : 'E 입질을 기다리는 중'),
  act(_t, key) {
    if (key !== 'e') return;
    if (!fishing) {
      const w = waterAhead();
      if (!w) return;
      const bob = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({color: 0xe5483f}));
      bob.position.set(w.x, w.y + 0.15, w.z);
      G.scene.add(bob);
      fishing = {phase: 'wait', t: 3 + Math.random() * 5, x: w.x, z: w.z, y: w.y, bob};
      sfx('splash');
      toast('찌를 던졌습니다. 입질을 기다리세요');
      return;
    }
    if (fishing.phase === 'bite') {
      let r = Math.random(),
        f = FISH[0];
      for (const q of FISH) if ((r -= q.p) < 0) { f = q; break; }
      S.cr += f.v;
      S.coins['fish:' + f.id] = ((S.coins['fish:' + f.id] as number) || 0) + 1;
      toast(`${f.icon} ${eul(FISHNAME[f.id] || f.id)} 낚았습니다. ✦ +${f.v}`, 2.5);
      sfx('buy');
      save();
      stopFishing();
    } else {
      toast('아직 입질이 없습니다');
    }
  },
};
