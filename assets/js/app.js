import {mountFilms,mountStory} from './films.js';
import {getQuote,limits,formatDuration,rigaNow,validateBooking,requestMessage,validDate} from './booking-core.mjs';
const config=JSON.parse(document.getElementById('site-data').textContent);
const {lang,d,photos}=config;
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const arrow='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" stroke-width="1.25"/></svg>';
const money=n=>new Intl.NumberFormat(lang,{maximumFractionDigits:0}).format(n)+' €';
let motionPaused=reduced.matches;
let currentHero=0,currentGallery=0,lastFocused;
const mediaDialog=$('#media-dialog'),menu=$('#mobile-menu');
function modalOpen(dialog){
  lastFocused=document.activeElement;
  dialog.showModal();
  document.body.classList.add('modal-open');
}
function modalClosed(){
  if(!$$('dialog[open]').length)document.body.classList.remove('modal-open');
  lastFocused?.focus({preventScroll:true});
}
function closeMenu(){menu.close();$('.menu-toggle').setAttribute('aria-expanded','false');}
$('.menu-toggle').addEventListener('click',()=>{modalOpen(menu);$('.menu-toggle').setAttribute('aria-expanded','true');});
$('.menu-close').addEventListener('click',closeMenu);
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
menu.addEventListener('close',()=>{$('.menu-toggle').setAttribute('aria-expanded','false');modalClosed();});
for(const dialog of [menu,mediaDialog]){
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
}
mediaDialog.addEventListener('close',()=>{mediaDialog.querySelector('video')?.pause();$('#dialog-content').replaceChildren();modalClosed();});
$('.dialog-close').addEventListener('click',()=>mediaDialog.close());
$$('.language-link').forEach(a=>a.addEventListener('click',()=>{if(location.hash)a.href=new URL(a.href).pathname+location.hash;}));

function makeEl(tag,className,text){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text)el.textContent=text;
  return el;
}
function showPhoto(index,open=true){
  const item=photos[(index+photos.length)%photos.length];
  const content=$('#dialog-content');content.replaceChildren();
  const img=makeEl('img','dialog-photo');img.src=item.src;img.alt=item.name;
  const copy=makeEl('div','dialog-copy');
  copy.append(makeEl('h3','',item.name),makeEl('p','',item.description));
  const controls=makeEl('div','dialog-gallery-controls');
  controls.append(makeEl('p','',String((index+photos.length)%photos.length+1).padStart(2,'0')+' / '+String(photos.length).padStart(2,'0')));
  const buttons=makeEl('div');
  for(const direction of [-1,1]){
    const b=makeEl('button','circle-button');b.type='button';b.setAttribute('aria-label',direction<0?d.previous:d.next);
    b.innerHTML=direction<0?'<span class="turn-back">'+arrow+'</span>':arrow;
    b.addEventListener('click',()=>{showPhoto((index+direction+photos.length)%photos.length,false);mediaDialog.querySelectorAll('.dialog-gallery-controls button')[direction<0?0:1].focus();});
    buttons.append(b);
  }
  controls.append(buttons);copy.append(controls);content.append(img,copy);
  if(open)modalOpen(mediaDialog);
}
function showVideo(index){
  const item=photos[index],content=$('#dialog-content');content.replaceChildren();
  const video=makeEl('video','dialog-film');
  video.controls=true;video.playsInline=true;video.preload='metadata';video.poster=item.src;video.src=item.video;
  const fallback=makeEl('div','dialog-error',d.videoError);fallback.hidden=true;
  const link=makeEl('a','',d.videoDownload);link.href=item.video;link.target='_blank';link.rel='noopener';fallback.append(link);
  video.addEventListener('error',()=>{fallback.hidden=false;});
  content.append(video,fallback);modalOpen(mediaDialog);
  video.play().catch(()=>{ /* Native controls remain available if autoplay is denied. */ });
}
$$('[data-video]').forEach(button=>button.addEventListener('click',()=>showVideo(Number(button.dataset.video))));
$$('[data-photo-detail]').forEach(button=>button.addEventListener('click',()=>showPhoto(Number(button.dataset.photoDetail))));
$('[data-open-gallery]')?.addEventListener('click',()=>showPhoto(currentGallery));
function setGallery(index){
  currentGallery=(index+photos.length)%photos.length;
  const item=photos[currentGallery],img=$('#gallery-image');
  if(!img)return;
  img.src=item.src;img.alt=item.name;
  $('#gallery-caption').textContent=item.name;
  $('.gallery-hotspot').dataset.photoDetail=String(currentGallery);
  $('.gallery-hotspot').setAttribute('aria-label',item.name);
  $$('.gallery-thumbs button').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.galleryIndex)===currentGallery));
}
$$('[data-gallery-step]').forEach(b=>b.addEventListener('click',()=>setGallery(currentGallery+Number(b.dataset.galleryStep))));
$$('[data-gallery-index]').forEach(b=>b.addEventListener('click',()=>setGallery(Number(b.dataset.galleryIndex))));
function setHero(index){
  currentHero=(index+photos.length)%photos.length;
  $('.scene-photo-main').src=photos[currentHero].src;
  $('.scene-photo-side').src=photos[(currentHero+1)%photos.length].src;
  $('.hero-hotspot').dataset.photoDetail=String(currentHero);
  $('.hero-hotspot').setAttribute('aria-label',photos[currentHero].name);
  $('.scene-caption').textContent=(currentHero+1)+' / '+photos.length+' · '+d.explore;
  document.dispatchEvent(new CustomEvent('room:scene-index',{detail:currentHero}));
}
const scene=$('#hero-scene');
if(scene){
  scene.tabIndex=0;scene.setAttribute('role','group');scene.setAttribute('aria-label',d.drag);
  $$('[data-scene-step]').forEach(b=>b.addEventListener('click',()=>setHero(currentHero+Number(b.dataset.sceneStep))));
  let dragStart=null,dragY=0;
  scene.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;dragStart=e.clientX;dragY=e.clientY;});
  scene.addEventListener('pointerup',e=>{if(dragStart!==null&&Math.abs(e.clientX-dragStart)>45&&Math.abs(e.clientX-dragStart)>Math.abs(e.clientY-dragY))setHero(currentHero+(e.clientX<dragStart?1:-1));dragStart=null;});
  scene.addEventListener('pointercancel',()=>dragStart=null);
  scene.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setHero(currentHero+(e.key==='ArrowRight'?1:-1));}});
  scene.addEventListener('room:photo-click',()=>showPhoto(currentHero));
  $('#motion-toggle').addEventListener('click',()=>setMotion(!motionPaused));
  if(matchMedia('(min-width:681px)').matches&&!reduced.matches){
    import('./scene.js').then(m=>m.mountScene(scene,photos)).catch(()=>{scene.dataset.renderer='fallback';});
  }
}
function setMotion(paused){
  motionPaused=paused;document.body.classList.toggle('motion-paused',paused);
  const control=$('#motion-toggle');
  if(control){control.setAttribute('aria-pressed',String(paused));control.textContent=paused?d.resume:d.pause;}
  document.dispatchEvent(new CustomEvent('room:motion',{detail:paused}));
}
setMotion(motionPaused);
reduced.addEventListener('change',e=>setMotion(e.matches));
if(!reduced.matches&&'IntersectionObserver'in window){
  document.body.classList.add('js-motion');
  const reveal=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');reveal.unobserve(entry.target);}},{threshold:.06});
  $$('.reveal').forEach(el=>reveal.observe(el));
}
function tabKeyboard(buttons,activate){
  buttons.forEach((button,i)=>button.addEventListener('keydown',e=>{
    let next;
    if(['ArrowRight','ArrowDown'].includes(e.key))next=(i+1)%buttons.length;
    if(['ArrowLeft','ArrowUp'].includes(e.key))next=(i-1+buttons.length)%buttons.length;
    if(e.key==='Home')next=0;if(e.key==='End')next=buttons.length-1;
    if(next!==undefined){e.preventDefault();activate(buttons[next]);buttons[next].focus();}
  }));
}
let mode='hours',quote=getQuote('hours',3),selectedPlan='',selectedClass='';
function renderQuote(){
  quote=getQuote(mode,$('#duration-slider').value);
  $('#duration-label').textContent=formatDuration(quote,lang,d.units);
  $('#calc-price').textContent=money(quote.price);
  $('#calc-saving').textContent=money(quote.saving);
  $('#duration-slider').setAttribute('aria-valuetext',formatDuration(quote,lang,d.units));
  $('#plan-note').textContent=mode==='months'?d.minTerm:'';
}
function chooseMode(button){
  mode=button.dataset.mode;
  $$('[data-mode]').forEach(b=>{b.setAttribute('aria-selected',b===button);b.tabIndex=b===button?0:-1;});
  const [min,max]=limits[mode],slider=$('#duration-slider');
  slider.min=min;slider.max=max;slider.value=mode==='hours'?3:min;
  $('#range-min').textContent=formatDuration(getQuote(mode,min),lang,d.units);
  $('#range-max').textContent=formatDuration(getQuote(mode,max),lang,d.units);
  $('#calc-panel').setAttribute('aria-labelledby',button.id);renderQuote();
}
const modeTabs=$$('[data-mode]');
modeTabs.forEach(b=>b.addEventListener('click',()=>chooseMode(b)));tabKeyboard(modeTabs,chooseMode);
$('#duration-slider')?.addEventListener('input',renderQuote);
function choosePackage(plan=''){
  selectedClass='';selectedPlan=plan;
  $('#selected-plan').hidden=!plan;
  $('#selected-plan span').textContent=plan;
  updateMessage();
}
$('#calculator-book')?.addEventListener('click',()=>choosePackage(formatDuration(quote,lang,d.units)+' · '+money(quote.price)));
$$('[data-package]').forEach(b=>b.addEventListener('click',()=>{
  const m={day:'days',week:'weeks',month:'months'}[b.dataset.package],q=getQuote(m,m==='months'?3:1);
  choosePackage(formatDuration(q,lang,d.units)+' · '+money(q.price));
}));
$('#clear-plan').addEventListener('click',()=>choosePackage(''));
const dateInput=$('#booking-date'),timeInput=$('#booking-time'),form=$('#booking-form');
dateInput.min=rigaNow().date;
const fields={date:dateInput,time:timeInput};
function updateMessage(){
  $('#whatsapp-message').value=requestMessage({date:dateInput.value,time:timeInput.value},selectedClass?{...config.whatsapp,greeting:classCopy.greeting}:config.whatsapp,[selectedPlan,selectedClass||config.serviceRequest].filter(Boolean).join('\n'));
}
const calendarApi=window.RoomJurmalaCalendar;
const todayParts=rigaNow().date.split('-').map(Number);
let calendarYear=todayParts[0],calendarMonth=todayParts[1]-1;
const classCopy={lv:{book:'Pieteikties nodarbībai',greeting:'Sveiki! Vēlos pieteikties nodarbībai.',past:'Nodarbība jau sākusies'},en:{book:'Book this class',greeting:'Hello! I would like to join a class.',past:'Class has already started'},ru:{book:'Записаться на занятие',greeting:'Здравствуйте! Хочу записаться на занятие.',past:'Занятие уже началось'}}[lang];
function renderSchedule(){
  if(!calendarApi)return;
  const now=rigaNow(),today=new Date(now.date+'T12:00:00');
  const chosen=validDate(dateInput.value)?dateInput.value.split('-').map(Number):null;
  $('#calMonthLabel').textContent=new Intl.DateTimeFormat(lang,{month:'long',year:'numeric'}).format(new Date(calendarYear,calendarMonth,1));
  $('#prevMonth').disabled=calendarYear*12+calendarMonth<=Number(now.date.slice(0,4))*12+Number(now.date.slice(5,7))-1;
  const grid=$('#calGrid');grid.replaceChildren();
  const offset=(new Date(calendarYear,calendarMonth,1).getDay()+6)%7;
  for(let i=0;i<offset;i++)grid.append(makeEl('span'));
  const days=new Date(calendarYear,calendarMonth+1,0).getDate();
  for(let day=1;day<=days;day++){
    const key=calendarYear+'-'+String(calendarMonth+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    const events=calendarApi.getEventsForDate(calendarYear,calendarMonth,day);
    const button=makeEl('button','cal-day',String(day));button.type='button';button.disabled=key<now.date;
    button.dataset.date=key;button.classList.toggle('has-events',events.length>0);button.classList.toggle('is-today',key===now.date);
    button.setAttribute('aria-pressed',String(key===dateInput.value));
    if(key===now.date)button.setAttribute('aria-current','date');
    button.setAttribute('aria-label',new Intl.DateTimeFormat(lang,{dateStyle:'full'}).format(new Date(calendarYear,calendarMonth,day))+(events.length?' · '+calendarApi.getCellEventLabel(events,lang):''));
    button.addEventListener('click',()=>{dateInput.value=key;selectedClass='';dateInput.dispatchEvent(new Event('input',{bubbles:true}));renderSchedule();grid.querySelector('[data-date="'+key+'"]').focus({preventScroll:true});});
    grid.append(button);
  }
  calendarApi.renderPanel({widget:$('.cal-widget'),lang,currentYear:calendarYear,currentMonth:calendarMonth,today,
    selectedDateParts:chosen?{year:chosen[0],month:chosen[1]-1,day:chosen[2]}:null,
    formatDate:(day,month)=>new Intl.DateTimeFormat(lang,{day:'numeric',month:'long'}).format(new Date(calendarYear,month,day)),
    bookLabel:classCopy.book,
    onSelect:(event,day)=>{
      dateInput.value=calendarYear+'-'+String(calendarMonth+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
      timeInput.value=event.time.split('-')[0];selectedClass=calendarApi.resolveLocalized(event.title,lang);
      selectedPlan='';$('#selected-plan').hidden=false;$('#selected-plan span').textContent=selectedClass;$('#booking-error').hidden=true;
      Object.values(fields).forEach(el=>el.removeAttribute('aria-invalid'));
      updateMessage();renderSchedule();form.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});form.querySelector('[type="submit"]').focus({preventScroll:true});
    },
    canSelect:(event,day)=>{
      const key=calendarYear+'-'+String(calendarMonth+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
      return key>now.date||(key===now.date&&event.time.split('-')[0]>now.time);
    }
  });
  $('.booking-calendar').hidden=false;
}
for(const [id,step] of [['prevMonth',-1],['nextMonth',1]])$('#'+id).addEventListener('click',()=>{
  const date=new Date(calendarYear,calendarMonth+step,1);calendarYear=date.getFullYear();calendarMonth=date.getMonth();renderSchedule();
});
form.addEventListener('input',e=>{if(e.target===dateInput||e.target===timeInput){selectedClass='';$('#selected-plan').hidden=!selectedPlan;$('#selected-plan span').textContent=selectedPlan;}e.target.removeAttribute('aria-invalid');$('#booking-error').hidden=true;updateMessage();});
dateInput.addEventListener('change',()=>{if(validDate(dateInput.value)){const parts=dateInput.value.split('-').map(Number);calendarYear=parts[0];calendarMonth=parts[1]-1;}renderSchedule();});
form.addEventListener('submit',e=>{
  const error=validateBooking({date:dateInput.value,time:timeInput.value});
  Object.values(fields).forEach(el=>el.removeAttribute('aria-invalid'));
  if(error){
    e.preventDefault();$('#booking-error').textContent=d[error.key];$('#booking-error').hidden=false;
    error.fields.forEach(name=>fields[name].setAttribute('aria-invalid','true'));fields[error.fields[0]].focus();return;
  }
  $('#booking-error').hidden=true;updateMessage();
  // Native form navigation opens WhatsApp with the prepared text. The visitor sends it there.
});
renderSchedule();updateMessage();form.hidden=false;
const films=mountFilms(d,reduced);
mountStory($('.film-story'),films,reduced);
const mobileBook=$('.mobile-book'),hero=$('.video-hero')||$('.hero')||$('.service-hero');
let bookingVisible=false,heroVisible=Boolean(hero),contactVisible=false;
const bookingObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){if(entry.target===$('#calendar'))bookingVisible=entry.isIntersecting;if(entry.target===hero)heroVisible=entry.isIntersecting;if(entry.target===$('#contact'))contactVisible=entry.isIntersecting;}
  const show=!bookingVisible&&!heroVisible&&!contactVisible;mobileBook.classList.toggle('is-visible',show);mobileBook.setAttribute('aria-hidden',String(!show));mobileBook.tabIndex=show?0:-1;
},{threshold:0});
bookingObserver.observe($('#calendar'));bookingObserver.observe($('#contact'));if(hero)bookingObserver.observe(hero);
// Keep preview traffic out of the existing production analytics property.
if(location.hostname==='roomjurmala.lv'||location.hostname==='www.roomjurmala.lv'){
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  const analytics=makeEl('script');analytics.async=true;analytics.src='https://www.googletagmanager.com/gtag/js?id=G-QLD7392ML2';
  document.head.append(analytics);window.gtag('js',new Date());window.gtag('config','G-QLD7392ML2');
}
