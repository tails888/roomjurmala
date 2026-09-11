import * as THREE from '../vendor/three.module.js';

// A dimensional photographic installation, using only the venue's existing images.
// It deliberately does not infer a floor plan or invent a virtual room.
export function mountScene(host,photos){
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  }catch{host.dataset.renderer='fallback';return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0x112f32,0);
  renderer.domElement.setAttribute('aria-hidden','true');
  host.prepend(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(38,1,.1,50);
  camera.position.set(0,0,7.7);
  const assembly=new THREE.Group();scene.add(assembly);
  const loader=new THREE.TextureLoader();
  const textures=new Map();
  let activeIndex=0,requestId=0,frameId=0,visible=true,paused=document.body.classList.contains('motion-paused'),contextLost=false;
  const pointer={x:0,y:0},smooth={x:0,y:0};
  const panels=[];
  const geometries=[],materials=[];
  function createPanel(width,height,x,z,rotation){
    const group=new THREE.Group();
    group.position.set(x,0,z);group.rotation.y=rotation;
    const geometry=new THREE.BoxGeometry(width+.025,height+.025,.048);
    const material=new THREE.MeshBasicMaterial({color:0xef782f});
    const rim=new THREE.Mesh(geometry,material);
    const imageGeometry=new THREE.PlaneGeometry(width,height);
    const imageMaterial=new THREE.MeshBasicMaterial({color:0xffffff});
    const image=new THREE.Mesh(imageGeometry,imageMaterial);
    image.position.z=.026;
    group.add(rim,image);
    assembly.add(group);panels.push({group,image,width,height});
    geometries.push(geometry,imageGeometry);materials.push(material,imageMaterial);
  }
  createPanel(4.55,3.8,-.78,0,-.18);
  createPanel(1.4,3.24,2.42,-.25,.35);
  function textureFor(index,aspect){
    const key=index+':'+aspect;
    if(textures.has(key))return Promise.resolve(textures.get(key));
    return loader.loadAsync(photos[index].src).then(texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      const imageAspect=texture.image.width/texture.image.height;
      if(imageAspect>aspect){texture.repeat.x=aspect/imageAspect;texture.offset.x=(1-texture.repeat.x)/2;}
      else{texture.repeat.y=imageAspect/aspect;texture.offset.y=(1-texture.repeat.y)/2;}
      textures.set(key,texture);return texture;
    });
  }
  function renderOnce(){
    if(contextLost)return;
    renderer.render(scene,camera);
  }
  async function show(index){
    activeIndex=index;const request=++requestId;
    try{
      const maps=await Promise.all(panels.map((panel,i)=>textureFor((index+i)%photos.length,panel.width/panel.height)));
      if(request!==requestId)return;
      panels.forEach((panel,i)=>{panel.image.material.map=maps[i];panel.image.material.needsUpdate=true;});
      renderOnce();host.classList.add('is-ready');host.dataset.renderer='webgl';
      schedule();
    }catch{host.classList.remove('is-ready');host.dataset.renderer='fallback';}
  }
  function resize(){
    const width=host.clientWidth,height=host.clientHeight;
    if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;
    // Fit the full installation without clipping at tablet widths.
    camera.position.z=Math.max(6.55,6.6/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
    camera.updateProjectionMatrix();renderOnce();
  }
  function tick(time){
    frameId=0;
    if(!visible||paused||document.hidden||contextLost)return;
    smooth.x+=(pointer.x-smooth.x)*.04;smooth.y+=(pointer.y-smooth.y)*.04;
    assembly.rotation.y=smooth.x*.08;
    assembly.rotation.x=-smooth.y*.045;
    assembly.position.y=Math.sin(time*.00055)*.035;
    renderOnce();schedule();
  }
  function schedule(){if(!frameId&&visible&&!paused&&!document.hidden&&!contextLost)frameId=requestAnimationFrame(tick);}
  const onMove=e=>{
    const rect=host.getBoundingClientRect();
    pointer.x=(e.clientX-rect.left)/rect.width*2-1;pointer.y=(e.clientY-rect.top)/rect.height*2-1;
    schedule();
  };
  host.addEventListener('pointermove',onMove);
  host.addEventListener('pointerleave',()=>{pointer.x=0;pointer.y=0;});
  const onIndex=e=>show(e.detail);
  const onMotion=e=>{paused=e.detail;if(paused){cancelAnimationFrame(frameId);frameId=0;assembly.rotation.set(0,0,0);assembly.position.y=0;renderOnce();}else schedule();};
  document.addEventListener('room:scene-index',onIndex);
  document.addEventListener('room:motion',onMotion);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frameId);frameId=0;}else schedule();});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else{cancelAnimationFrame(frameId);frameId=0;}});
  observer.observe(host);
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(frameId);frameId=0;host.classList.remove('is-ready');host.dataset.renderer='fallback';});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;resize();show(activeIndex);});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frameId);frameId=0;});
  window.addEventListener('pageshow',()=>schedule());
  resize();show(0);
}
