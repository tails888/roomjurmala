// Native sticky layout and a reversible timeline; touch scrolling stays native.
export function mountHeroTour(reduced){
  const art=document.querySelector('.paper-art-video');
  const video=art?.querySelector('[data-hero-video]');
  if(!video)return;
  const mobile=matchMedia('(max-width:760px)');
  const track=document.createElement('div');track.className='hero-tour-track';
  const pin=document.createElement('div');pin.className='hero-tour-pin';
  art.before(track);track.append(pin);pin.append(art);
  let enabled=false,frame=0,targetTime=0,priming=false,decoded=false;
  // Keep an independent poster visible until Safari has presented a video frame.
  const host=video.closest('.film-media');
  host.style.backgroundImage=`url("${video.poster}")`;
  host.style.backgroundSize='cover';host.style.backgroundPosition='center';
  video.style.opacity='0';
  function reveal(){decoded=true;video.style.opacity='1';}
  if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(reveal);
  else video.addEventListener('loadeddata',reveal,{once:true});
  function prime(){
    if(!enabled||priming||decoded||document.body.classList.contains('tour-open'))return;
    priming=true;video.dataset.heroPriming='';video.muted=true;video.playsInline=true;
    // iOS may ignore preload until playback is requested, even for a paused scrubber.
    video.play().then(()=>{video.pause();schedule();}).catch(()=>{}).finally(()=>{
      priming=false;delete video.dataset.heroPriming;
    });
  }
  const clamp=n=>Math.max(0,Math.min(1,n));
  const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
  function seek(){
    if(!enabled||document.hidden||!Number.isFinite(video.duration)||video.seeking)return;
    const time=Math.min(Math.max(.04,targetTime*Math.max(0,video.duration-.08)),video.duration);
    if(Math.abs(video.currentTime-time)>.035){try{video.currentTime=time;}catch{/* Wait for media metadata. */}}
  }
  function paint(){
    frame=0;if(!enabled)return;
    const distance=track.offsetHeight-pin.offsetHeight;
    const progress=clamp(-track.getBoundingClientRect().top/Math.max(1,distance));
    const openness=smooth(progress/.25)*(1-smooth((progress-.75)/.25));
    track.style.setProperty('--tour-open',openness.toFixed(5));
    track.dataset.progress=progress.toFixed(4);
    targetTime=clamp((progress-.12)/.76);seek();
  }
  function schedule(){if(!frame&&enabled)frame=requestAnimationFrame(paint);}
  function configure(){
    const next=mobile.matches&&!reduced.matches;
    if(next===enabled){schedule();return;}
    enabled=next;track.classList.toggle('hero-tour-enabled',enabled);
    video.toggleAttribute('data-scroll-scrub',enabled);
    if(enabled){video.pause();video.preload='auto';paint();prime();}
    else{track.style.removeProperty('--tour-open');delete track.dataset.progress;}
    document.dispatchEvent(new Event('hero-tour-change'));
  }
  video.addEventListener('loadedmetadata',schedule);
  video.addEventListener('loadeddata',schedule);
  video.addEventListener('seeked',seek);
  video.addEventListener('play',()=>{if(enabled&&!priming)video.pause();});
  document.addEventListener('touchstart',prime,{passive:true});
  document.addEventListener('pointerdown',prime,{passive:true});
  document.addEventListener('visibilitychange',schedule);
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  mobile.addEventListener('change',configure);reduced.addEventListener('change',configure);
  configure();
}
