import test from 'node:test';
import assert from 'node:assert/strict';
import {movePlayer,canStand,bounds,stops} from '../assets/js/tour-physics.js';
import {readFileSync} from 'node:fs';

const table=[{minX:-.5,maxX:.5,minZ:-.5,maxZ:.5}];
test('tour movement cannot tunnel through furniture during a long step',()=>{
  const position={x:0,z:2};movePlayer(position,0,-4,table);
  assert(position.z>=.72);assert(canStand(position.x,position.z,table));
});
test('tour movement slides along furniture and remains inside the room',()=>{
  const position={x:0,z:1};movePlayer(position,2,-1,table);
  assert(position.x>1.8);assert(canStand(position.x,position.z,table));
  movePlayer(position,30,-30,table);
  assert(position.x<=bounds.maxX&&position.z>=bounds.minZ);
});
test('the visitor has enough clearance to walk alongside an obstacle',()=>{
  assert.equal(canStand(.6,0,table),false);
  assert.equal(canStand(.75,0,table),true);
});

const layout=JSON.parse(readFileSync(new URL('../assets/tour/room-layout.json',import.meta.url)));
test('every Blender tour stop is clear and reachable through the room',()=>{
  assert.deepEqual(layout.bounds,bounds);
  for(const stop of stops)assert(canStand(stop.x,stop.z,layout.obstacles));
  // Flood-fill the real exported furniture footprint at visitor scale.
  const step=.1,origin=stops[0],queue=[[0,0]],seen=new Set(['0,0']);
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,key=nx+','+nz;
      if(seen.has(key)||!canStand(origin.x+nx*step,origin.z+nz*step,layout.obstacles))continue;
      seen.add(key);queue.push([nx,nz]);
    }
  }
  for(const stop of stops)assert(queue.some(([x,z])=>Math.hypot(origin.x+x*step-stop.x,origin.z+z*step-stop.z)<.15),'A tour stop is isolated by furniture');
});

test('the web model is a self-contained compressed Blender export',()=>{
  const bytes=readFileSync(new URL('../assets/tour/room-jurmala.glb',import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'glTF');
  assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const data=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  assert.match(data.asset.generator,/Blender/);
  assert(data.extensionsRequired.includes('EXT_meshopt_compression'));
  assert(data.images.every(image=>Number.isInteger(image.bufferView)&&!image.uri));
  assert(data.meshes.flatMap(mesh=>mesh.primitives).every(p=>p.attributes.COLOR_0!==undefined));
  assert(bytes.length<6*1024*1024,'Keep the on-demand model within its mobile download budget');
});
