// 야생 동물 5종. 앞=+z, 발밑=0. ref 관절은 펫과 같은 이름을 쓴다.
import {PAL} from './lowpoly/palette.js';
import {box, cone} from './lowpoly/prim.js';
import {lowMat, mergeGeometries} from './lowpoly/merge.js';
export type AnimalKind = 'cow' | 'rabbit' | 'deer' | 'camel' | 'duck';
export function animalModel(kind: AnimalKind) {
  const g = new THREE.Group(), body: any[] = [], refs: Record<string, any> = {};
  const part = (name: string, x: number, y: number, z: number, parts: any[]) => {
    const joint = new THREE.Group(); joint.name = name; joint.position.set(x, y, z);
    joint.add(new THREE.Mesh(mergeGeometries(parts), lowMat())); refs[name] = joint; g.add(joint);
  };
  const specs = {
    cow: [1.8, 1.5, 3.2, 1.2, PAL.cloud], rabbit: [0.7, 0.7, 1.1, 0.3, PAL.bone],
    deer: [1, 1.1, 2.2, 1.5, PAL.clay], camel: [1.5, 1.4, 3, 1.8, PAL.amber], duck: [0.7, 0.5, 1, 0.2, PAL.white],
  }[kind];
  const [w, h, d, y, c] = specs;
  body.push(box(w, h, d, c, 0, y));
  const headY = kind === 'camel' ? 3.8 : kind === 'deer' ? 2.4 : y + h * 0.4, hz = d * 0.7;
  const hw = kind === 'cow' ? 1.1 : w * 0.65;
  body.push(box(hw, hw, hw, kind === 'duck' ? PAL.green : c, 0, headY, hz));
  if (kind === 'camel' || kind === 'deer') body.push(box(w * 0.35, headY - y, w * 0.4, c, 0, y + h * 0.4, d * 0.55));
  if (kind === 'camel') body.push(cone(0.65, 1.2, c, 0, y + h, -0.25, 0, 5));
  if (kind === 'cow') body.push(box(0.9, 0.5, 0.9, PAL.coal, 0.2, 1.7, 0.2), box(0.8, 0.4, 0.3, PAL.pink, 0, headY, hz + hw / 2));
  if (kind === 'duck') body.push(box(0.3, 0.12, 0.3, PAL.orange, 0, headY, hz + hw / 2));
  for (const s of [-1, 1]) {
    body.push(box(hw * 0.13, hw * 0.16, 0.04, PAL.ink, s * hw * 0.25, headY + hw * 0.6, hz + hw / 2 + 0.02));
    if (kind !== 'duck') part(s < 0 ? 'earL' : 'earR', s * hw * 0.58, headY + hw * 0.85, hz, [box(hw * 0.22, kind === 'rabbit' ? 0.7 : hw * 0.25, hw * 0.18, c)]);
    if (kind === 'deer') {
      body.push(box(0.1, 0.7, 0.1, PAL.bone, s * 0.25, 3, hz), box(0.4, 0.1, 0.1, PAL.bone, s * 0.34, 3.45, hz));
    }
  }
  const legH = y + 0.1, legW = kind === 'duck' ? 0.1 : w * 0.2;
  for (const front of (kind === 'duck' ? [true] : [true, false])) for (const s of [-1, 1]) part(`leg${front ? 'F' : 'B'}${s < 0 ? 'L' : 'R'}`, s * w * 0.32, legH, (front ? 1 : -1) * d * 0.32, [box(legW, legH, legW, kind === 'duck' ? PAL.orange : c, 0, -legH)]);
  part('tail', 0, y + h * 0.55, -d / 2, [box(w * 0.15, w * 0.15, d * 0.24, c, 0, 0, -d * 0.12)]);
  g.add(new THREE.Mesh(mergeGeometries(body), lowMat()));
  g.userData.rig = refs;
  return g;
}
