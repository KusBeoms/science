// 매 프레임: 시간/성장/밤낮 → 이동 → 섹터 스트리밍·시간 진행 → 문/수호자 → 입고 → 등록 시스템 → 메시 동기화 → 대상 → 카메라/렌더 → HUD
import {S, income, dexN} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {$, fmt, setTxt} from '../core/util.js';
import {advance, forEachNest, poolOf} from '../core/layout.js';
import {inBase, zoneAt} from '../core/geometry.js';
import {P, pickFrom} from '../data/planets.js';
import {streamSectors, syncNests} from '../render/sectors.js';
import {updateSky} from '../render/sky.js';
import {syncBase} from '../render/sync.js';
import {deposit} from '../game/actions.js';
import {cineCamera} from '../game/cutscene.js';
import {DAY_S, NIGHT_GROW, NIGHT_S} from '../core/clock.js';
import {flash, renderHudLines, toast} from '../game/hud.js';
import {missionTick} from '../game/missions.js';
import {timeNow} from './hazards.js';
import {movePlayer} from './move.js';
import {updateGuardians} from './guardians.js';
import {sectorChanged, updateSystems} from './registry.js';
import {updateTarget} from './target.js';
import {updateCharacterGaze} from '../render/characters-gaze.js';
import {vehicleTransitionActive} from './vehicle-transition.js';
import {updateFollowCamera} from './camera.js';

function dayNight(dt: number) {
  G.cycT += dt;
  if (G.night > 0) {
    G.night -= dt;
    if (G.night <= 0) {
      G.night = 0;
      toast('아침이 밝았습니다. 둥지가 새로 채워졌습니다');
    }
  } else if (G.cycT >= DAY_S) {
    G.cycT = 0;
    G.night = NIGHT_S;
    toast(`밤이 되었습니다. 성장 ×${NIGHT_GROW}, 둥지가 초기화됩니다`, 3);
    flash('#112', 0.55);
    forEachNest((n, zi) =>
      n.s.forEach((_, k) => {
        if (!G.carry.some(c => c.z === zi && c.k === k)) {
          n.s[k] = pickFrom(poolOf(zi));
          n.t[k] = 0;
        }
      })
    );
  }
}
export function frame() {
  requestAnimationFrame(frame);
  const raw = Math.min(0.05, G.clock.getDelta()),
    t = G.clock.elapsedTime,
    dt = paused() ? 0 : raw;
  G.gameT += dt;
  S.playSec += dt; // 일시정지 제외 누적 플레이 시간(업적·복습에서 사용)
  const prevZone = G.curZone;
  G.curZone = zoneAt();
  if (G.curZone !== prevZone) sectorChanged(prevZone, G.curZone);
  const tdil = timeNow(),
    inc = income();
  S.cr += inc * dt * tdil;
  dayNight(dt);
  S.base.forEach(o => {
    if (o && o.left > 0) o.left -= dt * tdil * (G.night > 0 ? NIGHT_GROW : 1);
  });
  if (!vehicleTransitionActive()) movePlayer(dt, t);
  // 스프링 장식 애니메이션
  if (G.springGrp) {
    const a = G.springGrp.userData;
    if (a.orb) a.orb.rotation.y += raw * 3;
    if (a.flame) {
      a.flame.scale.y = 1 + Math.sin(t * 20) * 0.25;
      a.flame.position.y = 0.3 + Math.sin(t * 20) * 0.08;
    }
    if (a.rainbow) a.rainbow.forEach((m: any, i: number) => m.color.setHSL((t * 0.5 + i * 0.3) % 1, 0.9, 0.6));
  }
  if (G.decoGrp.userData.spin) G.decoGrp.userData.spin.rotation.y += raw;
  streamSectors();
  G.chunks.forEach((c, i) => c && advance(i, G.gameT)); // 비활성 섹터는 다음 로드 때 경과 시간을 한 번에 따라잡는다
  updateGuardians(dt, t);
  if (G.carry.length && inBase(G.me.pos.x, G.me.pos.z, -1)) deposit();
  updateSystems(dt, raw);
  syncNests(t);
  syncBase(t);
  G.npc.position.y = Math.abs(Math.sin(t * 2)) * 0.12;
  G.npc.rotation.y = Math.sin(t * 0.7) * 0.3;
  updateTarget(raw);
  updateFollowCamera(raw);
  cineCamera(); // 컷신 중이면 카메라 덮어쓰기
  updateCharacterGaze(G.me, G.camera, raw);
  updateSky(dt, t); // 천구를 카메라에 붙이고 낮밤 틴트·조명·안개 갱신
  G.renderer.render(G.scene, G.camera);
  setTxt('#cr', '✦ ' + fmt(S.cr));
  setTxt('#inc', '+' + fmt(inc) + '/s');
  setTxt('#dexBtn', `📖 ${dexN()}/${P.length}`);
  if (G.shopOpen) $('#sc').textContent = '✦ ' + fmt(S.cr);
  missionTick();
  renderHudLines();
  if (G.toastT > 0 && (G.toastT -= raw) <= 0) $('#toast').classList.remove('on');
}
