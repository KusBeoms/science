// 컷신 배우: kind 별 월드 오브젝트 생성·구동·정리. 'player' 는 실제 G.me 를 빌려 쓰고 종료 시 원상 복구한다
import {G} from '../core/runtime.js';
import {animateWalk, blocky} from '../render/characters.js';
import {makeGuardian} from '../render/guardian.js';
import {buildApple, pulseHalo} from '../render/apple.js';
import {freeTree} from '../render/textures.js';
import type {ActKey, ActorKind, Anim, Setup, Vec3} from '../data/cutscene-types.js';
import {num, step, vec} from './cutscene-track.js';

export interface Actor {
  obj: any;
  /** 말풍선 앵커: 오브젝트 위로 띄울 월드 단위 높이 */
  top: number;
  own: boolean;
  s0: number;
  tick?: (t: number) => void;
  saved?: {pos: any; ry: number};
}
type Built = Pick<Actor, 'obj' | 'top' | 'tick'>;
const basic = (c: number) => new THREE.MeshBasicMaterial({color: c, fog: false}),
  lit = (c: number, e: number) => new THREE.MeshStandardMaterial({color: c, emissive: e, roughness: 0.6, fog: false}),
  mesh = (geo: any, m: any, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    return o;
  };
const BUILD: Record<ActorKind, () => Built> = {
  player: () => ({obj: G.me, top: 4.2}),
  apple: () => {
    const a = buildApple();
    a.group.scale.setScalar(22);
    return {obj: a.group, top: 30, tick: t => pulseHalo(a, t)};
  },
  ring: () => {
    const g = new THREE.Group(),
      tilt = new THREE.Group(),
      spin = new THREE.Group();
    spin.add(mesh(new THREE.TorusGeometry(34, 0.9, 8, 72), basic(0xffd24a)));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const c = mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.6, 14), basic(0xffb300), Math.cos(a) * 34, Math.sin(a) * 34, 0);
      c.rotation.x = Math.PI / 2;
      spin.add(c);
    }
    tilt.rotation.x = 1.15;
    tilt.add(spin);
    g.add(tilt);
    return {obj: g, top: 0, tick: t => (spin.rotation.z = t * 0.7)};
  },
  coin: () => {
    const g = new THREE.Group(),
      m = lit(0xffc21a, 0x5a4000);
    for (let i = 0; i < 16; i++) g.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.8, 16), m, Math.cos(i * 2.4) * (7 - i * 0.35), i * 0.85, Math.sin(i * 2.4) * (7 - i * 0.35)));
    return {obj: g, top: 16};
  },
  line: () => {
    const p = mesh(new THREE.PlaneGeometry(40, 1.2), basic(0xffd24a), 0, 0.06, 0);
    p.rotation.x = -Math.PI / 2;
    return {obj: p, top: 1};
  },
  sprout: () => {
    const g = new THREE.Group(),
      m = lit(0x4caf50, 0x103a14);
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.4, 6), m, 0, 0.7, 0), mesh(new THREE.SphereGeometry(0.6, 8, 6), m, -0.6, 1.5, 0), mesh(new THREE.SphereGeometry(0.6, 8, 6), m, 0.6, 1.6, 0));
    return {obj: g, top: 2.4};
  },
  knife: () => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.5, 5, 0.15), lit(0xc8d0dc, 0x202830), 0, 2.5, 0), mesh(new THREE.BoxGeometry(1.6, 0.3, 0.4), lit(0x5a3a1a, 0), 0, 0, 0), mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), lit(0x3a2410, 0), 0, -0.9, 0));
    return {obj: g, top: 3};
  },
  triple: () => {
    const g = new THREE.Group();
    [0xff9a4a, 0x7cc4ff, 0xc89aff].forEach((c, i) => g.add(mesh(new THREE.SphereGeometry(2.4, 16, 12), lit(c, c & 0x555555), (i - 1) * 5, i === 1 ? 2 : 0, 0)));
    return {obj: g, top: 6};
  },
  guard: () => ({obj: makeGuardian(0xff5a30), top: 12}),
  npc: () => ({obj: blocky(0x6a9a7a, 0x445566, '#e0b090'), top: 4.2}),
  silhouette: () => ({obj: blocky(0x050505, 0x050505, '#050505'), top: 4.2}),
};

export function spawnActors(setup: Setup | undefined, o: Vec3, lock: boolean): Map<string, Actor> {
  const m = new Map<string, Actor>();
  (setup?.actors || []).forEach(d => {
    const b = BUILD[d.kind](),
      own = d.kind !== 'player',
      a: Actor = {...b, own, s0: b.obj.scale.x};
    if (!own) {
      a.saved = {pos: b.obj.position.clone(), ry: b.obj.rotation.y};
      if (lock) b.obj.position.set(o[0] + d.pos[0], o[1] + d.pos[1], o[2] + d.pos[2]);
      if (lock && d.yaw !== undefined) b.obj.rotation.y = d.yaw;
    } else {
      b.obj.position.set(o[0] + d.pos[0], o[1] + d.pos[1], o[2] + d.pos[2]);
      b.obj.rotation.y = d.yaw || 0;
      G.scene.add(b.obj);
    }
    m.set(d.id, a);
  });
  return m;
}
export function pose(o: any, anim: Anim, t: number) {
  const p = o.userData;
  if (!p.armL) return;
  const set = (l: number, r: number, al: number, ar: number) => {
    p.legL.rotation.x = l;
    p.legR.rotation.x = r;
    p.armL.rotation.x = al;
    p.armR.rotation.x = ar;
  };
  if (anim === 'walk') animateWalk(o, t);
  else if (anim === 'run') animateWalk(o, t * 2);
  else if (anim === 'grab') set(0, 0, 0, -2.5 + Math.sin(t * 6) * 0.15);
  else if (anim === 'cheer') set(0, 0, -2.8, -2.8 + Math.sin(t * 10) * 0.3);
  else if (anim === 'shock') set(0, 0, -0.5 + Math.sin(t * 30) * 0.1, -0.5 - Math.sin(t * 30) * 0.1);
  else set(0, 0, 0, 0);
}
/** t 시점의 키프레임으로 배우를 구동. move=false(입력 비차단 오버레이의 player)면 위치·방향은 건드리지 않는다 */
export function driveActor(a: Actor, kf: ActKey[], t: number, o: Vec3, all: Map<string, Actor>, clock: number, lock: boolean) {
  const anim = step<Anim>(kf, t, 'anim') || 'idle',
    follow = step<string>(kf, t, 'follow'),
    pos = vec(kf, t, 'pos'),
    yaw = num(kf, t, 'yaw'),
    sc = num(kf, t, 'scale') ?? 1;
  if (a.own || lock) {
    if (pos) {
      const base = (follow && all.get(follow)?.obj.position) || {x: o[0], y: o[1], z: o[2]};
      a.obj.position.set(base.x + pos[0], base.y + pos[1], base.z + pos[2]);
    }
    if (yaw !== undefined) a.obj.rotation.y = yaw;
  }
  a.obj.scale.set(a.s0 * sc, a.s0 * sc * (anim === 'melt' ? 0.35 : 1), a.s0 * sc);
  a.obj.visible = anim !== 'hide' && step<boolean>(kf, t, 'visible') !== false;
  pose(a.obj, anim === 'melt' || anim === 'hide' ? 'idle' : anim, clock);
}
export function disposeActors(m: Map<string, Actor>) {
  m.forEach(a => {
    if (a.own) {
      G.scene.remove(a.obj);
      freeTree(a.obj);
    } else {
      a.obj.position.copy(a.saved!.pos);
      a.obj.rotation.y = a.saved!.ry;
      a.obj.scale.setScalar(a.s0);
      a.obj.visible = true;
      pose(a.obj, 'idle', 0);
    }
  });
}
