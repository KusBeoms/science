// 축구 (FC 온라인풍): 스타디움 킥오프 판에서 E → 7대7, 전·후반 5분. 구현은 src/soccer/ — 여기서는 시작/종료/순서/HUD/자유 연습만 한다.
import {S, save} from '../core/state.js';
import {G, paused} from '../core/runtime.js';
import {PLAYER_SCALE} from '../core/scale.js';
import {dist2} from '../core/util.js';
import {KICKOFF, MATCH_SEC, PITCH} from '../data/soccer.js';
import {toast} from '../game/hud.js';
import {pushMsg} from '../game/messenger.js';
import {sfx} from '../audio/index.js';
import {ball, clamp, cx, cz, hw, setMatch, type Match} from '../soccer/state.js';
import * as ST from '../soccer/state.js';
import {ensureBall, placeBall, stepBall} from '../soccer/ball.js';
import {disposeTeam, integrate, lineup, makeTeam, markerOf, placeMarker} from '../soccer/team.js';
import {checkBall, checkTouches, hooks, makeRef, refUpdate, say, startKickoff, stepClock, stepRestart} from '../soccer/rules.js';
import {aiUpdate} from '../soccer/ai.js';
import {humanUpdate, shotGauge} from '../soccer/control.js';
import {crowdCheer, ensureStandCrowd, updateStandCrowd} from '../soccer/crowd.js';
import type {GameSystem, Interactable, Target} from '../core/types.js';

let hud: HTMLElement | null = null,
  spaceWas = false;
const M = () => ST.M;

function buildHud() {
  hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;inset:0;z-index:7;pointer-events:none;font-family:inherit;color:#fff';
  hud.innerHTML =
    '<div id="fc-sb" style="position:absolute;top:10px;left:50%;transform:translateX(-50%);background:#0b0e18e0;border:1px solid #fff3;border-radius:12px;padding:6px 16px;text-align:center;min-width:220px"><div style="font-size:22px;font-weight:800;letter-spacing:1px" id="fc-score"></div><div style="font-size:11px;color:#9fb0d0" id="fc-sub"></div></div>' +
    '<div id="fc-hint" style="position:absolute;top:78px;left:50%;transform:translateX(-50%);font-size:30px;font-weight:800;text-shadow:0 2px 8px #000;opacity:0"></div>' +
    '<div style="position:absolute;bottom:64px;left:50%;transform:translateX(-50%);width:240px;height:12px;border:2px solid #fff8;border-radius:8px;background:#0007;overflow:hidden"><i id="fc-g" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#4cb860,#f3e04a 60%,#e5483f)"></i></div>' +
    '<div id="fc-keys" style="position:absolute;left:12px;bottom:12px;font-size:12px;line-height:1.7;background:#0b0e18c0;border-radius:10px;padding:8px 12px"></div>';
  document.body.append(hud);
}
const KEYS_ATK = '<b>← ↑ ↓ →</b> 이동 · <b>Shift</b> 달리기<br><b>A</b> 패스 · <b>S</b> 스루 · <b>W</b> 크로스 · <b>D</b> 슛(꾹) · <b>Space</b> 보호',
  KEYS_DEF = '<b>← ↑ ↓ →</b> 이동 · <b>Shift</b> 달리기<br><b>A</b> 선수교체 · <b>S</b> 압박(꾹) · <b>D</b> 태클 · <b>Space</b> 슬라이딩';
function updateHud() {
  const m = M();
  if (!hud || !m) return;
  const t = Math.max(0, Math.ceil(m.t)),
    q = (id: string) => hud!.querySelector('#' + id) as HTMLElement;
  q('fc-score').textContent = `🔵 ${m.score[0]}  ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}  ${m.score[1]} 🔴`;
  q('fc-sub').textContent = `${m.half}H · 🟨${m.cards[0][0]} 🟥${m.cards[0][1]} | 🟨${m.cards[1][0]} 🟥${m.cards[1][1]} · 점유 ${Math.round((m.poss[0] / Math.max(1, m.poss[0] + m.poss[1])) * 100)}%`;
  const hint = q('fc-hint');
  hint.textContent = m.hint;
  hint.style.opacity = m.hintT > 0 ? '1' : '0';
  q('fc-g').style.width = shotGauge() * 100 + '%';
  const keys = q('fc-keys'),
    html = ball.owner?.team === 0 || (m.restart && m.restart.team === 0) ? KEYS_ATK : KEYS_DEF;
  if (keys.dataset.m !== html) [keys.innerHTML, keys.dataset.m] = [html, html];
}

export function startMatch() {
  if (M() || G.inside || G.drive || G.jail) return;
  ensureBall();
  const t0 = makeTeam(0),
    t1 = makeTeam(1),
    pls = [...t0, ...t1],
    ref = makeRef(),
    marker = markerOf();
  const m: Match = {
    t: MATCH_SEC / 2, half: 1, score: [0, 0], phase: 'restart', pause: 0, pls, ctl: t0[6], restart: null, ref: {m: ref, x: cx, z: cz + 10},
    cards: [[0, 0], [0, 0]], fouls: [0, 0], shots: [0, 0], poss: [0, 0], marker, prevCam: G.camDist, prevPitch: G.pitch, hint: '', hintT: 0,
  };
  setMatch(m);
  G.match = true;
  G.me.visible = false;
  G.camDist = 46;
  G.pitch = 0.85;
  lineup(pls, 0);
  hooks.cheer = () => crowdCheer(0);
  hooks.end = () => endMatch(true);
  startKickoff(0);
  buildHud();
  say('킥오프', 2);
  toast('킥오프! 파란 팀은 동쪽 골대로 공격합니다', 3);
}
export function endMatch(natural: boolean) {
  const m = M();
  if (!m) return;
  const [a, b] = m.score;
  disposeTeam(m.pls);
  G.scene.remove(m.ref.m, m.marker);
  G.camDist = m.prevCam;
  G.pitch = m.prevPitch;
  G.match = false;
  G.me.visible = true;
  G.me.pos.set(cx, 0, cz + hw - 3);
  setMatch(null);
  ball.owner = null;
  placeBall(cx, cz);
  hud?.remove();
  hud = null;
  if (natural) {
    const win = a > b,
      draw = a === b,
      prize = (win ? 800 : draw ? 300 : 100) + 50 * a;
    S.cr += prize;
    toast(`${win ? '승리했습니다' : draw ? '무승부입니다' : '패배했습니다'}. ${a} : ${b}, ✦ +${prize}`, 4.5);
    setTimeout(() => pushMsg('coach', `${win ? '🏆👏' : draw ? '🤝' : '💪'} ${a}:${b}`), 2500);
    sfx('buy');
    save();
  } else toast('경기를 종료했습니다');
}

/** 경기 밖 자유 연습: 달려서 드리블, Space 슛 (예전 방식) */
function freePlay(dt: number) {
  const me = G.me,
    mv = dt > 0 ? [(me.pos.x - ((me as any)._px ?? me.pos.x)) / dt, (me.pos.z - ((me as any)._pz ?? me.pos.z)) / dt] : [0, 0];
  (me as any)._px = me.pos.x;
  (me as any)._pz = me.pos.z;
  const sp = !!G.keys.Space && !spaceWas;
  spaceWas = !!G.keys.Space;
  const d = Math.hypot(me.pos.x - ball.x, me.pos.z - ball.z);
  if (d < 2.6 && sp && !G.drive) {
    ball.vx = Math.sin(me.rotation.y) * 28;
    ball.vz = Math.cos(me.rotation.y) * 28;
    ball.vy = 3;
    sfx('kick');
  } else if (d < 1.5 && !G.drive && Math.hypot(mv[0], mv[1]) > 1) {
    const nx = (ball.x - me.pos.x) / (d || 1),
      nz = (ball.z - me.pos.z) / (d || 1);
    ball.vx += (mv[0] * 1.15 + nx * 3 - ball.vx) * 0.6;
    ball.vz += (mv[1] * 1.15 + nz * 3 - ball.vz) * 0.6;
  }
  stepBall(dt);
  // 골대 뒤 그물에 갇히게 (연습 중에도 필드 밖으로 안 나간다)
  ball.z = clamp(ball.z, cz - hw + 0.9, cz + hw - 0.9);
  ball.x = clamp(ball.x, cx - PITCH.hl - 2.5, cx + PITCH.hl + 2.5);
}

export const soccerSystem: GameSystem = {
  id: 'soccer',
  update(dt) {
    const m = M();
    if (paused() && !m) return;
    const near = dist2(G.me.pos, KICKOFF) < 110 || !!m;
    if (!near) return;
    ensureBall();
    ensureStandCrowd();
    updateStandCrowd(dt);
    if (paused()) return;
    if (!m) return freePlay(dt);
    if (m.hintT > 0) m.hintT -= dt;
    stepClock(dt);
    if (!M()) return; // 시간이 끝나 경기가 정리됐다
    if (m.phase === 'restart') stepRestart(dt);
    humanUpdate(dt);
    aiUpdate(dt);
    integrate(m.pls, dt);
    if (m.phase === 'play' || m.phase === 'restart' || m.phase === 'goal') stepBall(dt);
    else stepBall(dt);
    checkTouches(dt);
    checkBall();
    refUpdate(dt);
    placeMarker();
    // 카메라: 중계석 고정(남쪽에서 북쪽을 봄), 공과 조작 선수 사이를 부드럽게 따라간다
    G.yaw = 0;
    const fx = clamp(ball.x * 0.65 + m.ctl.x * 0.35, cx - 30, cx + 30),
      fz = cz + (ball.z - cz) * 0.25;
    G.me.pos.x += (fx - G.me.pos.x) * Math.min(1, dt * 4);
    G.me.pos.z += (fz - G.me.pos.z) * Math.min(1, dt * 4);
    G.me.pos.y = 0;
    updateHud();
  },
};

interface SoccerT extends Target {
  kind: 'soccer';
}
export const soccerIt: Interactable<SoccerT> = {
  kind: 'soccer',
  tier: 0,
  find(me) {
    if (G.inside || G.drive) return null;
    if (M()) return {kind: 'soccer', d: 0.4};
    const d = dist2(me.pos, KICKOFF);
    return d < 4.5 ? {kind: 'soccer', d} : null;
  },
  info: () => (M() ? '<b>축구 경기 중</b>' : '<b>축구</b><br>7대7 · 전후반 5분 (총 10분) · 방향키 + A S W D'),
  prompt: () => (M() ? 'E 경기 종료' : 'E 경기 시작'),
  act(_t, key) {
    if (key !== 'e') return;
    if (M()) endMatch(false);
    else startMatch();
  },
};
void PLAYER_SCALE;
