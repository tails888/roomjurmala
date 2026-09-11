import * as THREE from '../vendor/three.module.js';
import {buildRoom} from './tour-world.js';
import {movePlayer,stops} from './tour-physics.js';

export function mountTour(dialog,copy){
  const canvas=dialog.querySelector('canvas'),abort=new AbortController(),signal=abort.signal;
  const on=(target,event,fn,options={})=>target.addEventListener(event,fn,{...options,signal});
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(pointer:coarse)').matches?1.5:1.75));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9e4d9');
  const camera=new THREE.PerspectiveCamera(68,1,.065,40);camera.rotation.order='YXZ';
  const world=buildRoom(scene,renderer);
  let yaw=stops[0].yaw,pitch=stops[0].pitch,frame,previous=0,closed=false,dirty=true,zone=0,transition;
  let vx=0,vz=0,lookPointer=null,lastX=0,lastY=0,stickPointer=null,stickX=0,stickY=0;
  const keys=new Set(),position={x:stops[0].x,z:stops[0].z},knob=dialog.querySelector('.tour-stick span');
  const help=dialog.querySelector('.tour-help-panel'),photo=dialog.querySelector('.tour-photo-panel'),error=dialog.querySelector('.tour-error');
  const paused=()=>!help.hidden||!photo.hidden||!error.hidden||document.hidden;
  const clear=()=>{keys.clear();vx=vz=stickX=stickY=0;lookPointer=stickPointer=null;knob.style.transform='';};
  function updateCamera(){camera.position.set(position.x,1.6,position.z);camera.rotation.set(pitch,yaw,0);dirty=true;}
  function resize(){renderer.setSize(dialog.clientWidth,dialog.clientHeight,false);camera.aspect=dialog.clientWidth/Math.max(1,dialog.clientHeight);camera.updateProjectionMatrix();dirty=true;}
  resize();updateCamera();
  function showZone(index){
    clear();zone=index;clearTimeout(transition);canvas.style.opacity='0';
    transition=setTimeout(()=>{Object.assign(position,stops[index]);yaw=stops[index].yaw;pitch=stops[index].pitch;updateCamera();canvas.style.opacity='1';canvas.focus({preventScroll:true});},matchMedia('(prefers-reduced-motion:reduce)').matches?0:160);
    dialog.querySelectorAll('[data-stop]').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.stop)===index)));
  }
  dialog.querySelectorAll('[data-stop]').forEach(b=>on(b,'click',()=>showZone(Number(b.dataset.stop))));
  const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
  on(dialog,'keydown',event=>{if(!paused()&&movementKeys.includes(event.code)){event.preventDefault();keys.add(event.code);}});
  on(window,'keyup',event=>keys.delete(event.code));on(window,'blur',clear);on(document,'visibilitychange',clear);
  const rotate=(dx,dy)=>{yaw-=dx*.0035;pitch=Math.max(-1.1,Math.min(1.1,pitch-dy*.003));updateCamera();};
  on(canvas,'pointerdown',event=>{
    if(paused()||document.pointerLockElement===canvas||lookPointer!==null)return;
    lookPointer=event.pointerId;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});
  });
  on(canvas,'pointermove',event=>{if(event.pointerId===lookPointer){rotate(event.clientX-lastX,event.clientY-lastY);lastX=event.clientX;lastY=event.clientY;}});
  const stopLook=e=>{if(e.pointerId===lookPointer)lookPointer=null;};
  on(canvas,'pointerup',stopLook);on(canvas,'pointercancel',stopLook);on(canvas,'lostpointercapture',stopLook);
  on(document,'mousemove',event=>{if(document.pointerLockElement===canvas&&!paused())rotate(event.movementX,event.movementY);});
  const mouseButton=dialog.querySelector('.tour-mouse');
  on(mouseButton,'click',()=>{try{canvas.requestPointerLock()?.catch(()=>{});}catch{/* Drag-to-look remains available. */}});
  on(document,'pointerlockchange',()=>{mouseButton.textContent=document.pointerLockElement===canvas?copy.unlock:copy.mouse;clear();});
  const stick=dialog.querySelector('.tour-stick');
  const dragStick=e=>{
    const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),scale=Math.min(1,34/Math.max(1,len));
    stickX=dx*scale/34;stickY=dy*scale/34;knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
  };
  on(stick,'pointerdown',e=>{if(paused()||stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);dragStick(e);});
  on(stick,'pointermove',e=>{if(e.pointerId===stickPointer)dragStick(e);});
  const releaseStick=e=>{if(e.pointerId===stickPointer){stickPointer=null;stickX=stickY=0;knob.style.transform='';}};
  on(stick,'pointerup',releaseStick);on(stick,'pointercancel',releaseStick);on(stick,'lostpointercapture',releaseStick);
  // The same controls also work for keyboard and assistive pointer users.
  stick.querySelectorAll('button').forEach(b=>on(b,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const n={forward:[0,.5],back:[0,-.5],left:[-.5,0],right:[.5,0]}[b.dataset.dir];movePlayer(position,n[0]*Math.cos(yaw)-n[1]*Math.sin(yaw),-n[0]*Math.sin(yaw)-n[1]*Math.cos(yaw),world.obstacles);updateCamera();}}));
  function unlock(){if(document.pointerLockElement===canvas)document.exitPointerLock();clear();}
  function closePanels(){help.hidden=photo.hidden=true;canvas.focus({preventScroll:true});}
  on(dialog.querySelector('.tour-help'),'click',()=>{unlock();help.hidden=!help.hidden;photo.hidden=true;if(!help.hidden)dialog.querySelector('.tour-help-done').focus();});
  on(dialog.querySelector('.tour-help-done'),'click',closePanels);
  on(dialog.querySelector('.tour-photo-button'),'click',()=>{
    unlock();help.hidden=true;photo.hidden=false;
    const img=photo.querySelector('img');img.src='/assets/images/gallery/'+['room-open.jpg','soft-play.jpeg','kitchen-and-tables.jpg','kitchen-dining.jpeg'][zone];img.alt=copy.zones[zone];
    photo.querySelector('figcaption').textContent=copy.zones[zone]+' · '+copy.photo;dialog.querySelector('.tour-photo-close').focus();
  });
  on(dialog.querySelector('.tour-photo-close'),'click',closePanels);
  on(dialog,'keydown',e=>{if(e.key==='Tab'&&(!help.hidden||!photo.hidden)){e.preventDefault();dialog.querySelector(!photo.hidden?'.tour-photo-close':'.tour-help-done').focus();}});
  on(dialog,'cancel',e=>{if(!help.hidden||!photo.hidden){e.preventDefault();closePanels();}});
  on(canvas,'webglcontextlost',event=>{event.preventDefault();clear();error.hidden=false;dialog.classList.add('tour-unavailable');});
  const pointer=dialog.querySelector('.tour-position');
  function loop(now){
    if(closed)return;const dt=Math.min((now-(previous||now))/1000,.04);previous=now;
    if(!paused()){
      let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stickY;
      let strafe=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stickX;
      const length=Math.max(1,Math.hypot(forward,strafe));forward/=length;strafe/=length;
      const speed=1.8,blend=1-Math.exp(-dt*13);vx+=(strafe*Math.cos(yaw)-forward*Math.sin(yaw))*speed*blend-vx*blend;vz+=(-strafe*Math.sin(yaw)-forward*Math.cos(yaw))*speed*blend-vz*blend;
      if(Math.abs(vx)+Math.abs(vz)>.003){movePlayer(position,vx*dt,vz*dt,world.obstacles);updateCamera();}
    }
    // Render while textures arrive, then only when movement, resize or controls change.
    if(dirty||now<3000){renderer.render(scene,camera);dirty=false;}
    pointer.setAttribute('transform',`translate(${(position.x+5)*10},${(position.z+6.5)*10}) rotate(${-yaw*180/Math.PI})`);
    canvas.dataset.position=[position.x.toFixed(3),position.z.toFixed(3)].join(',');canvas.dataset.yaw=yaw.toFixed(3);
    frame=requestAnimationFrame(loop);
  }
  const textureRefresh=setInterval(()=>{dirty=true;},400);
  const finishRefresh=setTimeout(()=>clearInterval(textureRefresh),12000);
  on(window,'resize',resize);frame=requestAnimationFrame(loop);dialog.querySelector('.tour-loading').hidden=true;
  canvas.focus({preventScroll:true});
  return ()=>{
    closed=true;clear();unlock();abort.abort();cancelAnimationFrame(frame);clearTimeout(transition);clearTimeout(finishRefresh);clearInterval(textureRefresh);
    world.dispose();renderer.dispose();renderer.forceContextLoss();
  };
}
