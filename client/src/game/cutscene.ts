// 컷신 디렉터: 타임라인(카메라·배우·말풍선·FX·사운드 훅·HUD·UI 숨김)을 cineT 로 재생한다.
// 규칙: 게임 상태 변경은 onEnd 에서만(건너뛰기와 결과 동일) · 문장 없음 · 사운드/HUD 값/종료 효과는 G.cineHooks 로 위임
import {S, save} from '../core/state.js';
import {G, releaseLock} from '../core/runtime.js';
import {$} from '../core/util.js';
import {CUTS} from '../data/cutscenes.js';
import type {ActKey, CamKey, CutDef, CutId, Track, UiKey, Vec3} from '../data/cutscene-types.js';
import {disposeActors, driveActor, spawnActors, type Actor} from './cutscene-actors.js';
import {addBubble, fadeTo, fxReset, fxTick, hudPos, placeBubbles, reduced, runFx, shakeNow, timeScale} from './cutscene-fx.js';
import {EASE, lerp, num, sortKf, step, vec} from './cutscene-track.js';
import {flushIconToasts} from './hud.js';
import {setSkyApple} from '../render/sky.js';

interface Run {
  def: CutDef;
  t: number;
  last: number;
  clock: number;
  replay: boolean;
  lock: boolean;
  first: boolean;
  o: Vec3;
  actors: Map<string, Actor>;
  tr: Track[];
  cam: CamKey[];
  soft: CamKey[];
  ui: UiKey[];
  baseFov: number;
  skipT: number;
  hold: number;
  holding: boolean;
  yaw: number;
  pitch: number;
  softOff: boolean;
  pose?: {p: any; l: any; fov: number};
}
const RETURN_MS = 800,
  SOFT_SEC = 0.6;
let run: Run | null = null,
  pending: [CutId, boolean] | null = null,
  tail = 0,
  ret: {p: any; l: any; fov: number; t0: number; base: number} | null = null;
const v3 = () => new THREE.Vector3(),
  tmp = v3();

export const cineActive = () => run !== null;
const layer = (on: boolean, lock = false, lb = false) => {
  const el = $('#cine');
  el.classList.toggle('on', on);
  el.classList.toggle('lock', lock);
  el.classList.toggle('lb', lb);
};
/** 배우 머리 위 화면 좌표 (카메라 뒤면 null) */
function proj(r: Run, id: string): [number, number] | null {
  const a = r.actors.get(id);
  if (!a) return null;
  a.obj.getWorldPosition(tmp);
  tmp.y += a.top;
  tmp.project(G.camera);
  return tmp.z > 1 ? null : [(tmp.x * 0.5 + 0.5) * innerWidth, (-tmp.y * 0.5 + 0.5) * innerHeight];
}

/** 재생 시작. 모달·퀴즈 중이면 false(호출 쪽이 다음 프레임에 재시도). replay = 재시청(입력 잠금·고정 카메라, onEnd·seen 불변) */
export function playCut(id: CutId, opts: {replay?: boolean} = {}): boolean {
  const def = CUTS[id];
  if (!def || !G.started || G.quizOpen || G.dexOpen || G.shopOpen || G.modal) return false;
  const replay = !!opts.replay,
    lock = replay || def.lockInput !== false;
  if (run) {
    if (!lock || run.lock) {
      if (pending) return false; // 대기열은 1개 (선입선출)
      pending = [id, replay];
      return true;
    }
    finish(false); // 입력 잠금 컷신이 오면 재생 중이던 오버레이는 즉시 종료 처리
  }
  if (lock) releaseLock();
  const o: Vec3 = [G.me.pos.x, G.me.pos.y, G.me.pos.z],
    tr = def.tracks.map(t => ({...t, kf: sortKf(t.kf as any[])}) as Track),
    camKf = tr.flatMap(t => (t.type === 'camera' ? t.kf : []));
  run = {
    def, t: 0, last: -1, clock: 0, replay, lock, o, tr,
    first: !replay && !S.story.seen[id],
    actors: spawnActors(def.setup, o, lock),
    cam: camKf.filter(k => !k.soft),
    soft: replay ? [] : camKf.filter(k => k.soft),
    ui: tr.flatMap(t => (t.type === 'ui' ? t.kf : [])),
    baseFov: G.camera.fov, skipT: 0, hold: 0, holding: false, yaw: G.yaw, pitch: G.pitch, softOff: false,
  };
  if (def.setup?.actors.some(a => a.kind === 'apple')) setSkyApple(false);
  G.cine = {id, lock, t: 0, dur: def.durSec};
  fxReset();
  fxTick(0);
  tail = 0;
  ret = null;
  layer(true, lock, def.letterbox ?? lock);
  document.body.classList.toggle('cine-nohud', lock);
  $('#cineSkip').classList.remove('on');
  $('#cineSkip').classList.toggle('chip', !lock);
  return true;
}

function applyEnd(def: CutDef) {
  const st = S.story;
  def.onEnd.forEach(e => {
    if (e.do === 'beat') {
      st.beat = e.to;
      st.mid = 0;
    } else if (e.do === 'mid') {
      if (st.beat === 4) st.mid = e.to;
    } else if (e.do === 'flag') st.seen[e.key] = e.v;
    else if (e.do === 'ended') st.ended = 1;
    else if (e.do === 'save') save();
    else G.cineHooks.effect?.(e);
  });
}
function finish(skipped: boolean) {
  const r = run!;
  run = null;
  G.cine = null;
  if (!r.replay) {
    S.story.seen[r.def.id] = 1;
    applyEnd(r.def);
  }
  disposeActors(r.actors);
  setSkyApple(true);
  G.cineHooks.hud?.(null);
  document.body.classList.remove('cine-nohud');
  fxReset(skipped);
  if (skipped) fadeTo(0, 0.3);
  else fxTick(0);
  if (r.lock && !skipped && r.pose) ret = {...r.pose, t0: performance.now(), base: r.baseFov};
  else if (G.camera.fov !== r.baseFov) {
    G.camera.fov = r.baseFov;
    G.camera.updateProjectionMatrix();
  }
  layer(true, false, false);
  tail = skipped ? 0.3 : 0.45;
  flushIconToasts();
  if (pending) {
    const [id, rep] = pending;
    pending = null;
    playCut(id, {replay: rep});
  }
}
/** 건너뛰기: 0.3초 페이드 후 종료 상태로 점프 (onEnd 는 finish 에서 정상 종료와 동일하게 실행) */
export function skipCut() {
  if (!run || run.skipT > 0 || run.t < 0.4) return;
  run.skipT = 0.3;
  fadeTo(1, 0.3);
}
/** ⏭ 누름/뗌. skipHold(C11) 컷신은 최초 시청에 한해 길게 눌러야 한다 */
export function skipPress(down: boolean) {
  if (!run) return;
  if (!down || !(run.def.skipHold && run.first)) {
    run.holding = false;
    run.hold = 0;
    if (down) skipCut();
  } else run.holding = true;
}

function fire(r: Run, from: number, to: number) {
  const inRange = (t: number) => t > from && t <= to;
  r.tr.forEach(tk => {
    if (tk.type === 'bubble') tk.kf.filter(k => inRange(k.t)).forEach(addBubble);
    else if (tk.type === 'fx') tk.kf.filter(k => inRange(k.t)).forEach(k => runFx(k, id => proj(r, id)));
    else if (tk.type === 'sound')
      tk.kf.filter(k => inRange(k.t)).forEach(k => G.cineHooks.sound?.(k.cue, {vol: k.vol, pan: k.pan, duck: k.duck}));
    else if (tk.type === 'hud')
      tk.kf.filter(k => inRange(k.t)).forEach(k => {
        if (k.spotlight !== undefined) runFx({t: 0, kind: 'spot', amt: k.spotlight ? 1 : 0, at: k.target}, () => hudPos(k.target));
        G.cineHooks.hud?.(k);
      });
  });
}
/** 매 프레임(raw = 실시간 dt). 모달·퀴즈로 멈춘 동안은 cineT 도 멈춘다 */
export function tickCut(raw: number) {
  const r = run;
  if (!r) {
    if (tail > 0) {
      fxTick(raw);
      if ((tail -= raw) <= 0) {
        fxReset();
        fxTick(0);
        layer(false);
      }
    }
    return;
  }
  if (G.dexOpen || G.shopOpen || G.quizOpen || G.modal) return;
  fxTick(raw);
  if (r.skipT > 0) {
    if ((r.skipT -= raw) <= 0) finish(true);
    return;
  }
  r.clock += raw;
  const sk = $('#cineSkip'),
    need = r.def.skipHold && r.first ? r.def.skipHold : 0;
  r.hold = r.holding ? r.hold + raw : 0;
  sk.style.setProperty('--hold', need ? String(Math.min(1, r.hold / need)) : '0');
  if (need && r.hold >= need) skipCut();
  sk.classList.toggle('on', r.t >= (r.first ? 2 : 0));
  r.t = Math.min(r.def.durSec, r.t + raw * timeScale());
  fire(r, r.last, r.t);
  r.last = r.t;
  G.cine!.t = r.t;
  r.actors.forEach((a, id) => {
    const tk = r.tr.find(t => t.type === 'actor' && t.id === id);
    if (tk && tk.type === 'actor') driveActor(a, tk.kf as ActKey[], r.t, r.o, r.actors, r.clock, r.lock);
    a.tick?.(r.clock);
  });
  const vis = step<boolean>(r.ui, r.t, 'hud');
  document.body.classList.toggle('cine-nohud', vis === undefined ? r.lock : !vis);
  if (r.t >= r.def.durSec) finish(false);
}

/** loop.ts 가 기본 카메라 설정 직후 호출: 컷신 카메라로 덮어쓰기 / 소프트 시선 보조 / 종료 후 부드러운 복귀. 말풍선 투영도 여기서 갱신 */
export function cineCamera() {
  const cam = G.camera,
    gl = v3().set(G.me.pos.x, G.me.pos.y + 2.5, G.me.pos.z);
  if (!run) {
    if (!ret) return;
    const k = EASE.inOut(Math.min(1, (performance.now() - ret.t0) / RETURN_MS));
    cam.position.lerpVectors(ret.p, cam.position, k);
    cam.lookAt(ret.l.clone().lerp(gl, k));
    cam.fov = lerp(ret.fov, ret.base, k);
    cam.updateProjectionMatrix();
    if (k >= 1) ret = null;
    return;
  }
  const r = run;
  if (r.lock && r.cam.length) {
    const to = vec(r.cam, r.t, 'to')!,
      look = vec(r.cam, r.t, 'look')!,
      amp = reduced() ? 0 : (num(r.cam, r.t, 'shake') || 0) + shakeNow();
    cam.position.set(r.o[0] + to[0] + Math.sin(r.clock * 47) * amp * 0.3, r.o[1] + to[1] + Math.sin(r.clock * 59 + 1) * amp * 0.3, r.o[2] + to[2]);
    cam.lookAt(r.o[0] + look[0], r.o[1] + look[1], r.o[2] + look[2]);
    const fov = num(r.cam, r.t, 'fov') ?? r.baseFov;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    r.pose = {p: cam.position.clone(), l: v3().set(r.o[0] + look[0], r.o[1] + look[1], r.o[2] + look[2]), fov};
  } else if (!r.lock && r.soft.length) {
    if (Math.abs(G.yaw - r.yaw) + Math.abs(G.pitch - r.pitch) > 0.004) r.softOff = true; // 플레이어가 시점을 돌리면 즉시 해제
    r.yaw = G.yaw;
    r.pitch = G.pitch;
    const k = r.soft.find(s => r.t >= s.t && r.t < s.t + SOFT_SEC);
    if (!k) r.softOff = false;
    const w = k && !r.softOff ? Math.sin(((r.t - k.t) / SOFT_SEC) * Math.PI) * 0.6 : 0,
      fov = k && w ? lerp(r.baseFov, k.fov ?? r.baseFov, w) : r.baseFov;
    if (w) cam.lookAt(gl.lerp(v3().set(r.o[0] + k!.look[0], r.o[1] + k!.look[1], r.o[2] + k!.look[2]), w));
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }
  cam.updateMatrixWorld();
  placeBubbles(id => proj(r, id));
}
