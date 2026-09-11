import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/meshopt_decoder.module.js';

// The geometry is authored and exported by Blender, not assembled in the browser.
export function buildRoom(scene,renderer){
  const abort=new AbortController(),obstacles=[];
  let closed=false,model;
  const lights=[];
  const add=o=>{scene.add(o);lights.push(o);return o;};
  add(new THREE.AmbientLight('#ffffff',1.05));
  add(new THREE.HemisphereLight('#f5f7ff','#d5d0c0',1.55));
  const sun=add(new THREE.DirectionalLight('#fff4df',2.1));
  sun.position.set(-4.3,2.95,1.5);sun.target.position.set(1,0,-1);add(sun.target);sun.castShadow=true;
  sun.shadow.mapSize.set(1536,1536);
  Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.08,far:20});
  sun.shadow.bias=-.0002;sun.shadow.normalBias=.015;sun.shadow.radius=3;
  const fill=add(new THREE.DirectionalLight('#e8efff',.8));fill.position.set(3.5,2.7,3.8);
  function disposeModel(root){
    const resources=new Set();
    root.traverse(o=>{if(!o.isMesh)return;resources.add(o.geometry);for(const m of [].concat(o.material)){resources.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.add(value);}});
    resources.forEach(o=>{if(o.isTexture)o.source?.data?.close?.();o.dispose();});root.removeFromParent();
  }
  const ready=(async()=>{
    const read=async path=>{const r=await fetch(path,{signal:abort.signal});if(!r.ok)throw new Error(`Tour asset ${r.status}`);return r;};
    const [binary,layout]=await Promise.all([
      read('/assets/tour/room-jurmala.glb?v=blender-1').then(r=>r.arrayBuffer()),
      read('/assets/tour/room-layout.json?v=blender-1').then(r=>r.json())
    ]);
    if(closed)throw new DOMException('Tour closed','AbortError');
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf=await loader.parseAsync(binary,'');
    if(closed){disposeModel(gltf.scene);throw new DOMException('Tour closed','AbortError');}
    model=gltf.scene;
    model.traverse(o=>{
      if(!o.isMesh)return;
      const materials=[].concat(o.material);
      o.castShadow=!materials.some(m=>/curtain|Daylight|diffuser|plaster/i.test(m.name));o.receiveShadow=true;
      for(const m of materials){
        if(m.transparent)m.depthWrite=false;
        for(const value of Object.values(m))if(value?.isTexture)value.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      }
    });
    scene.add(model);obstacles.push(...layout.obstacles);
    scene.userData.modelSource='Blender 5.2';
    return model;
  })();
  return {ready,obstacles,dispose(){
    if(closed)return;closed=true;abort.abort();if(model)disposeModel(model);
    lights.forEach(o=>o.removeFromParent());sun.shadow.map?.dispose();
  }};
}
