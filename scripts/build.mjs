import fs from 'node:fs';
import { design, photoFiles, videos } from '../content/design.mjs';
const copy=JSON.parse(fs.readFileSync('content/copy.json','utf8'));
const source=JSON.parse(fs.readFileSync('content/pages.json','utf8'));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const clean=s=>s.replace(/<[^>]*>/g,'').replace(/^[^\p{L}\p{N}]+/u,'').trim();
const json=s=>JSON.stringify(s).replaceAll('<','\\u003c');
const arrow='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" stroke-width="1.25"/></svg>';
const diagonal='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.25"/></svg>';
const plus='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="1.25"/></svg>';
const play='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 11 7-11 7V5Z" stroke="currentColor" stroke-width="1.25"/></svg>';
const pauseIcon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2"/></svg>';
const soundIcon='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4V9ZM17 8c2 2 2 6 0 8M20 5c4 4 4 10 0 14" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
const route=(lang,kind='home')=>(lang==='lv'?'/':'/'+lang+'/')+(kind==='home'?'':kind==='space'?'telpa/':'cenas/');
const photo=i=>'/assets/images/gallery/'+photoFiles[i];
function header(lang,kind,c,d){
  return `<a class="skip-link" href="#main">${esc(d.skip)}</a>
  <header class="site-header ${kind==='home'?'over-video':''}">
    <a class="brand" href="${route(lang)}" aria-label="ROOM Jūrmala"><img src="/assets/images/brand/logo-header.png" width="560" height="374" alt="ROOM Jūrmala"></a>
    <nav class="desktop-nav" aria-label="${esc(d.menu)}">
      <a href="${route(lang,'space')}" ${kind==='space'?'aria-current="page"':''}>${c.nav.links[0]}</a>
      <a href="${route(lang,'pricing')}" ${kind==='pricing'?'aria-current="page"':''}>${c.nav.links[1]}</a>
    </nav>
    <div class="header-actions"><nav class="languages" aria-label="Language">${['lv','en','ru'].map(l=>`<a href="${route(l,kind)}" hreflang="${l}" lang="${l}" class="language-link" ${l===lang?'aria-current="true"':''}>${l.toUpperCase()}</a>`).join('')}</nav>
    <a class="button button-outline header-book" href="#calendar">${c.nav.cta}</a>
    <button class="menu-toggle circle-button" type="button" aria-controls="mobile-menu" aria-expanded="false" aria-label="${esc(c.nav.menuOpen)}"><span></span><span></span></button></div>
  </header>
  <dialog id="mobile-menu" aria-label="${esc(d.menu)}">
    <div class="menu-top"><span>ROOM Jūrmala</span><button class="circle-button menu-close" aria-label="${esc(d.close)}">${plus}</button></div>
    <nav class="menu-links"><a href="${route(lang)}">${d.home}</a><a href="${route(lang,'space')}">${c.nav.links[0]}</a><a href="${route(lang,'pricing')}">${c.nav.links[1]}</a><a href="#calendar">${c.nav.links[2]}</a><a href="#contact">${c.nav.links[4]}</a></nav>
    <a class="text-link" href="https://wa.me/37127850380" target="_blank" rel="noopener noreferrer">WhatsApp ${arrow}</a>
  </dialog>`;
}
function inlineVideo(index,poster,id,d,hero=false){
 return `<div class="film-media" data-film>
  <video id="${id}" class="ambient-video" ${hero?'data-hero-video data-loop-start="13"':''} muted playsinline loop controls preload="${hero?'metadata':'none'}" poster="/assets/images/video-posters/${poster}.jpg" width="480" height="848" aria-label="${esc(hero?d.venue:d.eventNames[index===0?0:index===3?1:index===1?2:3])}"><source src="/assets/videos/${videos[index]}" type="video/mp4"></video>
  <div class="film-controls" hidden><button class="circle-button video-play" type="button" aria-controls="${id}" aria-label="${esc(d.pauseVideo)}">${pauseIcon}</button><button class="circle-button video-sound" type="button" aria-controls="${id}" aria-label="${esc(d.soundOn)}" aria-pressed="false">${soundIcon}</button></div>
  <a class="film-error" href="/assets/videos/${videos[index]}" target="_blank" rel="noopener" hidden>${d.filmFallback}${diagonal}</a>
 </div>`;
}
function videoHero(d){
 return `<section class="video-hero" aria-label="${esc(d.venue)}">
  ${inlineVideo(2,'entry','hero-film',d,true)}
  <div class="video-hero-shade"></div>
  <div class="video-hero-copy"><p>${d.venue}</p><h1>${d.hero}</h1><a class="button button-orange" href="#calendar">${d.findDate}${arrow}</a></div>
  <div class="video-hero-bottom"><span>Skolas iela 50 · Jūrmala</span><a href="#events" aria-label="${esc(d.scroll)}"><span class="turn-down">${arrow}</span></a></div>
 </section>`;
}
function hero(lang,kind,c,d){
  return `<section class="hero ${kind==='space'?'hero-space':''}">
    <div class="hero-main"><div class="hero-copy">
      <h1>${kind==='space'?d.spaceHero:d.hero}</h1><p>${kind==='space'?d.spaceIntro:d.intro}</p>
      <a class="button button-light" href="#calendar">${d.findDate}${arrow}</a>
    </div>
    <div class="hero-gallery" aria-label="${esc(d.explore)}">
      <div class="scene" id="hero-scene">
        <div class="scene-fallback" aria-hidden="true"><img class="scene-photo-main" src="${photo(0)}" alt="" width="2048" height="1536" fetchpriority="high"><img class="scene-photo-side" src="${photo(1)}" alt="" width="1536" height="2048"></div>
        <button class="hotspot hero-hotspot" data-photo-detail="0" aria-label="${esc(d.details)}">${plus}</button>
      </div>
      <div class="scene-controls"><button type="button" class="circle-button" data-scene-step="-1" aria-label="${esc(d.previous)}"><span class="turn-back">${arrow}</span></button>
        <span class="scene-caption" aria-live="polite">${d.explore}</span>
        <button type="button" class="circle-button" data-scene-step="1" aria-label="${esc(d.next)}">${arrow}</button>
      </div><div class="scene-hints"><span>${d.drag}</span><button id="motion-toggle" type="button" aria-pressed="false">${d.pause}</button></div>
    </div></div>
    <div class="hero-bottom"><span>Skolas iela 50 · Kauguri, Jūrmala</span><a href="#${kind==='space'?'gallery':'events'}">${d.together}<span class="turn-down">${arrow}</span></a></div>
  </section>`;
}
function events(lang,c,d){
 const indexes=[0,3,1,4],posters=['celebrate','create','learn','move'];
 return `<section id="events" class="film-story"><div class="story-stage">
  <div class="story-copy"><h2>${d.eventTitle}</h2><nav class="story-nav" aria-label="${esc(c.categories.tag)}">${d.eventNames.map((name,i)=>`<button type="button" data-story-step="${i}" aria-controls="activity-${i}" ${i===0?'aria-current="true"':''}><span>0${i+1}</span>${name}${diagonal}</button>`).join('')}</nav><a class="text-link" href="${route(lang,'space')}">${d.moreSpace}${diagonal}</a></div>
  <div class="story-films">${d.eventNames.map((name,i)=>`<article class="film-panel" id="activity-${i}" data-film-index="${i}">${inlineVideo(indexes[i],posters[i],'activity-film-'+i,d)}<div class="film-caption"><h3>${name}</h3><p>${d.eventDescriptions[i]}</p></div></article>`).join('')}</div>
  <div class="story-progress" aria-hidden="true"><span></span></div>
 </div></section>`;
}
function priceStrip(lang,d){
 return `<section class="price-strip" id="pricing"><h2>${d.simplePrice}</h2><div class="strip-rates"><p><span>${d.from}</span> 20 € <small>/ ${d.perHour}</small></p><p>130 € <small>/ ${d.perDay}</small></p><a class="text-link" href="${route(lang,'pricing')}">${d.allPrices}${diagonal}</a></div></section>`;
}
function gallery(c,d){
  return `<section id="gallery" class="section gallery-section"><div class="section-heading reveal"><h2>${d.enter}</h2><p>${d.galleryIntro}</p></div>
    <div class="gallery-view reveal"><button class="gallery-open" type="button" data-open-gallery aria-label="${esc(d.photo)}"><img id="gallery-image" src="${photo(0)}" width="2048" height="1536" alt="${esc(d.photoNames[0])}" loading="lazy"></button><button class="hotspot gallery-hotspot" type="button" data-photo-detail="0" aria-label="${esc(c.features.items[1][0])}">${plus}</button></div>
    <div class="gallery-toolbar"><p id="gallery-caption" aria-live="polite">${d.photoNames[0]}</p><div class="gallery-arrows"><button class="circle-button" type="button" data-gallery-step="-1" aria-label="${esc(d.previous)}"><span class="turn-back">${arrow}</span></button><button class="circle-button" type="button" data-gallery-step="1" aria-label="${esc(d.next)}">${arrow}</button></div><button class="text-link" type="button" data-video="0">${play}${d.video}</button></div>
    <div class="gallery-thumbs" aria-label="${esc(d.allPhotos)}">${[0,2,1].map((i,j)=>`<button type="button" data-gallery-index="${i}" aria-label="${esc(d.photoNames[i])}" aria-pressed="${j===0}"><img src="${photo(i)}" width="480" height="240" alt="" loading="lazy"></button>`).join('')}</div>
    <div class="amenities">${d.amenities.map(x=>`<span>${x}</span>`).join('')}</div>
  </section>`;
}
function services(lang){
  const articles=source[lang+'-space'].articles;
  return `<section class="section services-section">${articles.map((html,i)=>`<article class="service-story reveal" id="service-${i+1}"><div class="service-picture"><img src="${photo([4,3,0,1,2][i])}" alt="${esc(design[lang].photoNames[[4,3,0,1,2][i]])}" width="1200" height="1000" loading="lazy"><span class="service-number">0${i+1}</span></div><div class="service-copy">${html.replace(/<span class="section-tag">[\s\S]*?<\/span>/,'')}<a class="text-link" href="#calendar" data-event-book="${[1,3,4,5,8][i]}">${design[lang].findDate}${diagonal}</a></div></article>`).join('')}</section>`;
}
function pricing(lang,kind,c,d){
 return `<section class="section pricing-section ${kind==='pricing'?'pricing-page-intro':''}" id="pricing">
    <div class="section-heading reveal"><${kind==='pricing'?'h1':'h2'}>${d.priceTitle}</${kind==='pricing'?'h1':'h2'}><p>${d.priceIntro}</p></div>
    <div class="calculator reveal" id="calculator"><div class="calc-controls"><div class="calc-tabs" role="tablist" aria-label="${esc(d.duration)}">${['hours','days','weeks','months'].map((m,i)=>`<button role="tab" type="button" data-mode="${m}" id="mode-${m}" aria-controls="calc-panel" aria-selected="${i===0}" tabindex="${i===0?'0':'-1'}">${d.modes[i]}</button>`).join('')}</div><div id="calc-panel" role="tabpanel" aria-labelledby="mode-hours"><label for="duration-slider" id="duration-label">3 ${d.units[0][1]}</label><input id="duration-slider" type="range" min="1" max="8" value="3" step="1" aria-describedby="plan-note"><div class="range-ends"><span id="range-min">1 ${d.units[0][0]}</span><span id="range-max">8 ${d.units[0][2]}</span></div><p id="plan-note"></p></div></div>
    <div class="calc-result" aria-live="polite" aria-atomic="true"><strong id="calc-price">55 €</strong><p>${d.forTime}</p><span class="calc-saving">${d.saved} <span id="calc-saving">5 €</span></span><a class="button button-light" id="calculator-book" href="#calendar">${d.selectDate}${arrow}</a></div></div>
    <div class="packages">${d.packageNames.map((n,i)=>`<article class="package reveal"><h3>${n}</h3><p class="package-price">${[130,550,460][i]} €</p><p class="package-term">${d.packageTerms[i]}</p><a class="text-link" href="#calendar" data-package="${['day','week','month'][i]}">${d.selectDate}${diagonal}</a></article>`).join('')}</div>
    ${kind==='pricing'?`<div class="hourly-rates"><h2>${d.hourlyTitle}</h2><dl>${[20,38,55,70,85,100,115,130].map((p,i)=>`<div><dt>${i+1} h</dt><dd>${p} €</dd></div>`).join('')}</dl></div>`:`<a class="text-link all-prices" href="${route(lang,'pricing')}">${d.allPrices}${diagonal}</a>`}
  </section>`;
}
function booking(c,d){
 return `<section id="calendar" class="section quick-booking"><div><h2>${d.bookingTitle}</h2><p>${d.bookingIntro}</p></div>
 <div class="booking-calendar" hidden><div class="cal-nav"><button type="button" class="circle-button" id="prevMonth" aria-label="${esc(d.prevMonth)}"><span class="turn-back">${arrow}</span></button><h3 id="calMonthLabel" aria-live="polite"></h3><button type="button" class="circle-button" id="nextMonth" aria-label="${esc(d.nextMonth)}">${arrow}</button></div><div class="cal-weekdays" aria-hidden="true">${c.calendar.daysShort.map(day=>`<span>${day}</span>`).join('')}</div><div id="calGrid" class="cal-grid" role="group" aria-labelledby="calMonthLabel"></div><p class="cal-legend"><span></span>${d.scheduled}</p><p class="cal-note">${d.bookingNote}</p><div class="cal-widget" aria-live="polite"></div></div><div class="quick-booking-content"><noscript><p class="notice">${d.noScript} <a href="https://wa.me/37127850380">WhatsApp</a></p></noscript>
 <form id="booking-form" action="https://wa.me/37127850380" method="get" target="_blank" rel="noopener noreferrer" novalidate data-booking-ui hidden>
  <p id="booking-error" class="form-error" role="alert" hidden></p>
  <div class="quick-fields"><div class="field"><label for="booking-date">${c.booking.labels.date}</label><input id="booking-date" type="date" required></div><div class="field"><label for="booking-time">${d.approximateTime}</label><input id="booking-time" type="time" required></div></div>
  <input type="hidden" name="text" id="whatsapp-message"><p id="selected-plan" class="selected-plan" hidden><span></span><button type="button" id="clear-plan">${d.clearPlan}</button></p>
  <button class="button button-orange form-submit" type="submit">${d.bookWhatsApp}${arrow}</button>
 </form></div></section>`;
}
function faq(lang,kind,c,d){
 const items=kind==='space'?source[lang+'-space'].faq:c.faq.items.map(([q,a])=>({q,a}));
 return `<section class="section faq-section" id="faq"><div class="faq-heading reveal"><h2>${d.faqTitle}</h2><p>${c.faq.sub}</p></div><div class="faq-list">${items.map(x=>`<details><summary>${x.q}${plus}</summary><p>${x.a}</p></details>`).join('')}</div></section>`;
}
function footer(lang,c,d){
 return `<footer class="site-footer" id="contact"><div class="footer-map"><iframe title="${esc(c.map.iframeTitle)}" src="https://maps.google.com/maps?q=ROOM%20J%C5%ABrmala%2C%20Skolas%20iela%2050%2C%20J%C5%ABrmala&amp;z=16&amp;output=embed&amp;hl=${lang}" width="1200" height="360" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div><div class="footer-main"><a class="brand" href="${route(lang)}"><img src="/assets/images/brand/logo-header.png" width="560" height="374" alt="ROOM Jūrmala" loading="lazy"></a><div id="map-section"><address>Skolas iela 50, Jūrmala</address><a class="text-link" href="https://www.google.com/maps/search/?api=1&query=ROOM+Jurmala+Skolas+iela+50" target="_blank" rel="noopener noreferrer">${c.map.buttons[0]}${diagonal}</a></div><div class="footer-contact"><a href="tel:+37127850380">+371 27 850 380</a><a href="mailto:welcome@roomjurmala.lv">welcome@roomjurmala.lv</a></div><a class="text-link" href="https://www.instagram.com/room.jurmala/" target="_blank" rel="noopener noreferrer">Instagram${diagonal}</a></div>
 <div class="footer-bottom"><span>${c.footer.copy}</span><div><a href="https://www.tiktok.com/@room.jurmala" target="_blank" rel="noopener noreferrer">TikTok</a><a href="https://www.facebook.com/people/Room-J%C5%ABrmala/61583247131495/" target="_blank" rel="noopener noreferrer">Facebook</a><a href="https://seolatvija.lv/" target="_blank" rel="noopener noreferrer">SEO Latvija</a></div></div></footer>
 <a class="mobile-book button button-orange" href="#calendar" aria-hidden="true" tabindex="-1">${d.findDate}${arrow}</a>`;
}
function dialogs(d){
 return `<dialog id="media-dialog" aria-label="${esc(d.explore)}"><button class="dialog-close circle-button" aria-label="${esc(d.close)}">${plus}</button><div id="dialog-content"></div></dialog>`;
}
fs.mkdirSync('assets/vendor',{recursive:true});
for(const name of ['three.module.js','three.core.js']){
  const vendor=fs.readFileSync('node_modules/three/build/'+name,'utf8');
  fs.writeFileSync('assets/vendor/'+name,vendor.replace(/^(\t+) +\t/gm,'$1\t'));
}
fs.copyFileSync('node_modules/three/LICENSE','assets/vendor/THREE-LICENSE.txt');
// Load only the two existing font families used by the new design.
const faces=fs.readFileSync('assets/fonts/fonts.css','utf8').match(/@font-face\s*\{[^}]*\}/g);
const seen=new Set();
fs.writeFileSync('assets/fonts/site-fonts.css',faces.filter(x=>/font-family: '(Inter|Cormorant Garamond)'/.test(x)).filter(x=>{const key=x.replace(/font-weight:[^;]+;/,'');if(seen.has(key))return false;seen.add(key);return true;}).map(x=>x.includes("'Inter'")?x.replace(/font-weight:[^;]+;/,'font-weight: 100 900;'):x).join('\n'));
for(const lang of ['lv','en','ru'])for(const kind of ['home','space','pricing']){
 const c=copy[lang], d=design[lang], page=source[lang+'-'+kind];
 let head=page.head.replace(/<!-- Google tag[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/,'');
 head=head.replace(/\s*<!--[^]*?-->/g,'');
 // Schema describes the content still visible on each page.
 head=head.replace(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,(tag,raw)=>{
   const data=JSON.parse(raw);
   if(kind==='home'&&data['@type']==='FAQPage')return '';
   delete data.aggregateRating;
   return '<script type="application/ld+json">'+json(data)+'</script>';
 });
 const body=kind==='home'?videoHero(d)+events(lang,c,d)+priceStrip(lang,d):kind==='space'?hero(lang,kind,c,d)+gallery(c,d)+services(lang):pricing(lang,kind,c,d);
 const data={lang,d,booking:c.booking,calendar:c.calendar,whatsapp:c.whatsapp,photos:photoFiles.map((f,i)=>({src:photo(i),name:d.photoNames[i],description:d.photoDescriptions[i],video:'/assets/videos/'+videos[i]})),mapTitle:c.map.iframeTitle};
 const html=`<!DOCTYPE html>
<html lang="${lang}">
<head>${head}
  <meta name="theme-color" content="#ef782f">
  <link rel="stylesheet" href="/assets/fonts/site-fonts.css">
  <link rel="stylesheet" href="/assets/css/site.css?v=20260911-video">
  <script src="/calendar-events.js" defer></script>
  <script type="module" src="/assets/js/app.js?v=20260911-video"></script>
</head>
<body class="page-${kind}">${header(lang,kind,c,d)}<main id="main">${body}${booking(c,d)}${kind!=='home'?faq(lang,kind,c,d):''}</main>${footer(lang,c,d)}${dialogs(d)}
<script id="site-data" type="application/json">${json(data)}</script>
</body></html>
`;
 const dir='.'+route(lang,kind);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'index.html',html.replace(/[ \t]+$/gm,'').replace(/\n{3,}/g,'\n\n'));
}
console.log('Built 9 static pages in LV, EN and RU with existing assets.');
