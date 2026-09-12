// Desktop wheel inertia; touch, keyboard, anchors and nested scrollers stay native.
export function mountScroll(reduced){
  const desktop=matchMedia('(min-width: 901px) and (pointer: fine)');
  const root=document.documentElement;
  const progress=document.createElement('div');
  progress.className='reading-progress';progress.setAttribute('aria-hidden','true');
  document.body.append(progress);
  let frame=0,target=scrollY,lastTime=0,progressFrame=0;
  const enabled=()=>desktop.matches&&!reduced.matches;
  let scrollLimit=0;
  const measure=()=>{scrollLimit=Math.max(0,root.scrollHeight-innerHeight);};
  const limit=()=>scrollLimit;
  measure();
  new ResizeObserver(()=>{measure();schedule();}).observe(document.body);
  const clamp=n=>Math.max(0,Math.min(limit(),n));
  function stop(){cancelAnimationFrame(frame);frame=0;target=scrollY;lastTime=0;}
  function step(time){
    if(!enabled()||document.hidden){stop();return;}
    const elapsed=lastTime?Math.min(50,time-lastTime):16.67;lastTime=time;
    target=clamp(target);
    const distance=target-scrollY;
    if(Math.abs(distance)<4){scrollTo({top:target,behavior:'instant'});stop();return;}
    scrollTo({top:scrollY+distance*(1-Math.exp(-elapsed/95)),behavior:'instant'});
    frame=requestAnimationFrame(step);
  }
  function isNativeArea(event){
    for(const node of event.composedPath()){
      if(!(node instanceof Element)||node===document.body)continue;
      if(node.matches('dialog,input,textarea,select,video,[contenteditable=true],[role=slider]'))return true;
      const style=getComputedStyle(node);
      if(/auto|scroll/.test(style.overflowY)&&node.scrollHeight>node.clientHeight+1)return true;
      if(/auto|scroll/.test(style.overflowX)&&node.scrollWidth>node.clientWidth+1)return true;
    }
    return false;
  }
  function wheel(event){
    if(!enabled()||event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||document.querySelector('dialog[open]')||isNativeArea(event))return;
    const multiplier=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;
    const delta=Math.max(-500,Math.min(500,event.deltaY*multiplier));
    if(!delta)return;
    if(!frame)target=scrollY;
    const next=clamp(target+delta);
    if(next===target)return;
    event.preventDefault();target=next;
    if(!frame)frame=requestAnimationFrame(step);
  }
  function paint(){
    progressFrame=0;
    progress.style.transform='scaleX('+(limit()?Math.max(0,Math.min(1,scrollY/limit())):0)+')';
    if(!frame)target=scrollY;
  }
  function schedule(){if(!progressFrame)progressFrame=requestAnimationFrame(paint);}
  function configure(){stop();root.classList.toggle('custom-scroll',enabled());schedule();}
  addEventListener('wheel',wheel,{passive:false});
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',()=>{measure();stop();schedule();},{passive:true});
  addEventListener('pointerdown',stop,{passive:true});
  addEventListener('touchstart',stop,{passive:true});
  addEventListener('keydown',stop);
  addEventListener('hashchange',stop);
  document.addEventListener('visibilitychange',stop);
  reduced.addEventListener('change',configure);desktop.addEventListener('change',configure);
  const items=[...document.querySelectorAll('.paper-activity,.paper-gallery-heading,.paper-film-heading,.reviews-heading,.review-card,.editorial-section')];
  let observer;
  function reveal(){
    observer?.disconnect();
    if(reduced.matches){items.forEach(el=>el.classList.remove('scroll-reveal'));return;}
    observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('scroll-entered');observer.unobserve(entry.target);}}},{threshold:.08});
    items.forEach((el,i)=>{el.classList.add('scroll-reveal');el.style.setProperty('--reveal-delay',(i%3)*65+'ms');observer.observe(el);});
  }
  reduced.addEventListener('change',reveal);reveal();configure();
}
