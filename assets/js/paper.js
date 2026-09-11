export function mountPaper(reduced){
  mountTypewriter(document.querySelector('#paper-title'),reduced);
  mountGalleryScroll(reduced);
  const strip=document.querySelector('.paper-films');
  let drag=null;
  strip?.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button,a'))return;drag={x:e.clientX,left:strip.scrollLeft};strip.setPointerCapture(e.pointerId);strip.classList.add('is-dragging');});
  strip?.addEventListener('pointermove',e=>{if(drag){strip.scrollLeft=drag.left+drag.x-e.clientX;e.preventDefault();}});
  function endDrag(){drag=null;strip?.classList.remove('is-dragging');}
  strip?.addEventListener('pointerup',endDrag);strip?.addEventListener('pointercancel',endDrag);strip?.addEventListener('lostpointercapture',endDrag);
  strip?.addEventListener('keydown',e=>{if(e.target!==strip||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();strip.scrollBy({left:(e.key==='ArrowRight'?1:-1)*strip.clientWidth*.7,behavior:reduced.matches?'instant':'smooth'});});
  const art=document.querySelector('.paper-art');
  const board=document.querySelector('.memory-board');
  if(!art&&!board)return;
  const desktop=matchMedia('(min-width: 761px) and (pointer: fine)');
  let frame=0;
  const cards=[...document.querySelectorAll('.memory-photo')];
  function enabled(){return desktop.matches&&!reduced.matches;}
  function update(){
    frame=0;
    if(!enabled())return;
    if(art){const r=art.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)art.style.setProperty('--paper-scroll',Math.max(-25,Math.min(35,-r.top*.065))+'px');}
    if(board&&!board.closest(".gallery-scroll-enabled")){const r=board.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight){const offset=Math.max(-1,Math.min(1,(innerHeight*.5-r.top-r.height*.5)/innerHeight));cards.forEach((card,i)=>card.style.setProperty('--memory-shift',offset*(i%2?35:-35)+'px'));}}
  }
  function schedule(){if(!frame&&enabled())frame=requestAnimationFrame(update);}
  function reset(){art?.style.removeProperty('--paper-x');art?.style.removeProperty('--paper-y');art?.style.removeProperty('--paper-scroll');cards.forEach(c=>c.style.removeProperty('--memory-shift'));schedule();}
  art?.addEventListener('pointermove',e=>{if(!enabled())return;const r=art.getBoundingClientRect();art.style.setProperty('--paper-x',((e.clientX-r.left)/r.width-.5)*5+'deg');art.style.setProperty('--paper-y',-((e.clientY-r.top)/r.height-.5)*3+'deg');});
  art?.addEventListener('pointerleave',reset);
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  reduced.addEventListener('change',reset);desktop.addEventListener('change',reset);schedule();
}

function mountTypewriter(title,reduced){
  if(!title||reduced.matches)return;
  const label=title.innerText.replace(/\s+/g,' ').trim();
  const letters=[];
  // Keep every letter in flow so typing never moves the booking controls.
  for(const node of [...title.childNodes]){
    if(node.nodeType!==Node.TEXT_NODE)continue;
    const fragment=document.createDocumentFragment();
    for(const character of Array.from(node.textContent)){
      const span=document.createElement('span');
      span.className='typewriter-char';span.textContent=character;
      span.setAttribute('aria-hidden','true');fragment.append(span);letters.push(span);
    }
    node.replaceWith(fragment);
  }
  title.setAttribute('aria-label',label);
  title.classList.add('is-typing');
  let index=0,timer=0,visible=true;
  function finish(){
    clearTimeout(timer);title.classList.remove('is-typing');
    letters.forEach(letter=>{letter.classList.add('is-written');letter.classList.remove('typing-cursor');});
    observer.disconnect();
  }
  function tick(){
    if(reduced.matches){finish();return;}
    if(document.hidden||!visible){timer=setTimeout(tick,250);return;}
    letters[index-1]?.classList.remove('typing-cursor');
    if(index>=letters.length){finish();return;}
    const letter=letters[index++];letter.classList.add('is-written','typing-cursor');
    timer=setTimeout(tick,letter.textContent===' '?260:180);
  }
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:0});
  observer.observe(title);
  reduced.addEventListener('change',()=>{if(reduced.matches)finish();});
  timer=setTimeout(tick,450);
}

// A native sticky scroll track: no wheel trapping and no automatic dialogs.
function mountGalleryScroll(reduced){
  const board=document.querySelector('.memory-board');
  if(!board)return;
  const cards=[...board.querySelectorAll('.memory-photo')];
  const track=document.createElement('div');track.className='gallery-scroll-track';
  board.before(track);track.append(board);
  const stage=document.createElement('div');stage.className='gallery-scroll-stage';
  stage.setAttribute('aria-hidden','true');
  const frames=cards.map(card=>{
    const figure=document.createElement('figure');figure.className='gallery-scroll-photo';
    const img=card.querySelector('img').cloneNode();img.alt='';img.loading='eager';
    const caption=document.createElement('figcaption');caption.textContent=card.querySelector('span').textContent;
    figure.append(img,caption);stage.append(figure);return figure;
  });
  board.append(stage);
  const meter=document.createElement('div');meter.className='gallery-scroll-meter';meter.setAttribute('aria-hidden','true');
  cards.forEach(()=>meter.append(document.createElement('span')));board.append(meter);
  let raf=0;
  const smooth=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n);};
  function paint(){
    raf=0;if(reduced.matches)return;
    const rect=track.getBoundingClientRect();
    const distance=track.offsetHeight-board.offsetHeight;
    const progress=Math.max(0,Math.min(1,-rect.top/distance));
    const timeline=progress*(cards.length+1);
    let strongest=0,active=-1;
    frames.forEach((frame,i)=>{
      const local=timeline-i-.45;
      const strength=smooth(local/.28)*(1-smooth((local-.95)/.28));
      frame.style.opacity=strength;
      frame.style.transform=`translateY(${(1-strength)*36}px) scale(${.92+strength*.08})`;
      if(strength>strongest){strongest=strength;active=i;}
    });
    board.style.setProperty('--gallery-focus',strongest);
    [...meter.children].forEach((dot,i)=>dot.classList.toggle('is-active',i===active));
    board.dataset.scrollPhoto=active<0?'collage':String(active+1);
  }
  function schedule(){if(!raf)raf=requestAnimationFrame(paint);}
  function configure(){
    track.classList.toggle('gallery-scroll-enabled',!reduced.matches);
    board.style.removeProperty('--gallery-focus');
    schedule();
  }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  reduced.addEventListener('change',configure);configure();
}
