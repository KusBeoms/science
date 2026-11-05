// 기존 조각들을 관절별로 나눈다. 로직은 refs.legFL/FR/BL/BR, earL/R, tail.rotation 으로 접근.
import {lowMat, mergeGeometries} from './lowpoly/merge.js';
export function rigPet(parts: any[], root: any, kind: string) {
  const body: any[] = [], groups = new Map<string, any[]>();
  for (const p of parts) {
    p.computeBoundingBox();
    const {min: a, max: b} = p.boundingBox, x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
    let name = '';
    if (b.y <= 0.42 && b.x - a.x < 0.2 && b.z - a.z < 0.25) name = `leg${z >= 0 ? 'F' : 'B'}${x < 0 ? 'L' : 'R'}`;
    else if (a.y > 0.68 && b.x - a.x < 0.2 && kind !== 'robot') name = x < 0 ? 'earL' : 'earR';
    else if (b.z < -0.3 && b.x - a.x < 0.28) name = 'tail';
    if (name) (groups.get(name) || groups.set(name, []).get(name)!).push(p);
    else body.push(p);
  }
  root.add(new THREE.Mesh(mergeGeometries(body), lowMat()));
  const refs: Record<string, any> = {};
  groups.forEach((list, name) => {
    const geo = mergeGeometries(list); geo.computeBoundingBox();
    const bb = geo.boundingBox, pivot = new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y, (bb.min.z + bb.max.z) / 2);
    geo.translate(-pivot.x, -pivot.y, -pivot.z);
    const joint = new THREE.Group(); joint.name = name; joint.position.copy(pivot);
    joint.add(new THREE.Mesh(geo, lowMat())); root.add(joint); refs[name] = joint;
  });
  root.userData.rig = refs;
}
