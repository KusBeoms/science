// 탈것(킥보드·자전거·산악·전기·외발·오토바이) 타기: V 키 / 🚲 버튼으로 타고 내리기. 타면 걷기 속도 × mul, 점프는 그대로, 건물·차·경기에 들어가면 자동으로 내린다.
// 소유 = S.vehicles['r:<id>'], 마지막으로 고른 탈것 = S.vehicles.sel (RIDES 인덱스+1). 모델은 render/rides.ts.
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {RIDES, rideOf, type Ride} from '../data/shops2.js';
import {buildRide, type RideModel} from '../render/rides.js';
import {animateWalk} from '../render/characters.js';
import {toast} from './hud.js';
import type {GameSystem} from '../core/types.js';
import {eul} from '../core/util.js';
import {vehicleTransitionActive} from '../systems/vehicle-transition.js';

let cur: Ride | null = null,
  model: RideModel | null = null,
  phase = 0,
  lx = 0,
  lz = 0,
  btn: HTMLElement | null = null;
export const ownsRide = (id: string) => !!S.vehicles['r:' + id];
export const ownedRides = () => RIDES.filter(r => ownsRide(r.id));
export const currentRide = () => cur;
export const selectedRide = (): Ride | undefined => RIDES[(S.vehicles.sel || 0) - 1] && ownsRide(RIDES[S.vehicles.sel - 1].id) ? RIDES[S.vehicles.sel - 1] : ownedRides().sort((a, b) => b.mul - a.mul)[0];
const blocked = () => !!(G.inside || G.drive || G.match || G.sit || G.modal || G.cine || vehicleTransitionActive());

export function mountRide(id: string): boolean {
  const r = rideOf(id);
  if (!r || !ownsRide(id) || blocked()) return false;
  dismount();
  S.vehicles.sel = RIDES.indexOf(r) + 1;
  cur = r;
  model = buildRide(r.id, r.color);
  G.scene.add(model.grp);
  lx = G.me.pos.x;
  lz = G.me.pos.z;
  toast(`${eul(r.name)} 탔습니다. 속도 ×${r.mul}`);
  return true;
}
export function dismount() {
  if (!cur) return;
  if (model) {
    G.scene.remove(model.grp);
    model.grp.traverse((o: any) => o.geometry && o.geometry.dispose());
  }
  cur = model = null;
  animateWalk(G.me, 0, false);
}
export function toggleRide() {
  if (cur) return dismount();
  const r = selectedRide();
  if (r) mountRide(r.id);
  else toast('탈 것이 없습니다. 자전거 샵에서 사세요');
}
function pose(dt: number, speed: number) {
  const p = G.me.userData,
    moving = speed > 0.5;
  phase += speed * dt * (cur!.id === 'moto' ? 0 : 1.9);
  const s = Math.sin(phase) * (moving ? 1 : 0);
  switch (cur!.id) {
    case 'moto': p.legL.rotation.x = p.legR.rotation.x = -1.25; p.armL.rotation.x = p.armR.rotation.x = -1.0; break;
    case 'scooter': p.legL.rotation.x = 0.1; p.legR.rotation.x = moving ? 0.5 + s * 0.4 : 0.15; p.armL.rotation.x = p.armR.rotation.x = -0.9; break;
    case 'unicycle': p.legL.rotation.x = -0.7 + s * 0.6; p.legR.rotation.x = -0.7 - s * 0.6; p.armL.rotation.x = -0.6 + Math.sin(phase * 0.5) * 0.9; p.armR.rotation.x = -0.6 - Math.sin(phase * 0.5) * 0.9; break;
    default: p.legL.rotation.x = -0.75 + s * 0.45; p.legR.rotation.x = -0.75 - s * 0.45; p.armL.rotation.x = p.armR.rotation.x = -1.1;
  }
}
function ensureBtn() {
  if (btn || !ownedRides().length) return;
  btn = document.createElement('button');
  btn.id = 'ridebtn';
  btn.title = '탈것 타기/내리기 (V)';
  btn.style.cssText = 'position:fixed;right:14px;bottom:210px;z-index:19;width:48px;height:48px;border-radius:50%;font-size:24px;border:2px solid #fff6;background:#0b1230cc;color:#fff;cursor:pointer';
  btn.onclick = () => toggleRide();
  document.body.appendChild(btn);
}
addEventListener('keydown', e => {
  if (e.code === 'KeyV' && !e.repeat && !e.ctrlKey && !e.metaKey) toggleRide();
});

export const ridesSystem: GameSystem = {
  id: 'rides',
  speedMul: () => (cur ? cur.mul : 1),
  hud: () => (cur ? `${cur.icon} 타는 중 (V로 내리기)` : null),
  update(dt) {
    ensureBtn();
    if (btn) btn.textContent = cur ? cur.icon : selectedRide()?.icon || '🚲';
    if (!cur || !model) return;
    if (blocked() && !G.modal) return dismount();
    const m = G.me;
    const dist = Math.hypot(m.pos.x - lx, m.pos.z - lz);
    [lx, lz] = [m.pos.x, m.pos.z];
    model.grp.position.copy(m.position);
    model.grp.rotation.y = m.rotation.y;
    model.wheels.forEach(w => (w.pivot.rotation.x += dist / w.r));
    pose(dt, dt > 0 ? dist / dt : 0);
  },
};
