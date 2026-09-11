import test from 'node:test';
import assert from 'node:assert/strict';
import {movePlayer,canStand,bounds} from '../assets/js/tour-physics.js';

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
