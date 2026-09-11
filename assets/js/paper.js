export function mountPaper(reduced){
  mountTypewriter(document.querySelector('#paper-title'),reduced);
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
    if(board){const r=board.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight){const offset=Math.max(-1,Math.min(1,(innerHeight*.5-r.top-r.height*.5)/innerHeight));cards.forEach((card,i)=>card.style.setProperty('--memory-shift',offset*(i%2?35:-35)+'px'));}}
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
