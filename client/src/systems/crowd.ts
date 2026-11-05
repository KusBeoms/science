// 군중 시스템 (WORLD.md 5): 도시 보도 그래프 위를 걷는 행인. 스폰/디스폰, 경로 보행, 구경(idle), 플레이어에게 비킴·시선, 머리 위 이모지 반응.
// W1 에선 상호작용 없음. 상태는 저장하지 않는다(외형 시드도 매번 새로 뽑는다). 렌더는 render/crowd.ts (InstancedMesh).
import {G, paused} from '../core/runtime.js';
import {clamp, rnd} from '../core/util.js';
import {groundH, solidAt} from '../core/terrain.js';
import {CITY_GRAPH as GR, ZONE_SHARE} from '../data/citygraph.js';
import {ARCHETYPES, CITIZEN_SCALE, HEAD_TOP, SHIRTS, createCrowdView} from '../render/crowd.js';
import type {CrowdSprite, CrowdView} from '../render/crowd.js';
import type {GameSystem} from '../core/types.js';

/** 동시 최대 인원: 데스크톱 / 모바일(pointer:coarse). W2 에서 데스크톱 66, 모바일 Q0 24 */
export const CROWD_MAX = {desktop: 66, mobile: 24};
const CAP = matchMedia('(pointer:coarse)').matches ? CROWD_MAX.mobile : CROWD_MAX.desktop;
/** 플레이어가 도시 경계에서 이만큼 안에 있을 때만 시뮬레이션 */
const ACTIVE_MARGIN = 60,
  CITY_HALF = 150,
  SPAWN_PER_SEC = 2,
  SPAWN_MIN_DIST = 40,
  DESPAWN_DIST = 100,
  /** 카메라 전방 이 각도(라디안) 안에는 스폰하지 않는다 */
  SPAWN_CONE = (70 * Math.PI) / 180,
  BODY_R = 0.5, // 시민 몸 반지름(배율 반영)
  BUBBLES = 6,
  BUBBLE_MAX_DIST = 40,
  /** 플레이어가 이 속도 이상이면 달리는 중 (걷기 14, 달리기 ×1.7) */
  RUN_SPEED = 18,
  EMOJI_LOOK = '👀',
  EMOJI_STARTLE = '😮';

interface Agent extends CrowdSprite {
  /** 지나온 노드 → 가는 노드, 간선 진행도 0..1 */
  a: number;
  b: number;
  t: number;
  len: number;
  speed: number;
  arch: number;
  /** 남은 멈춤 / 쳐다보기 시간, 쿨다운 */
  idle: number;
  look: number;
  lookCd: number;
  stepCd: number;
  /** 멈춰 있을 때 바라볼 방향 */
  face: number;
  /** 간선 옆으로 비킨 거리 */
  off: number;
  phase: number;
  /** 걷는 정도 0..1 (애니메이션 감쇠) */
  mv: number;
  age: number;
  leaving: boolean;
  gone: boolean;
  bub: number;
  emoji: string;
}

const agents: Agent[] = [];
let view: CrowdView | null = null,
  box: HTMLElement | null = null,
  pool: HTMLElement[] = [],
  spawnAcc = 0,
  filled = false,
  meX = 0,
  meZ = 0,
  meV = 0;
const v3 = new THREE.Vector3();

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function initView() {
  view = createCrowdView(CAP);
  G.scene.add(view.root);
  box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;inset:0;z-index:4;pointer-events:none;overflow:hidden';
  document.body.append(box);
  for (let i = 0; i < BUBBLES; i++) {
    const el = document.createElement('div');
    el.className = 'bub crowd'; // 컷신 말풍선과 스타일은 공유, 구분은 .crowd
    el.dataset.shape = 'round';
    el.style.cssText = 'font-size:20px;padding:3px 8px;visibility:hidden;margin-top:0';
    box.append(el);
    pool.push(el);
  }
}

/** 노드 n 이 건물 등에 막혀 있는가 */
const blockedNode = (n: number) => solidAt(GR.x[n], GR.z[n], BODY_R);

function spawn(minDist: number): boolean {
  const fx = -Math.sin(G.yaw),
    fz = -Math.cos(G.yaw);
  const zoneCount = ZONE_SHARE.map(() => 0);
  agents.forEach(p => zoneCount[GR.zone[p.a]]++);
  let best = -1,
    bestK = Infinity;
  for (let k = 0; k < 8; k++) {
    const n = Math.floor(Math.random() * GR.x.length),
      dx = GR.x[n] - meX,
      dz = GR.z[n] - meZ,
      d = Math.hypot(dx, dz);
    const hidden = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1)) > SPAWN_CONE;
    if (d < minDist || d > DESPAWN_DIST * 0.9 || !(hidden || d >= 1.5 * SPAWN_MIN_DIST) || blockedNode(n)) continue;
    const ratio = zoneCount[GR.zone[n]] / ZONE_SHARE[GR.zone[n]];
    if (ratio < bestK) [best, bestK] = [n, ratio];
  }
  if (best < 0) return false;
  const adj = GR.adj[best],
    b = adj[Math.floor(Math.random() * adj.length)],
    ar = Math.floor(Math.random() * ARCHETYPES.length);
  agents.push({
    x: GR.x[best], y: 0, z: GR.z[best], yaw: Math.atan2(GR.x[b] - GR.x[best], GR.z[b] - GR.z[best]),
    w: 0, h: 0, swing: 0, bob: 0, color: SHIRTS[Math.floor(Math.random() * SHIRTS.length)],
    a: best, b, t: 0, len: Math.hypot(GR.x[b] - GR.x[best], GR.z[b] - GR.z[best]), speed: rnd(2.9, 5.8), arch: ar,
    idle: 0, look: 0, lookCd: 0, stepCd: 0, face: 0, off: 0, phase: rnd(0, 6.28), mv: 1, age: 0, leaving: false, gone: false, bub: 0, emoji: '',
  });
  return true;
}

function setEdge(p: Agent, a: number, b: number, t: number) {
  p.a = a;
  p.b = b;
  p.t = t;
  p.len = Math.hypot(GR.x[b] - GR.x[a], GR.z[b] - GR.z[a]);
}
/** 도착한 노드에서 다음 간선: U턴 금지(막다른 곳만 예외), 막힌 노드 제외 */
function nextNode(p: Agent): number {
  const adj = GR.adj[p.b],
    ok = Array.from(adj).filter(n => n !== p.a && !blockedNode(n));
  return ok.length ? ok[Math.floor(Math.random() * ok.length)] : p.a;
}
/** 멈춰 설 때 바라볼 방향: 상점가는 가게 쪽(도로 바깥), 대로도 바깥, 광장은 아무 쪽 */
function faceFor(n: number): number {
  const z = GR.zone[n];
  if (z === 2) return (GR.z[n] > 0 ? 0 : Math.PI) + rnd(-0.3, 0.3);
  if (z === 1) return (GR.x[n] > 0 ? Math.PI / 2 : -Math.PI / 2) + rnd(-0.3, 0.3);
  return rnd(-Math.PI, Math.PI);
}
function emoji(p: Agent, e: string, sec: number) {
  if (agents.filter(o => o.bub > 0).length >= BUBBLES) return;
  p.emoji = e;
  p.bub = sec;
}

/** 간선 위 위치(+옆으로 비킨 거리)를 좌표로. 막히면 비킴 취소 → 그래도 막히면 false */
function place(p: Agent): boolean {
  const ax = GR.x[p.a],
    az = GR.z[p.a],
    dx = (GR.x[p.b] - ax) / (p.len || 1),
    dz = (GR.z[p.b] - az) / (p.len || 1),
    bx = ax + dx * p.len * p.t,
    bz = az + dz * p.len * p.t;
  p.x = bx + dz * p.off;
  p.z = bz - dx * p.off;
  if (p.off !== 0 && solidAt(p.x, p.z, BODY_R)) {
    p.off = 0;
    p.x = bx;
    p.z = bz;
  }
  return !solidAt(p.x, p.z, BODY_R);
}

function step(p: Agent, dt: number) {
  p.age += dt;
  p.lookCd -= dt;
  p.stepCd -= dt;
  p.bub -= dt;
  const fade = clamp(p.leaving ? p.w / ARCHETYPES[p.arch].w - dt * 2 : p.age * 2, 0, 1);
  const ar = ARCHETYPES[p.arch];
  p.w = ar.w * fade;
  p.h = ar.h * fade;
  if (p.leaving) {
    p.gone = fade <= 0;
    return;
  }
  const dxm = meX - p.x,
    dzm = meZ - p.z,
    d = Math.hypot(dxm, dzm);
  if (d > DESPAWN_DIST) p.leaving = true;
  // 반응: 행성을 든 채 가까이 오면 쳐다봄(👀), 달려 오면 비킴(😮), 바싹 오면 말없이 비킴
  if (G.carry.length && d < 6 && p.lookCd <= 0) {
    p.look = 2.5;
    p.lookCd = 20;
    emoji(p, EMOJI_LOOK, 2.2);
  }
  let want = 0;
  if ((meV > RUN_SPEED && d < 5) || d < 2.2) {
    if (meV > RUN_SPEED && p.stepCd <= 0) {
      p.stepCd = 4;
      emoji(p, EMOJI_STARTLE, 1.2);
    }
    const ex = (GR.x[p.b] - GR.x[p.a]) / (p.len || 1),
      ez = (GR.z[p.b] - GR.z[p.a]) / (p.len || 1);
    want = dxm * ez - dzm * ex > 0 ? -1.8 : 1.8; // 플레이어 반대편
  }
  p.off += (want - p.off) * Math.min(1, dt * 4);
  let yawTo = p.yaw;
  if (p.look > 0) {
    p.look -= dt;
    yawTo = Math.atan2(dxm, dzm);
    p.mv = Math.max(0, p.mv - dt * 6);
  } else if (p.idle > 0) {
    p.idle -= dt;
    yawTo = d < 8 ? Math.atan2(dxm, dzm) : p.face;
    p.mv = Math.max(0, p.mv - dt * 6);
  } else {
    p.mv = Math.min(1, p.mv + dt * 6);
    p.t += (p.speed * dt) / (p.len || 1);
    if (p.t >= 1) {
      const n = p.b,
        nx = nextNode(p);
      setEdge(p, n, nx, 0);
      if (GR.idle[n] && Math.random() < 0.7) {
        p.idle = rnd(2, 6);
        p.face = faceFor(n);
      }
    }
    yawTo = Math.atan2(GR.x[p.b] - GR.x[p.a], GR.z[p.b] - GR.z[p.a]);
  }
  p.yaw += clamp(wrap(yawTo - p.yaw), -6 * dt, 6 * dt);
  if (!place(p)) {
    setEdge(p, p.b, p.a, 1 - p.t); // 막혔다: 되돌아간다
    if (!place(p)) p.leaving = true;
  }
  p.phase += p.speed * dt * 2.4 * p.mv;
  p.swing = Math.sin(p.phase) * 0.7 * p.mv;
  p.bob = Math.abs(Math.cos(p.phase)) * 0.05 * p.mv;
  const gh = groundH(p.x, p.z);
  p.y = gh > -Infinity ? gh : 0;
}

function showBubbles(show: boolean) {
  if (!box) return;
  box.style.display = show ? 'block' : 'none';
  if (!show) return;
  const cam = G.camera,
    list = agents
      .filter(p => p.bub > 0 && !p.leaving && Math.hypot(p.x - cam.position.x, p.z - cam.position.z) < BUBBLE_MAX_DIST)
      .sort((p, q) => Math.hypot(p.x - cam.position.x, p.z - cam.position.z) - Math.hypot(q.x - cam.position.x, q.z - cam.position.z));
  pool.forEach((el, i) => {
    const p = list[i];
    if (!p) {
      el.style.visibility = 'hidden';
      return;
    }
    v3.set(p.x, p.y + HEAD_TOP * p.h * CITIZEN_SCALE + 0.5, p.z).project(cam);
    el.style.visibility = v3.z < 1 ? 'visible' : 'hidden';
    el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * innerWidth}px,${(-v3.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-100%)`;
    if (el.textContent !== p.emoji) el.textContent = p.emoji;
  });
}

function update(dt: number, raw: number) {
  if (!G.me || !G.scene) return;
  if (!view) initView();
  const sim = G.started ? dt : raw; // 타이틀 화면에서도 거리가 살아 있게
  const px = G.me.pos.x,
    pz = G.me.pos.z;
  const moved = Math.hypot(px - meX, pz - meZ);
  meV = sim > 0 && moved < 6 ? moved / sim : 0; // 순간이동·포탈 도약은 달리기로 치지 않는다
  meX = px;
  meZ = pz;
  const active = Math.abs(px) < CITY_HALF + ACTIVE_MARGIN && Math.abs(pz) < CITY_HALF + ACTIVE_MARGIN;
  if (!active) {
    agents.length = 0;
    filled = false;
  } else if (sim > 0) {
    if (!filled) {
      for (let i = 0; i < CAP * 8 && agents.length < CAP; i++) spawn(SPAWN_MIN_DIST * 0.75);
      filled = true; // 처음 한 번만 한꺼번에 채운다. 이후는 초당 SPAWN_PER_SEC 명
    }
    spawnAcc = Math.min(2, spawnAcc + sim * SPAWN_PER_SEC);
    while (spawnAcc >= 1 && agents.length < CAP) {
      spawnAcc--;
      spawn(SPAWN_MIN_DIST);
    }
    for (let i = agents.length - 1; i >= 0; i--) {
      step(agents[i], sim);
      if (agents[i].gone) {
        agents[i] = agents[agents.length - 1];
        agents.pop();
      }
    }
  }
  view!.draw(agents, agents.length, G.camera.position.x, G.camera.position.z);
  showBubbles(active && !paused());
}

export const crowdSystem: GameSystem = {id: 'crowd', update};

/** 다른 시스템(위장 수호신 W5, 테스트)이 쓰는 읽기 전용 창구 */
export const crowdApi = {
  count: () => agents.filter(p => !p.leaving).length,
  positions: () => agents.map(p => ({x: p.x, z: p.z})),
  /** 반지름 r 안에서 가장 가까운 행인의 번호 (없으면 −1) */
  nearest(x: number, z: number, r: number) {
    let best = -1,
      bd = r;
    agents.forEach((p, i) => {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bd) [best, bd] = [i, d];
    });
    return best;
  },
};
