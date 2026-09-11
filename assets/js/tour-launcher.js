const copy={
  lv:{title:'Virtuālā pastaiga',close:'Aizvērt tūri',loading:'Ienākam telpā…',zones:['Telpa','Rotaļu zona','Kopīgais galds','Virtuvīte'],move:'pārvietoties',look:'Velc, lai paskatītos apkārt',touch:'Pa kreisi ej · pa labi skaties',mouse:'Vadība ar peli',unlock:'Esc atbrīvo peli',photo:'Īstās telpas foto',back:'Atpakaļ tūrē',note:'3D modelis pēc foto. Izmēri un izkārtojums ir aptuveni.',help:'Kā pārvietoties',helpText:'Datorā ej ar W A S D vai bultiņām. Turi peli nospiestu un velc, lai skatītos apkārt. Telefonā pārvietojies ar kreiso vadības apli un velc pa telpu ar labo pirkstu. Ar pogām apakšā vari uzreiz nokļūt citā zonā.',failed:'Šajā pārlūkā 3D skatu neizdevās atvērt.',fallback:'Apskatīt telpas fotogrāfijas',retry:'Mēģināt vēlreiz',map:'Tava atrašanās vieta',reset:'Atgriezties sākumā'},
  en:{title:'Walk through ROOM',close:'Close tour',loading:'Opening the room…',zones:['The room','Play area','Shared table','Kitchenette'],move:'move',look:'Drag to look around',touch:'Move on the left · look on the right',mouse:'Mouse control',unlock:'Esc releases the mouse',photo:'Photos of the real room',back:'Back to the tour',note:'A photo-based 3D model. Dimensions and layout are approximate.',help:'How to move',helpText:'Use W A S D or the arrow keys to walk. Click and drag to look around. On your phone, move with the left joystick and drag the room with your right finger. Use the buttons below to visit another area.',failed:'The 3D view could not start in this browser.',fallback:'View room photos',retry:'Try again',map:'Your location',reset:'Back to the entrance'},
  ru:{title:'Прогулка по ROOM',close:'Закрыть тур',loading:'Открываем пространство…',zones:['Зал','Игровая зона','Общий стол','Кухня'],move:'двигаться',look:'Потяните, чтобы осмотреться',touch:'Слева движение · справа обзор',mouse:'Управление мышью',unlock:'Esc освобождает мышь',photo:'Фото настоящего зала',back:'Вернуться в тур',note:'3D-модель по фотографиям. Размеры и планировка приблизительные.',help:'Как перемещаться',helpText:'Используйте W A S D или стрелки для движения. Зажмите кнопку мыши и потяните для обзора. На телефоне двигайтесь левым джойстиком и осматривайтесь правым пальцем. Кнопки внизу перенесут вас в другую зону.',failed:'Не удалось открыть 3D-тур в этом браузере.',fallback:'Посмотреть фотографии',retry:'Попробовать снова',map:'Вы находитесь здесь',reset:'Ко входу'}
};
let sheet,stylesReady,active=false;
const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
async function openTour(trigger){
  if(active)return;active=true;
  const lang=document.documentElement.lang,c=copy[lang]||copy.lv;
  if(!sheet){sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/assets/css/tour.css?v=1';stylesReady=new Promise(resolve=>{sheet.onload=resolve;sheet.onerror=resolve;});document.head.append(sheet);}
  await stylesReady;
  const dialog=document.createElement('dialog');dialog.className='room-tour';dialog.setAttribute('aria-label',c.title);
  const space=(lang==='lv'?'':'/'+lang)+'/telpa/';
  dialog.innerHTML=`<div class="tour-stage"><canvas class="tour-canvas" tabindex="0" aria-label="${c.title}"></canvas></div>
    <header class="tour-top"><div class="tour-brand" title="${c.note}"><strong>ROOM Jūrmala</strong><span>${c.title}</span></div><div class="tour-tools"><button class="tour-help tour-icon" aria-label="${c.help}">?</button><button class="tour-close tour-icon" aria-label="${c.close}">${icon}</button></div></header>
    <div class="tour-map" role="img" aria-label="${c.map}"><svg viewBox="0 0 100 130"><path d="M2 2H98V128H2Z" fill="#e8e5da" stroke="#526957" stroke-width="2"/><path d="M6 7h57v39H6z" fill="#c7c6b9"/><path d="M67 3v25h27M68 36h22M68 62h16v30H68z" fill="none" stroke="#526957" stroke-width="3"/><path d="M7 3v125" stroke="#b4d4d6" stroke-width="3"/><g class="tour-position"><path d="M0 0 -13 -23Q0 -30 13 -23Z" fill="#d58a4770"/><circle r="4" fill="#173f34" stroke="#fff" stroke-width="1.5"/></g></svg></div>
    <div class="tour-loading" role="status"><span class="tour-spinner"></span><p>${c.loading}</p></div>
    <div class="tour-hints"><p><kbd>W A S D</kbd> ${c.move}</p><p>${c.look}</p><button class="tour-mouse">${c.mouse}</button></div>
    <div class="tour-stick" aria-label="${c.move}" role="group"><span></span><button class="tour-forward" data-dir="forward" aria-label="${c.move}">↑</button><button data-dir="left" aria-label="Left">←</button><button data-dir="right" aria-label="Right">→</button><button data-dir="back" aria-label="Back">↓</button></div><p class="tour-touch-hint">${c.touch}</p>
    <footer class="tour-bottom"><nav aria-label="${c.title}">${c.zones.map((z,i)=>`<button data-stop="${i}" ${i===0?'aria-current="true"':''}>${z}</button>`).join('')}</nav><button class="tour-photo-button">${c.photo}</button></footer>
    <section class="tour-help-panel" hidden><h2>${c.help}</h2><p>${c.helpText}</p><small>${c.note}</small><button class="tour-help-done">${c.back}</button></section>
    <section class="tour-photo-panel" hidden><button class="tour-photo-close tour-icon" aria-label="${c.back}">${icon}</button><figure><img alt="${c.zones[0]}" width="1152" height="2048"><figcaption>${c.photo}</figcaption></figure></section>
    <section class="tour-error" hidden><h2>${c.failed}</h2><p>${c.note}</p><button class="tour-retry">${c.retry}</button><a href="${space}">${c.fallback}</a></section>`;
  document.body.append(dialog);let dispose,closed=false;
  const priorOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.body.classList.add('tour-open');document.dispatchEvent(new Event('visibilitychange'));
  dialog.showModal();dialog.querySelector('.tour-close').focus();
  function close(){if(closed)return;closed=true;dispose?.();dialog.remove();document.body.style.overflow=priorOverflow;document.body.classList.remove('tour-open');document.dispatchEvent(new Event('visibilitychange'));active=false;trigger.focus({preventScroll:true});}
  dialog.addEventListener('close',close,{once:true});dialog.querySelector('.tour-close').onclick=()=>dialog.close();
  dialog.querySelector('.tour-retry').onclick=()=>{dialog.close();openTour(trigger);};
  try{const module=await import('./tour-runtime.js?v=1');if(!closed)dispose=module.mountTour(dialog,c);}
  catch(error){if(!closed){dialog.querySelector('.tour-loading').hidden=true;dialog.querySelector('.tour-error').hidden=false;dialog.classList.add('tour-unavailable');}console.error('ROOM tour unavailable',error);}
}
document.querySelectorAll('[data-open-tour]').forEach(button=>button.addEventListener('click',()=>openTour(button)));
