const playIcon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 11 7-11 7V5Z" stroke="currentColor" stroke-width="1.4"/></svg>';
const pauseIcon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2"/></svg>';

export function mountFilms(copy,reduced){
  const states=[...document.querySelectorAll('[data-film]')].map(host=>({host,video:host.querySelector('video'),visible:false,userPaused:false,manual:false,pending:false}));
  function active(state){
    const story=state.host.closest('.film-story');
    return !story?.classList.contains('is-pinned')||state.host.closest('.film-panel').classList.contains('is-active');
  }
  function wanted(state){return state.visible&&active(state)&&!state.userPaused&&!document.hidden&&(!reduced.matches||state.manual);}
  function refresh(){
    for(const state of states){
      if(wanted(state)){
        if(state.video.paused&&!state.pending){
          state.pending=true;
          state.video.play().then(()=>{if(!wanted(state))state.video.pause();}).catch(()=>{}).finally(()=>{state.pending=false;});
        }
      }else{
        state.video.pause();
        if(!state.visible||!active(state)){state.video.muted=true;state.manual=false;state.host.querySelector('.video-sound')?.setAttribute('aria-pressed','false');state.host.querySelector('.video-sound')?.setAttribute('aria-label',copy.soundOn);}
      }
    }
  }
  for(const state of states){
    const {host,video}=state,play=host.querySelector('.video-play'),sound=host.querySelector('.video-sound');
    video.controls=false;video.muted=true;if(host.querySelector('.film-controls'))host.querySelector('.film-controls').hidden=false;
    function update(){if(!play)return;play.innerHTML=video.paused?playIcon:pauseIcon;play.setAttribute('aria-label',video.paused?copy.playVideo:copy.pauseVideo);}
    video.addEventListener('play',update);video.addEventListener('pause',update);update();
    play?.addEventListener('click',()=>{state.userPaused=!video.paused;state.manual=!state.userPaused;refresh();});
    sound?.addEventListener('click',()=>{video.muted=!video.muted;sound.setAttribute('aria-pressed',String(!video.muted));sound.setAttribute('aria-label',video.muted?copy.soundOn:copy.soundOff);});
    video.addEventListener('error',()=>{host.classList.add('film-failed');host.querySelector('.film-error').hidden=false;if(host.querySelector('.film-controls'))host.querySelector('.film-controls').hidden=true;});
    const loopStart=Number(video.dataset.loopStart||0);
    if(loopStart){
      const start=()=>{if(video.duration>loopStart&&video.currentTime<loopStart)video.currentTime=loopStart;};
      video.addEventListener('loadedmetadata',start);video.addEventListener('timeupdate',start);
    }
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){const state=states.find(s=>s.video===entry.target);state.visible=entry.isIntersecting&&entry.intersectionRatio>=.2;}
    refresh();
  },{threshold:[0,.2,.6]});
  states.forEach(state=>observer.observe(state.video));
  document.addEventListener('visibilitychange',refresh);
  reduced.addEventListener('change',()=>{states.forEach(s=>{s.manual=false;});refresh();});
  return {refresh};
}

export function mountStory(root,films,reduced){
  if(!root)return;
  const panels=[...root.querySelectorAll('.film-panel')],buttons=[...root.querySelectorAll('[data-story-step]')];
  const desktop=matchMedia('(min-width: 901px)');
  let pinned=false,current=-1,frame=0;
  const clamp=n=>Math.max(0,Math.min(1,n));
  function select(index){
    if(index===current)return;
    current=index;
    panels.forEach((panel,i)=>{panel.classList.toggle('is-active',i===index);panel.inert=pinned&&i!==index;if(pinned&&i!==index)panel.setAttribute('aria-hidden','true');else panel.removeAttribute('aria-hidden');});
    buttons.forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
    films.refresh();
  }
  function update(){
    frame=0;if(!pinned)return;
    const rect=root.getBoundingClientRect();
    const progress=clamp(-rect.top/(root.offsetHeight-innerHeight));
    root.style.setProperty('--story-progress',progress);
    select(Math.min(panels.length-1,Math.floor(progress*panels.length)));
  }
  function schedule(){if(!frame&&pinned)frame=requestAnimationFrame(update);}
  function configure(){
    pinned=desktop.matches&&!reduced.matches;
    root.classList.toggle('is-pinned',pinned);current=-1;
    if(pinned){select(0);update();}else{panels.forEach(panel=>{panel.inert=false;panel.removeAttribute('aria-hidden');panel.classList.remove('is-active');});films.refresh();}
  }
  function navigate(index){
    if(pinned){
      const top=scrollY+root.getBoundingClientRect().top;
      scrollTo({top:top+(root.offsetHeight-innerHeight)*(index+.15)/panels.length,behavior:'smooth'});
    }else panels[index].scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});
  }
  buttons.forEach((button,index)=>{
    button.addEventListener('click',()=>navigate(index));
    button.addEventListener('keydown',event=>{
      let next=index;if(event.key==='ArrowDown'||event.key==='ArrowRight')next=(index+1)%panels.length;
      else if(event.key==='ArrowUp'||event.key==='ArrowLeft')next=(index+panels.length-1)%panels.length;
      else return;
      event.preventDefault();buttons[next].focus({preventScroll:true});navigate(next);
    });
  });
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  desktop.addEventListener('change',configure);reduced.addEventListener('change',configure);configure();
}
