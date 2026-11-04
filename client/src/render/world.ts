// 씬 구성: 렌더러·카메라·조명·별·타일·상점·단계 타일/문/수호자·플레이어·라이벌
import {G} from '../core/runtime.js';
import {rnd} from '../core/util.js';
import {LAY} from '../core/layout.js';
import {SHOP_AT, SPAWN, slotPos} from '../core/geometry.js';
import {P} from '../data/planets.js';
import {SLOTMAX, SH, SS, TS, Z} from '../data/zones.js';
import {blocky, applyLook} from './characters.js';
import {makeGuardian} from './guardian.js';
import {buildSpringOnHand, buildBag} from './gear.js';
import {applyDeco} from './deco.js';
import {checkerTex, label, makePlanet} from './textures.js';

export function initWorld() {
  G.renderer = new THREE.WebGLRenderer({antialias: true});
  G.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  G.renderer.setSize(innerWidth, innerHeight);
  document.body.prepend(G.renderer.domElement);
  G.scene = new THREE.Scene();
  G.scene.background = new THREE.Color(0x070a18);
  G.scene.fog = new THREE.Fog(0x070a18, 160, 520);
  G.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1200);
  G.scene.add(new THREE.HemisphereLight(0xaac4ff, 0x303850, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(40, 80, 30);
  G.scene.add(sun);
  const sp = new Float32Array(1800 * 3);
  for (let i = 0; i < 1800; i++) {
    const a = rnd(0, 6.28),
      b = Math.acos(rnd(-1, 1)),
      r = 650;
    sp[i * 3] = r * Math.sin(b) * Math.cos(a);
    sp[i * 3 + 1] = r * Math.cos(b);
    sp[i * 3 + 2] = r * Math.sin(b) * Math.sin(a) - 100;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  G.starPts = new THREE.Points(sg, new THREE.PointsMaterial({color: 0xffffff, size: 1.8, fog: false}));
  G.scene.add(G.starPts);
  // 정사각형 타일
  const tile = (cz: number, a: string, b: string, edge: number, sz?: number) => {
    sz = sz || TS;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(sz, 0.6, sz),
      new THREE.MeshLambertMaterial({map: checkerTex(a, b, sz / 4)})
    );
    m.position.set(0, -0.3, cz);
    G.scene.add(m);
    const e = new THREE.Mesh(
      new THREE.BoxGeometry(sz + 0.5, 0.5, sz + 0.5),
      new THREE.MeshLambertMaterial({color: edge})
    );
    e.position.set(0, -0.85, cz);
    G.scene.add(e);
    return m;
  };
  G.baseFloor = tile(0, '#3c8f48', '#358040', 0x1c3a22);
  const bl = label('내 기지', '#9dffb0', 12);
  bl.position.set(0, 9, 10);
  G.scene.add(bl);
  for (let i = 0; i < SLOTMAX; i++) {
    const p = slotPos(i),
      ped = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 2.6), new THREE.MeshLambertMaterial({color: 0xcfd6e6}));
    ped.position.set(p.x, 0.4, p.z);
    G.scene.add(ped);
    G.baseMesh.push({ped, id: -1, grp: null});
  }
  // 상점 + 점원
  const shop = new THREE.Group(),
    lam = (c: number) => new THREE.MeshLambertMaterial({color: c});
  const sb = (w: number, h: number, d: number, c: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c));
    m.position.set(x, y, z);
    shop.add(m);
    return m;
  };
  sb(9, 1.6, 2.6, 0x8a5a2a, 0, 0.8, 1.6);
  sb(0.5, 6, 0.5, 0xdddddd, -4.2, 3, 2.6);
  sb(0.5, 6, 0.5, 0xdddddd, 4.2, 3, 2.6);
  sb(10, 0.5, 5.6, 0xd23a4a, 0, 6.2, 0.8);
  sb(10, 0.3, 0.8, 0xffffff, 0, 5.9, 3.4);
  sb(9, 5, 0.5, 0x3a3a50, 0, 2.5, -1.4);
  const sl = label('🛒 상점', '#ffd27a', 8);
  sl.position.set(0, 8.4, 1);
  shop.add(sl);
  shop.position.set(SHOP_AT.x, 0, SHOP_AT.z - 1);
  G.scene.add(shop);
  G.npc = blocky(0x2f9e6e, 0x333344, '#f0c8a0', 0.7, 0xd23a4a);
  G.npc.position.set(SHOP_AT.x, 0, SHOP_AT.z + 1.2);
  G.npc.userData.pick = {kind: 'npc'};
  G.scene.add(G.npc);
  // 단계 타일 + 문 + 수호자
  Z.forEach((z, zi) => {
    tile(z.z, z.col[0], z.col[1], 0x10141f, SS);
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(SS + 0.2, 0.1, SS + 0.2),
      new THREE.MeshBasicMaterial({color: z.gc, wireframe: true})
    );
    rim.position.set(0, 0.02, z.z);
    G.scene.add(rim);
    const lt = label(`${zi + 1}단계 · ${z.ic} ${z.n}`, '#ffffff', 14);
    lt.position.set(0, 9, z.z - SH + 3);
    G.scene.add(lt);
    G.nestMesh.push([]);
    const L = LAY[zi];
    L.items.forEach(() => {
      G.nestMesh[zi].push({id: -1, grp: null});
    });
    L.stars.forEach(st => {
      // 항성(또는 블랙홀) + 궤도선 + 이름표
      const gs = new THREE.Group(),
        y = st.R + 2;
      if (st.bh) {
        gs.add(new THREE.Mesh(new THREE.SphereGeometry(st.R, 32, 16), new THREE.MeshBasicMaterial({color: 0})));
        const dk = new THREE.Mesh(
          new THREE.RingGeometry(st.R + 1.5, st.R + 6, 64),
          new THREE.MeshBasicMaterial({color: st.c[0], side: THREE.DoubleSide, transparent: true, opacity: 0.85})
        );
        dk.rotation.x = Math.PI / 2.3;
        gs.add(dk);
      } else {
        gs.add(new THREE.Mesh(new THREE.SphereGeometry(st.R, 28, 18), new THREE.MeshBasicMaterial({color: st.c[0]})));
        const hl = new THREE.Mesh(
          new THREE.SphereGeometry(st.R * 1.45, 20, 14),
          new THREE.MeshBasicMaterial({color: st.c[1], transparent: true, opacity: 0.2, depthWrite: false})
        );
        gs.add(hl);
      }
      gs.position.set(st.x, y, st.z);
      G.scene.add(gs);
      const nl = label(st.n, '#ffe9b0', 9);
      nl.position.set(st.x, y + st.R + 3, st.z);
      G.scene.add(nl);
      for (let i = 0; i < st.orb; i++) {
        const r = st.R + 6 + i * 2.4,
          rg = new THREE.Mesh(
            new THREE.RingGeometry(r - 0.08, r + 0.08, 72),
            new THREE.MeshBasicMaterial({color: st.c[0], transparent: true, opacity: 0.28, side: THREE.DoubleSide})
          );
        rg.rotation.x = -Math.PI / 2;
        rg.position.set(st.x, 0.06, st.z);
        G.scene.add(rg);
      }
    });
    const gd = makeGuardian(z, zi);
    gd.position.set(z.x, 0, z.z);
    G.scene.add(gd);
    G.guards.push({m: gd, chase: false, home: new THREE.Vector3(z.x, 0, z.z)});
    // 문(아치): 이 단계의 남쪽 경계
    const gz = z.z + SH,
      grp = new THREE.Group();
    const pm = lam(0x8a93a8),
      pl1 = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 2), pm),
      pl2 = pl1.clone(),
      bm = new THREE.Mesh(new THREE.BoxGeometry(SS, 2, 2), pm);
    pl1.position.set(-SH + 1, 5, 0);
    pl2.position.set(SH - 1, 5, 0);
    bm.position.set(0, 10, 0);
    grp.add(pl1, pl2, bm);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(SS - 4, 9),
      new THREE.MeshBasicMaterial({
        color: 0xff3355,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    panel.position.set(0, 4.5, 0);
    grp.add(panel);
    const gl = label('', '#ff8aa0', 16);
    gl.position.set(0, 12.5, 0);
    grp.add(gl);
    grp.position.set(0, 0, gz);
    grp.userData.pick = {kind: 'gate', i: zi};
    G.scene.add(grp);
    G.gates.push({grp, panel, gl, pm});
  });
  // 배경 천체 (4단계 뒤의 폴리페무스)
  const poly = makePlanet(P.findIndex(p => p.name === '폴리페무스'));
  poly.scale.setScalar(14);
  poly.position.set(0, 40, Z[3].z - SH - 40);
  G.scene.add(poly);
  // 플레이어 / 라이벌
  G.me = blocky(0x3b82f6, 0x4a9a4a, '#f4d03f');
  G.me.pos = G.me.position;
  G.me.vy = 0;
  G.me.pos.set(SPAWN.x, 0, SPAWN.z);
  G.scene.add(G.me);
  applyLook();
  buildSpringOnHand();
  buildBag();
  G.rival = blocky(0xd23a4a, 0x333333, '#e8b090');
  G.rival.visible = false;
  G.rival.state = 'off';
  G.scene.add(G.rival);
  G.rival.mark = label('라이벌!', '#ff6a7a', 6);
  G.rival.mark.position.set(0, 9.5, 0);
  G.rival.add(G.rival.mark);
  G.rival.mark.scale.multiplyScalar(1 / 0.55);
  G.decoGrp = new THREE.Group();
  G.scene.add(G.decoGrp);
  applyDeco();
  G.clock = new THREE.Clock();
}
