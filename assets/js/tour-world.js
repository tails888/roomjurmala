import * as THREE from '../vendor/three.module.js';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';

// An editable, photo-based model. Dimensions are estimates, not a measured survey.
export function buildRoom(scene,renderer){
  const obstacles=[],disposables=new Set(),meshes=[];
  const rng=(()=>{let n=147;return()=>{n=(n*16807)%2147483647;return (n-1)/2147483646;};})();
  const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.82,...extra});disposables.add(m);return m;};
  const white=mat('#ede9df'),plaster=mat('#e1ddd3'),cream=mat('#d5c7ad'),dark=mat('#222b29'),green=mat('#294b3c'),metal=mat('#b4b7b1',{metalness:.65,roughness:.3});
  const colors=['#c37348','#e1bd68','#739b9d','#b8a5bb','#438075','#d7cfb3'].map(c=>mat(c));
  function grain(base,variation,wood=false){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),im=ctx.createImageData(256,256);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const v=(rng()-.5)*variation+(wood?Math.sin(x*.13+Math.sin(y*.018)*3)*9:0),i=(y*256+x)*4;
      base.forEach((n,k)=>im.data[i+k]=n+v);im.data[i+3]=255;
    }
    ctx.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(wood?2:14,wood?3:18);t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());disposables.add(t);return t;
  }
  const floorMap=grain([167,164,153],14),rugMap=grain([115,111,109],55),woodMap=grain([166,132,92],13,true);
  const floor=mat('#ffffff',{map:floorMap}),rug=mat('#ffffff',{map:rugMap}),wood=mat('#ffffff',{map:woodMap,roughness:.6});
  const loader=new THREE.TextureLoader();
  const brickMap=loader.load('/assets/tour/brick.jpg');brickMap.colorSpace=THREE.SRGBColorSpace;brickMap.wrapS=brickMap.wrapT=THREE.RepeatWrapping;brickMap.repeat.set(5,2.7);disposables.add(brickMap);
  const brick=mat('#ffffff',{map:brickMap,bumpMap:brickMap,bumpScale:.022});
  const boxGeo=new THREE.BoxGeometry(1,1,1);disposables.add(boxGeo);
  function mesh(geo,m,x,y,z){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);meshes.push(o);disposables.add(geo);return o;}
  function box(x,y,z,w,h,d,m,round=0){const o=mesh(round?new RoundedBoxGeometry(w,h,d,2,Math.min(round,w/3,h/3,d/3)):boxGeo,m,x,y,z);if(!round)o.scale.set(w,h,d);return o;}
  function ball(x,y,z,r,m){return mesh(new THREE.SphereGeometry(r,12,8),m,x,y,z);}
  function cylinder(x,y,z,r,h,m,r2=r){return mesh(new THREE.CylinderGeometry(r,r2,h,16),m,x,y,z);}
  function solid(x,z,w,d){obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
  function bar(a,b,r,m){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),dir=end.clone().sub(start);const o=cylinder(0,0,0,r,dir.length(),m);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return o;}

  // Building envelope, carpet, ceiling beam, right-hand kitchen alcove.
  box(0,-.07,0,10.2,.14,13.2,floor);box(-1.5,.012,-2.15,6.8,.024,8.3,rug);
  box(0,3.2,0,10.2,.18,13.2,white);
  box(-1.8,1.58,-6.55,6.4,3.2,.16,brick);box(3.25,1.58,-6.55,3.5,3.2,.16,plaster);
  box(5.05,1.58,0,.15,3.2,13.1,plaster);box(0,1.58,6.55,10.1,3.2,.15,white);
  box(0,2.95,2.1,10,.4,.5,white);
  box(1.7,1.58,-5.18,.22,3.2,2.6,plaster);solid(1.7,-5.18,.22,2.6);
  box(3.2,1.58,2.1,.5,3.2,.5,white);solid(3.2,2.1,.5,.5);
  box(-4.8,1.58,2.1,.4,3.2,.5,white);solid(-4.8,2.1,.4,.5);
  // Left wall and luminous window bays, with thin translucent pleated curtains.
  box(-5.05,.27,0,.14,.54,13.1,white);box(-5.05,2.97,0,.14,.45,13.1,white);
  const sky=mat('#dde5d7',{emissive:'#cddcc8',emissiveIntensity:.65,roughness:1});
  const curtain=mat('#fffdf4',{transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false});
  for(let z=-5.25;z<6;z+=2.3){
    box(-5.05,1.6,z,.08,2.28,2.16,sky).castShadow=false;
    box(-4.94,1.6,z-1.12,.15,2.5,.075,white);box(-4.94,1.6,z,.13,2.5,.035,white);
    box(-4.91,1.72,z,.15,.035,2.2,white);box(-4.89,.5,z,.36,.09,2.28,white);
    const geo=new THREE.PlaneGeometry(2.23,2.72,32,1),p=geo.attributes.position;
    for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*39)*.026);geo.computeVertexNormals();
    const cloth=mesh(geo,curtain,-4.7,1.51,z);cloth.rotation.y=Math.PI/2;cloth.castShadow=false;
  }
  // Door, hook rail and entrance mat.
  box(-3.55,1.25,6.43,1.14,2.5,.1,dark);box(-3.55,1.42,6.36,.91,1.8,.04,sky);
  bar([-3.92,1.0,6.25],[-3.92,1.38,6.25],.022,metal);box(-3.55,.025,5.85,1.15,.03,.78,rug);
  box(-1.8,1.78,6.4,1.5,.1,.07,wood);for(let x=-2.35;x<-.99;x+=.27)bar([x,1.77,6.37],[x,1.72,6.19],.012,dark);

  function shelf(x,z,n,turn=0){
    const w=n*.47,h=.94,d=.39,group=[];
    const local=(a,b,c,W,H,D,m)=>{const X=x+a*Math.cos(turn)+c*Math.sin(turn),Z=z-a*Math.sin(turn)+c*Math.cos(turn);const o=box(X,b,Z,W,H,D,m);o.rotation.y=turn;group.push(o);};
    for(const y of [.055,h/2,h])local(0,y,0,w,.045,d,white);
    for(let i=0;i<=n;i++)local(-w/2+i*.47,h/2,0,.035,h,d,white);
    local(0,h/2,-d/2,w,h,.018,cream);
    for(let i=0;i<n;i++)for(let row=0;row<2;row++){
      const a=-w/2+.235+i*.47,y=.10+row*.47;
      if(i%3!==1)local(a,y+.15,0,.35,.30,.31,cream);
      else for(let j=0;j<3;j++)local(a-.11+j*.09,y+.10+ j*.025,.02,.065,.2+j*.05,.2,colors[(i+j+row)%6]);
    }
    if(!turn)solid(x,z,w,d);else solid(x,z,d,w);
  }
  shelf(-1.7,-6.17,13);shelf(2.94,-3.94,5);
  // Toy details on shelving and a bear.
  for(let i=0;i<5;i++){cylinder(-.9+i*.24,1.025,-6.12,.065,.09,colors[i]);ball(-.9+i*.24,1.12,-6.12,.04,colors[(i+1)%6]);}
  const fur=mat('#97754c');ball(-2.9,1.25,-6.08,.19,fur);ball(-2.9,1.53,-6.08,.15,fur);
  ball(-3.02,1.65,-6.08,.067,fur);ball(-2.78,1.65,-6.08,.067,fur);
  ball(-2.96,1.56,-5.94,.017,dark);ball(-2.84,1.56,-5.94,.017,dark);
  for(const sign of [-1,1]){ball(-2.9+sign*.21,1.25,-6.05,.085,fur);ball(-2.9+sign*.12,1.02,-5.92,.085,fur);}
  // Radiator and framed details from the actual venue.
  box(-3.5,1.18,-6.40,1.8,.48,.11,white);for(let x=-4.35;x<-2.65;x+=.065)box(x,1.18,-6.31,.023,.43,.025,cream);
  function picture(x,y,z,w,h,file){
    box(x,y,z,w+.08,h+.08,.055,wood);const t=loader.load('/assets/images/gallery/'+file);t.colorSpace=THREE.SRGBColorSpace;disposables.add(t);
    const m=new THREE.MeshBasicMaterial({map:t});disposables.add(m);mesh(new THREE.PlaneGeometry(w,h),m,x,y,z+.035);
  }
  picture(-3.6,2.11,-6.4,.83,.5,'sunlit-room.jpg');picture(-1.0,2.32,-6.4,.78,.5,'room-open.jpg');

  // Real soft-play layout in restrained versions of the original colours.
  box(-2.6,.10,-4.2,2.1,.20,1.65,colors[3],.055);solid(-2.6,-4.2,2.1,1.65);
  box(-3.5,.28,-4.2,.3,.38,1.65,colors[5],.045);box(-2.6,.28,-4.94,1.8,.38,.25,colors[5],.04);
  box(-2.55,.26,-3.49,1.5,.32,.25,colors[2],.04);
  // A sloped foam ramp with a genuinely traversable surrounding floor.
  const rampShape=new THREE.Shape();rampShape.moveTo(-.6,0);rampShape.lineTo(.6,0);rampShape.lineTo(.6,.62);rampShape.closePath();
  const ramp=mesh(new THREE.ExtrudeGeometry(rampShape,{depth:.72,bevelEnabled:false}),colors[1],-3.08,.2,-4.58);ramp.rotation.y=Math.PI/2;
  box(-.83,.21,-4.35,.57,.42,.57,colors[4],.06);solid(-.83,-4.35,.57,.57);
  for(let i=0;i<3;i++)box(-3.77+i*.42,.18,-2.89,.38,.35,.38,colors[i],.045);
  solid(-3.36,-2.89,1.2,.4);

  // Kitchen cupboards, worktop, sink, tap, stove, kettle and fridge.
  box(3.45,.44,-6.05,2.75,.87,.7,dark);box(3.45,.92,-6.03,2.82,.055,.78,cream);solid(3.45,-6.05,2.82,.78);
  for(let x=2.35;x<4.8;x+=.56){box(x,.46,-5.686,.025,.73,.015,plaster);bar([x+.11,.77,-5.655],[x+.35,.77,-5.655],.009,metal);}
  box(2.59,.954,-6.03,.63,.015,.43,metal);box(2.59,.962,-6.01,.5,.014,.31,dark,.015);
  const faucet=new THREE.TorusGeometry(.115,.013,6,16,Math.PI);const tap=mesh(faucet,dark,2.61,1.19,-6.27);tap.rotation.z=0;bar([2.495,.94,-6.27],[2.495,1.19,-6.27],.013,dark);
  box(3.59,.957,-6.02,.63,.02,.48,dark);for(const x of [3.44,3.75])for(const z of [-6.14,-5.91])cylinder(x,.972,z,.095,.006,metal);
  cylinder(4.32,1.06,-6.13,.095,.23,dark,.08);cylinder(4.0,1.035,-6.12,.047,.17,white);
  box(4.62,1.01,-4.94,.62,2.02,.66,metal,.018);box(4.3,1.1,-4.94,.018,.015,.63,dark);solid(4.62,-4.94,.65,.68);
  // Wall clock with real geometry hands.
  const clock=cylinder(3.58,2.26,-6.42,.19,.035,dark);clock.rotation.x=Math.PI/2;
  bar([3.58,2.26,-6.38],[3.58,2.38,-6.38],.008,white);bar([3.58,2.26,-6.38],[3.66,2.22,-6.38],.008,white);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;ball(3.58+Math.sin(a)*.15,2.26+Math.cos(a)*.15,-6.386,.008,white);}

  function chair(x,z,turn){
    const group=new THREE.Group();scene.add(group);
    const part=(a,y,c,w,h,d,m,round)=>{const o=box(0,0,0,w,h,d,m,round);scene.remove(o);group.add(o);o.position.set(a,y,c);};
    part(0,.47,0,.43,.075,.44,green,.035);part(0,.76,.18,.45,.51,.09,green,.045);
    for(const a of [-.17,.17])for(const c of [-.16,.16])part(a,.235,c,.035,.43,.035,dark);
    group.position.set(x,0,z);group.rotation.y=turn;solid(x,z,.47,.47);
    group.updateMatrixWorld(true); // Static batching below retains local transforms.
  }
  // Two joined oak tables and eight chairs leave a clear route on each side.
  for(const z of [.30,2.0]){
    box(2.4,.77,z,1.15,.065,1.68,wood,.018);
    for(const x of [1.94,2.86])for(const zz of [z-.65,z+.65])box(x,.38,zz,.055,.73,.055,dark);
    solid(2.4,z,1.15,1.68);
  }
  for(const z of [-.18,.75,1.68,2.64]){chair(1.43,z,-Math.PI/2);chair(3.37,z,Math.PI/2);}
  // Small table and chairs beside the toy shelves.
  box(.75,.48,-5.45,.63,.045,.6,wood);for(const x of [.50,1])for(const z of [-5.68,-5.22])box(x,.24,z,.045,.45,.045,wood);solid(.75,-5.45,.7,.7);
  // Table football by the entrance.
  box(-3.4,.74,3.14,1.34,.3,.78,wood);box(-3.4,.904,3.14,1.16,.028,.62,green);solid(-3.4,3.14,1.5,.85);
  for(const x of [-3.9,-2.9])for(const z of [2.86,3.42])box(x,.32,z,.1,.64,.1,dark);
  for(let i=0;i<6;i++){
    const x=-3.9+i*.2;bar([x,.99,2.58],[x,.99,3.70],.012,metal);
    for(const z of [2.97,3.28])box(x,.974,z,.05,.17,.055,colors[i%2]);
  }
  // Indoor plants and flowers.
  function plant(x,z,scale=1){
    cylinder(x,.2*scale,z,.17*scale,.36*scale,cream,.13*scale);
    for(let i=0;i<7;i++){
      const a=i*2.4,h=(.6+rng()*.35)*scale,tip=[x+Math.sin(a)*.27*scale,h,z+Math.cos(a)*.27*scale];bar([x,.3*scale,z],tip,.012*scale,green);
      const leaf=ball(...tip,.11*scale,green);leaf.scale.set(.45,1.8,.65);leaf.rotation.z=Math.sin(a)*.7;
    }
  }
  plant(4.25,5.6,1.35);plant(-4.23,-5.65,.7);
  cylinder(2.4,.9,1.3,.065,.19,white,.045);for(let i=0;i<5;i++){const x=2.4+Math.sin(i*3)*.075,z=1.3+Math.cos(i*3)*.075;bar([2.4,.96,1.3],[x,1.18,z],.004,green);ball(x,1.19,z,.035,colors[0]);}
  // Ceiling fixtures and conduit are kept to the observed simple white layout.
  const lamp=mat('#ffffff',{emissive:'#fff6d7',emissiveIntensity:1.25});
  for(const z of [-4.2,-.5,4.2]){box(0,3.08,z,.34,.065,1.0,white);box(0,3.037,z,.29,.012,.94,lamp).castShadow=false;}
  bar([0,3.10,-6.4],[0,3.10,6.4],.014,white);
  // Soft daylight and grounded furniture shadows.
  scene.add(new THREE.AmbientLight('#ffffff',.8));
  scene.add(new THREE.HemisphereLight('#f1f5ff','#e0e0d7',1.8));
  const sun=new THREE.DirectionalLight('#fff3db',2.5);sun.position.set(-7,6,3);sun.target.position.set(1,0,-2);sun.castShadow=true;
  sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:25});sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;sun.shadow.radius=3;scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#e8f2ff',.65);fill.position.set(4,2,5);scene.add(fill);
  // Merge static meshes by material to keep draw calls low on phones.
  scene.updateMatrixWorld(true);const batches=new Map();
  for(const o of meshes){
    if(o.material.transparent)continue;
    let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
    if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(g);o.removeFromParent();
  }
  for(const [m,geometries] of batches){
    const merged=new THREE.BufferGeometry();
    for(const name of ['position','normal','uv']){
      const size=geometries.reduce((n,g)=>n+g.attributes[name].array.length,0),data=new Float32Array(size);let offset=0;
      for(const g of geometries){data.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}
      merged.setAttribute(name,new THREE.BufferAttribute(data,name==='uv'?2:3));
    }
    const o=new THREE.Mesh(merged,m);o.castShadow=m!==sky&&m!==lamp;o.receiveShadow=true;scene.add(o);disposables.add(merged);geometries.forEach(g=>g.dispose());
  }
  return {obstacles,dispose(){disposables.forEach(o=>o.dispose());sun.shadow.map?.dispose();}};
}
