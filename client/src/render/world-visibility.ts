// Large static districts can remain in memory while fully hidden by opaque fog.
// Fog is based on camera depth; a conservative bounding sphere keeps edge scenery visible.
import {G} from '../core/runtime.js';
const groups:{group:any;sphere:any}[]=[];
export function fogDistrict(group:any) {
  group.updateMatrixWorld(true);
  const bounds=new THREE.Box3(),box=new THREE.Box3(),matrix=new THREE.Matrix4();
  // r128 Box3.setFromObject does not expand InstancedMesh instance transforms.
  group.traverse((o:any)=>{
    const geo=o.geometry;if(!geo?.attributes?.position)return;
    if(!geo.boundingBox)geo.computeBoundingBox();
    if(o.isInstancedMesh)for(let i=0;i<o.count;i++) {
      o.getMatrixAt(i,matrix);box.copy(geo.boundingBox).applyMatrix4(matrix).applyMatrix4(o.matrixWorld);bounds.union(box);
    }
    else bounds.union(box.copy(geo.boundingBox).applyMatrix4(o.matrixWorld));
  });
  if(!bounds.isEmpty())groups.push({group,sphere:bounds.getBoundingSphere(new THREE.Sphere())});
  return group;
}
const forward=new THREE.Vector3(),delta=new THREE.Vector3();
export function updateWorldVisibility() {
  const overview=G.camera?.isOrthographicCamera,far=G.scene?.fog?.far;
  if(!G.camera)return;
  G.camera.getWorldDirection(forward);
  for(const t of groups) {
    const depth=delta.copy(t.sphere.center).sub(G.camera.position).dot(forward)-t.sphere.radius;
    t.group.visible=overview||!Number.isFinite(far)||depth<far;
  }
}
