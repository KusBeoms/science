// 환경 요소 시스템 (레지스트리 모범 사례): 섹터 안내문(onSectorEnter), 중력·시간 배율, 혜성(update)
import {S, save, income} from '../core/state.js';
import {G} from '../core/runtime.js';
import {clamp, fmt, rnd, setTxt} from '../core/util.js';
import {cap} from '../core/state.js';
import {inBase} from '../core/geometry.js';
import {P} from '../data/planets.js';
import {H, SECTORS} from '../data/sectors.js';
import {freeTree} from '../render/textures.js';
import {toast} from '../game/hud.js';
import type {GameSystem} from '../core/types.js';

const cur = () => (G.curZone >= 0 ? SECTORS[G.curZone] : null);
/** 현재 섹터의 시간 배율 (기지 성장·수익이 이만큼 빨리 흐른다) */
export const timeNow = () => cur()?.timeMul ?? 1;
export const gravityNow = () =>
  (G.carry.length ? clamp(Math.max(...G.carry.map(c => P[c.id].g)), 0.6, 2.2) : 1) * (cur()?.gravityMul ?? 1);
function hazards(dt: number) {
  const carry = G.carry,
    me = G.me;
  const tag = [],
    tm = timeNow();
  if (tm !== 1) tag.push(`⏳ 시간 ×${tm}`);
  const gE = gravityNow();
  if (Math.abs(gE - 1) > 0.02) tag.push(`중력 ${gE.toFixed(2)}g`);
  if (G.night > 0) tag.push('🌙 밤 — 성장 ×30');
  setTxt('#tag', tag.join(' · '));
  setTxt(
    '#carryTag',
    carry.length ? `✋ ${carry.map(c => P[c.id].name).join(', ')} (${carry.length}/${cap()}) — 기지로!` : ''
  );
  if (!G.comet) {
    if (inBase(me.pos.x, me.pos.z) && !carry.length && (G.cometT -= dt) <= 0) {
      G.cometT = rnd(60, 90);
      spawnComet();
    }
  } else {
    G.comet.g.position.x += 11 * dt;
    if (Math.hypot(me.pos.x - G.comet.g.position.x, me.pos.z - G.comet.z) < 3) {
      const b = income() * 40;
      S.cr += b;
      toast(`☄ 혜성 포획! +${fmt(b)} · 핼리 혜성은 약 76년마다 온다`, 3.5);
      G.scene.remove(G.comet.g);
      freeTree(G.comet.g);
      G.comet = null;
    } else if (G.comet.g.position.x > H + 8) {
      G.scene.remove(G.comet.g);
      freeTree(G.comet.g);
      G.comet = null;
    }
  }
}
function spawnComet() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({color: 0xcff6ff})));
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 8, 12),
    new THREE.MeshBasicMaterial({color: 0x7cc4ff, transparent: true, opacity: 0.55})
  );
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -4.5;
  g.add(tail);
  const z = rnd(-6, 14);
  g.position.set(-H - 6, 2.4, z);
  G.scene.add(g);
  G.comet = {g, z};
  toast('☄ 혜성 출현! 닿으면 포획');
}
export const hazardSystem: GameSystem = {
  id: 'hazards',
  update: hazards,
  onSectorEnter(s) {
    if (S.notes[s.id]) return;
    S.notes[s.id] = 1;
    toast(s.note, 4.5);
    save();
  },
};
