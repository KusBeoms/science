// 텍스처·라벨·행성 메시 생성 / 해제
import {P} from '../data/planets.js';
import type {Planet} from '../core/types.js';

const texCache: Record<number, any> = {};
export function planetTex(p: Planet) {
  if (texCache[p.id]) return texCache[p.id];
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, p.c1);
  g.addColorStop(0.5, p.c2);
  g.addColorStop(1, p.c1);
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 128);
  let s = p.id * 9301 + 49297;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const band = p.fx.includes('band');
  x.globalAlpha = 0.2;
  for (let i = 0; i < (band ? 16 : 40); i++) {
    x.fillStyle = r() < 0.5 ? p.c1 : '#000';
    if (band) x.fillRect(0, r() * 128, 256, 4 + r() * 10);
    else {
      x.beginPath();
      x.ellipse(r() * 256, r() * 128, 6 + r() * 22, 4 + r() * 12, 0, 0, 7);
      x.fill();
    }
  }
  return (texCache[p.id] = new THREE.CanvasTexture(c));
}
export const planetR = (p: Planet) => 0.6 + 0.35 * Math.log10(1 + p.R);
const SPH_GEO = typeof THREE !== 'undefined' ? new THREE.SphereGeometry(1, 24, 16) : null; // 모든 행성이 공유
/** 행성 하나가 쓰던 재질·고리를 해제 (공유 지오메트리와 캐시된 텍스처는 남긴다) */
export function freePlanet(g: any) {
  if (!g) return;
  const u = g.userData;
  if (u && u.mat) u.mat.dispose();
  g.children.forEach((c: any) => {
    if (c !== u.sph && c.geometry) {
      c.geometry.dispose();
      c.material.dispose();
    }
  });
}
/** 트리의 지오메트리·재질·텍스처를 해제한다. userData.keep 인 공유 지오메트리/재질은 남긴다 */
export function freeTree(o: any) {
  o.traverse((c: any) => {
    if (c.geometry && !c.geometry.userData.keep) c.geometry.dispose();
    if (c.material) {
      const ms = Array.isArray(c.material) ? c.material : [c.material];
      ms.forEach((m: any) => {
        if (m.userData.keep) return;
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
}
export function makePlanet(id: number) {
  const p = P[id],
    grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({map: planetTex(p), roughness: 0.85, metalness: 0});
  if (p.fx.includes('glow')) {
    mat.emissive = new THREE.Color(p.c1);
    mat.emissiveIntensity = p.fx.includes('star') ? 0.9 : 0.35;
  }
  const sph = new THREE.Mesh(SPH_GEO, mat);
  if (p.fx.includes('egg')) sph.scale.x = 1.2;
  grp.add(sph);
  if (p.fx.includes('ring')) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.2, 48),
      new THREE.MeshBasicMaterial({color: 0xe8d9b0, side: THREE.DoubleSide, transparent: true, opacity: 0.75})
    );
    ring.rotation.x = Math.PI / 2.2;
    grp.add(ring);
  }
  grp.userData = {mat, r: planetR(p), sph};
  return grp;
}
export function label(text: string, color: string, w: number) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const x = c.getContext('2d')!;
  x.font = 'bold 54px sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineWidth = 8;
  x.strokeStyle = '#000';
  x.strokeText(text, 256, 48);
  x.fillStyle = color;
  x.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map: tex, transparent: true}));
  sp.scale.set(w, (w * 96) / 512, 1);
  sp.userData.setText = (t: string, col?: string) => {
    x.clearRect(0, 0, 512, 96);
    x.lineWidth = 8;
    x.strokeStyle = '#000';
    x.strokeText(t, 256, 48);
    x.fillStyle = col || color;
    x.fillText(t, 256, 48);
    tex.needsUpdate = true;
  };
  return sp;
}
export function checkerTex(a: string, b: string, n: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = a;
  x.fillRect(0, 0, 64, 64);
  x.fillStyle = b;
  x.fillRect(0, 0, 32, 32);
  x.fillRect(32, 32, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.repeat.set(n, n);
  return t;
}
