// 환경 요소: 구역 안내문, 중력, 혜성
import {S, save, income} from '../core/state.js';
import {G} from '../core/runtime.js';
import {clamp, fmt, rnd, setTxt} from '../core/util.js';
import {cap} from '../core/state.js';
import {inTile} from '../core/geometry.js';
import {P} from '../data/planets.js';
import {H} from '../data/zones.js';
import {freeTree} from '../render/textures.js';
import {toast} from '../game/hud.js';

const NOTES = [
  '🌍 대기가 없는 곳이 많다 — 낮밤 온도 차가 크다',
  '⭐ 쌍성·적색왜성 — 별마다 환경이 다르다',
  '⏳ 블랙홀 근처는 시간이 느리다 — 여기 있는 동안 기지가 ×3 빠르게 흐른다',
  '🪐 판도라 중력 0.8g — 더 높이 뛴다',
];
export const gravityNow = () =>
  (G.carry.length ? clamp(Math.max(...G.carry.map(c => P[c.id].g)), 0.6, 2.2) : 1) * (G.curZone === 3 ? 0.8 : 1);
export function hazards(dt: number) {
  const carry = G.carry,
    me = G.me;
  if (G.curZone !== G.lastZone) {
    if (G.curZone >= 0 && !S.notes[G.curZone]) {
      S.notes[G.curZone] = 1;
      toast(NOTES[G.curZone], 4.5);
      save();
    }
    G.lastZone = G.curZone;
  }
  const tag = [];
  if (G.curZone === 2) tag.push('⏳ 시간 ×3');
  const gE = gravityNow();
  if (Math.abs(gE - 1) > 0.02) tag.push(`중력 ${gE.toFixed(2)}g`);
  if (G.night > 0) tag.push('🌙 밤 — 성장 ×30');
  setTxt('#tag', tag.join(' · '));
  setTxt(
    '#carryTag',
    carry.length ? `✋ ${carry.map(c => P[c.id].name).join(', ')} (${carry.length}/${cap()}) — 기지로!` : ''
  );
  if (!G.comet) {
    if (inTile(me.pos.x, me.pos.z, 0) && !carry.length && (G.cometT -= dt) <= 0) {
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
