import fs from 'node:fs';
import {newPhotos} from '../content/new-media.mjs';
for (const item of newPhotos) { photoFiles.push(item.file); for (const lang of ['lv','en','ru']) { design[lang].photoNames.push(item.names[lang]); design[lang].photoDescriptions.push(''); } }
import { design, photoFiles, videos } from '../content/design.mjs';
import {servicePages,serviceSlugs} from '../content/services.mjs';
import {customerReviews,reviewSource,reviewCopy} from '../content/reviews.mjs';
import {sideCopy} from '../content/sidepages.mjs';
import {paperCopy} from '../content/paper.mjs';
import {calculatorCopy,simplePriceCopy} from '../content/calculator.mjs';
import {openingHours, openingHoursCopy} from '../content/opening-hours.mjs';
import {criticalStyles} from './styles.mjs';
const imageVariants=JSON.parse(fs.readFileSync('content/image-variants.json','utf8'));
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
const route=(lang,kind='home')=>(lang==='lv'?'/':'/'+lang+'/')+(kind==='home'?'':kind==='space'?'telpa/':kind==='pricing'?'cenas/':'telpa/#'+serviceSlugs[kind]);
const photo=i=>'/assets/images/gallery/'+photoFiles[i];
function header(lang,kind,c,d){
  return `<a class="skip-link" href="#main">${esc(d.skip)}</a>
  <header class="site-header">
    <a class="brand" href="${route(lang)}" aria-label="ROOM Jūrmala"><img src="/assets/images/brand/logo-header-224.webp" width="224" height="150" alt="ROOM Jūrmala"></a>
    <nav class="desktop-nav" aria-label="${esc(d.menu)}">
      <a href="${route(lang,'space')}" ${kind==='space'?'aria-current="page"':''}>${c.nav.links[0]}</a>
      <a href="${route(lang,'pricing')}" ${kind==='pricing'?'aria-current="page"':''}>${c.nav.links[1]}</a>
      <a href="#contact">${c.nav.links[4]}</a>
    </nav>
    <div class="header-actions"><nav class="languages" aria-label="Language">${['lv','en','ru'].map(l=>`<a href="${route(l,kind)}" hreflang="${l}" lang="${l}" class="language-link" ${l===lang?'aria-current="true"':''}>${l.toUpperCase()}</a>`).join('')}</nav>
    <a class="button button-outline header-book" href="#calendar">${c.nav.cta}</a>
    <button class="menu-toggle circle-button" type="button" aria-controls="mobile-menu" aria-expanded="false" aria-label="${esc(c.nav.menuOpen)}"><span></span><span></span></button></div>
  </header>
  <dialog id="mobile-menu" aria-label="${esc(d.menu)}">
    <div class="menu-top"><button class="circle-button menu-close" aria-label="${esc(d.close)}">${plus}</button></div>
    <nav class="menu-links"><a href="${route(lang)}">${d.home}</a><a href="${route(lang,'space')}">${c.nav.links[0]}</a><a href="${route(lang,'pricing')}">${c.nav.links[1]}</a><a href="#calendar">${c.nav.links[2]}</a><a href="#contact">${c.nav.links[4]}</a></nav>
    <a class="text-link" href="https://wa.me/37127850380" target="_blank" rel="noopener noreferrer">${{lv:'Sazinies',en:'Get in touch',ru:'Связаться'}[lang]}</a>
  </dialog>`;
}
function inlineVideo(index,poster,id,d,hero=false){
 const file=hero?'room-hero-tour.mp4':videos[index];
 if(hero)poster='june-17';
 return `<div class="film-media" data-film ${hero?'style="background-image:url(/assets/images/video-posters/june-17-preview.webp);background-size:cover;background-position:center"':''}>
  ${hero?'<img class="hero-poster" src="/assets/images/video-posters/june-17-preview.webp" width="576" height="677" alt="" fetchpriority="high">':''}
  <video id="${id}" class="ambient-video" ${hero?'data-hero-video':''} muted playsinline loop  preload="none" poster="/assets/images/video-posters/${poster}-preview.webp" width="480" height="848" aria-label="${esc(hero?d.venue:d.eventNames[index===0?0:index===3?1:index===1?2:3])}"><source src="/assets/videos/${file}" type="video/mp4"></video>

  <a class="film-error" href="/assets/videos/${file}" target="_blank" rel="noopener" hidden>${d.filmFallback}${diagonal}</a>
 </div>`;
}
function paperHero(lang,d){
 const t=paperCopy[lang];
 return `<section class="paper-hero" aria-labelledby="paper-title"><div class="paper-hero-copy"><p class="paper-eyebrow">${t.eyebrow}</p><h1 id="paper-title">${t.title}</h1><p class="paper-tagline">${t.intro}</p><div class="paper-hero-actions"><a class="button paper-book" href="#calendar">${t.book}</a><a class="paper-gallery-link" href="#gallery">${t.gallery}</a></div></div><div class="hero-tour-track hero-tour-enabled"><div class="hero-tour-pin"><div class="paper-art paper-art-video">${inlineVideo(2,'entry','hero-film',d,true)}</div></div></div></section>
 <section class="paper-activities" id="events" aria-label="${esc(d.eventTitle.replace(/<[^>]*>/g,' '))}">${[4,3,newPhotoIndex(16)].map((n,i)=>`<a class="paper-activity" href="${route(lang,'space')}${i===0?'#bernu-ballites':i===1?'#telpas-nodarbibam':''}"><div><h2>${t.names[i]}</h2><p>${t.descriptions[i]}</p></div><img src="${photo(n)}" width="1536" height="2048" sizes="auto, (max-width: 760px) ${lang==='lv'?'35vw':'80vw'}, 28vw" alt="${esc(d.photoNames[n])}" loading="lazy"></a>`).join('')}</section>`;
}
function paperGallery(lang,d){
 const t=paperCopy[lang];
 return `<section class="paper-gallery" id="gallery" aria-labelledby="paper-gallery-title"><div class="paper-gallery-heading"><p class="paper-eyebrow">ROOM Jūrmala</p><h2 id="paper-gallery-title">${t.galleryTitle}</h2><p>${t.galleryIntro}</p></div><div class="memory-board"><div class="memory-center"><p class="memory-wordmark">ROOM<span>Jūrmala</span></p><p>${d.together}</p><a class="button paper-book" href="#calendar">${t.book}</a></div>${[2,4,1,3].map((n,i)=>`<button class="memory-photo memory-photo-${i}" type="button" data-photo-detail="${n}" aria-label="${esc(t.photo+' · '+d.photoNames[n])}"><img src="${photo(n)}" width="1536" height="2048" sizes="auto, (max-width: 760px) 40vw, 28vw" alt="${esc(d.photoNames[n])}" loading="lazy"><span>${d.photoNames[n]}</span></button>`).join('')}</div><div class="paper-film-heading"><div><h3>${t.videoTitle}</h3><p>${t.videoIntro}</p></div><p>${t.filmHint}</p></div><div class="paper-films" tabindex="0" role="region" aria-label="${esc(t.videoTitle)}">${[0,1,3,4].map((n)=>`<article class="paper-film">${inlineVideo(n,['celebrate','learn','entry','create','move'][n],'gallery-film-'+n,d).replace(/aria-label="[^"]*"/, 'aria-label="'+esc(t.filmNames[n])+'"')}<h4>${t.filmNames[n]}</h4></article>`).join('')}${newFilm(lang,20,{lv:'Joga kopā',en:'Yoga together',ru:'Йога вместе'}[lang])}</div><a class="text-link paper-more" href="${route(lang,'space')}">${t.detail}</a></section>`;
}
function newPhotoIndex(id){return 5+newPhotos.findIndex(p=>p.id===id);}
function mediaPhotos(lang,ids){return `<div class="venue-photo-strip" tabindex="0" role="region" aria-label="${design[lang].allPhotos}">${ids.map(id=>{const n=newPhotoIndex(id);return `<button type="button" class="venue-photo" data-photo-detail="${n}" aria-label="${esc(design[lang].photo+' · '+design[lang].photoNames[n])}"><img src="${photo(n)}" alt="${esc(design[lang].photoNames[n])}" width="960" height="1280" sizes="auto, (max-width: 760px) 70vw, 350px" loading="lazy" decoding="async"></button>`;}).join('')}</div>`;}
function newFilm(lang,id,title,showCaption=true){return `<article class="paper-film"><div class="film-media" data-film><video class="ambient-video" muted playsinline loop preload="none" poster="/assets/images/video-posters/june-${id}-preview.webp" width="576" height="1024" aria-label="${esc(title)}"><source src="/assets/videos/room-june-${id}.mp4" type="video/mp4"></video><a class="film-error" href="/assets/videos/room-june-${id}.mp4" target="_blank" rel="noopener" hidden>${design[lang].filmFallback}</a></div>${showCaption?`<h4>${title}</h4>`:''}</article>`;}
function venueFilms(lang,ids){const labels={lv:{14:'Pie kopīga galda',17:'Vieta rotaļām',18:'Ieskaties telpā',19:'Galda futbols'},en:{14:'Around the table',17:'Room to play',18:'A look inside',19:'Table football'},ru:{14:'За общим столом',17:'Место для игр',18:'Взгляд внутрь',19:'Настольный футбол'}};return `<div class="venue-film-grid">${ids.map(id=>newFilm(lang,id,labels[lang][id],false)).join('')}</div>`;}
function activityArt(name){return `<img class="activity-art" src="/assets/images/activities/${name}.png" width="120" height="120" alt="" aria-hidden="true" loading="lazy" decoding="async">`;}
function consolidatedServices(lang){
 return ['party','workshops'].map(k=>{const p=servicePages[lang][k];return `<section class="editorial-section" id="${serviceSlugs[k]}"><div class="activity-heading">${activityArt(k==='party'?'party':'workshop')}<h2>${p.eyebrow}</h2></div><p>${p.intro}</p>${p.details.map(([heading,text],i)=>`<h3>${heading}</h3><p>${text}</p>${k==='workshops'&&i===1?mediaPhotos(lang,[9]):''}`).join('')}<p>${p.priceNote}</p>${k==='party'?venueFilms(lang,[17,19]):mediaPhotos(lang,[21,16,2,3,5,7,8,12,13])}</section>`;}).join('');
}
function rentalCalculator(lang,d){
 const t=calculatorCopy[lang];
 return `<section class="rent-calculator" aria-labelledby="rental-title" data-rental-calculator hidden><div class="rental-controls"><h2 id="rental-title">${t.title}</h2><p class="rental-intro">${t.intro}</p><div class="rental-tabs" role="tablist" aria-label="${esc(d.duration)}">${['hours','days','weeks','months'].map((m,i)=>`<button role="tab" type="button" data-mode="${m}" id="mode-${m}" aria-controls="calc-panel" aria-selected="${i===0}" tabindex="${i===0?'0':'-1'}">${t.modes[i]}</button>`).join('')}</div><div id="calc-panel" role="tabpanel" aria-labelledby="mode-hours"><div class="rental-duration"><div><label for="duration-slider">${t.duration}</label><span id="duration-label">3 ${d.units[0][1]}</span></div><div class="rental-stepper"><button type="button" data-duration-step="-1" aria-label="${esc(t.less)}">−</button><button type="button" data-duration-step="1" aria-label="${esc(t.more)}">+</button></div></div><input id="duration-slider" type="range" min="1" max="8" value="3" step="1" aria-describedby="plan-note"><div class="rental-range-labels"><span id="range-min">1 ${d.units[0][0]}</span><span id="range-max">8 ${d.units[0][2]}</span></div><div class="rental-presets" role="group" aria-label="${esc(t.presets)}"></div><p id="plan-note" class="rental-note">${t.notes.hours}</p></div></div><div class="rental-result" role="region" aria-label="${esc(t.total)}"><div class="rental-live" aria-live="polite" aria-atomic="true"><p class="rental-total-label">${t.total}</p><strong id="calc-price">55 €</strong><dl class="rental-breakdown"><div><dt>${t.chosen}</dt><dd id="rental-selected">3 ${d.units[0][1]}</dd></div><div><dt id="rental-unit-label">${t.perHour}</dt><dd id="rental-unit-price">18,33 €</dd></div></dl><p class="rental-saving"><span>${t.saving}</span><strong id="calc-saving">5 €</strong></p></div><a class="button button-dark" id="calculator-book" href="#calendar">${t.book}</a><p class="rental-confirmation">${t.note}</p></div></section>`;
}
function simplePricing(lang,d){
 const t=simplePriceCopy[lang],side=sideCopy[lang],prices=[0,20,38,55,70,85,100,115,130];
 const duration=n=>n+' '+d.units[0][new Intl.PluralRules(lang).select(n)==='one'?0:new Intl.PluralRules(lang).select(n)==='few'?1:2];
 const wa=message=>'https://wa.me/37127850380?text='+encodeURIComponent(message);
 const choice=n=>`<a href="${wa(t.greeting+' '+duration(n)+' · '+prices[n]+' €')}" role="button" class="hour-choice" data-simple-hour="${n}" aria-pressed="${n===3}"><span>${duration(n)}</span><strong>${prices[n]} <small>€</small></strong>${n*20>prices[n]?`<span class="hour-saving">${{lv:'Ietaupi',en:'Save',ru:'Экономия'}[lang]} ${n*20-prices[n]} €</span>`:''}<span class="choice-check" aria-hidden="true">✓</span></a>`;
 return `<article class="simple-price-page"><header class="simple-price-heading"><nav class="breadcrumbs"><a href="${route(lang)}">${side.home}</a><span>/</span><span>${side.pricingTitle}</span></nav><p class="paper-eyebrow">ROOM Jūrmala</p><h1>${side.pricingTitle}</h1><p>${t.intro}</p></header>
 <section class="simple-rental" data-simple-calculator data-greeting="${esc(t.greeting)}" aria-labelledby="simple-title"><div class="simple-rental-options"><h2 id="simple-title">${t.title}</h2><div class="hour-choices">${[2,3,4,8].map(choice).join('')}</div><p class="hour-saving-note">${{lv:'Ietaupījums salīdzinājumā ar 20 € stundā.',en:'Savings compared with €20 per hour.',ru:'Экономия по сравнению с 20 € в час.'}[lang]}</p><details class="other-hours"><summary>${t.other}</summary><div class="hour-choices">${[1,5,6,7].map(choice).join('')}</div></details></div>
 <div class="simple-rental-result"><div aria-live="polite" aria-atomic="true"><p>${t.total}</p><strong class="simple-total" data-simple-total>55 €</strong><p class="simple-duration" data-simple-duration>${duration(3)}</p></div><a class="button" data-simple-book href="${wa(t.greeting+' '+duration(3)+' · 55 €')}" target="_blank" rel="noopener noreferrer">${t.book}</a><p class="simple-confirmation">${t.note}</p><noscript><p>${t.intro} <a href="${wa(t.greeting)}">WhatsApp</a></p></noscript></div></section>

 <details class="regular-rental" open><summary>${t.regular}</summary><div class="regular-plans"><article><h3>${t.days}</h3><p>${t.daysNote}</p><dl>${[130,250,360,460].map((v,i)=>`<div><dt>${i+1} ${d.units[1][i===0?0:2]}</dt><dd>${v} €</dd></div>`).join('')}</dl><a href="${wa(t.greeting+' '+t.days)}">${t.ask}</a></article><article><h3>${t.week}</h3><strong>550 €</strong><p>${t.weekNote}</p><a href="${wa(t.greeting+' '+t.week+' · 550 €')}">${t.ask}</a></article><article><h3>${t.month}</h3><strong>460 €</strong><p>${t.monthNote}</p><a href="${wa(t.greeting+' '+t.month+' · '+t.monthNote)}">${t.ask}</a></article></div></details>
</article>`;
}
function editorialPage(lang,kind,d){
 if(kind==='pricing')return simplePricing(lang,d);
 const t=sideCopy[lang],p=servicePages[lang][kind],isPrice=kind==='pricing';
 const title=p?clean(p.eyebrow):isPrice?t.pricingTitle:t.spaceTitle;
 const intro=p?p.intro:isPrice?t.priceIntro:t.description;
 const picture=kind==='party'?4:kind==='workshops'?3:newPhotoIndex(1);
 const entries=p?p.details:t.spaceDetails;
 return `<article class="editorial-page"><header class="editorial-heading"><nav class="breadcrumbs" aria-label="${lang==='lv'?'Lapas ceļš':lang==='en'?'Breadcrumb':'Навигация'}"><a href="${route(lang)}">${t.home}</a><span>/</span><span>${p?p.name:isPrice?t.pricingTitle:t.spaceTitle}</span></nav><p class="editorial-eyebrow">${t.eyebrow}</p><h1>${title}</h1><p class="editorial-intro">${intro}</p></header>
 ${isPrice?rentalCalculator(lang,d):''}<div class="editorial-layout"><div class="editorial-content">${isPrice?`<section class="editorial-section"><h2>${t.hours}</h2><dl class="editorial-hourly">${[20,38,55,70,85,100,115,130].map((price,i)=>`<div><dt>${i+1} h</dt><dd>${price} €</dd></div>`).join('')}</dl><p>${t.note}</p></section><section class="editorial-section"><h2>${t.packages}</h2><dl class="editorial-packages">${d.packageNames.map((n,i)=>`<div><dt>${n}<small>${d.packageTerms[i]}</small></dt><dd>${[130,550,460][i]} €</dd></div>`).join('')}</dl><p>${t.membership}</p></section>`:`<figure class="editorial-photo"><img src="${photo(picture)}" width="${picture===3?2048:1536}" height="${picture===3?1536:2048}" alt="${esc(d.photoNames[picture])}" sizes="(max-width: 760px) 90vw, (max-width: 1440px) 60vw, 885px" fetchpriority="high"></figure>${entries.map(([heading,text],i)=>`<section class="editorial-section"><div class="activity-heading">${kind==='space'?activityArt(['table','play','calendar'][i]):''}<h2>${heading}</h2></div><p>${text}</p>${kind==='space'?i===0?mediaPhotos(lang,[6,15])+venueFilms(lang,[14,18]):i===1?'':mediaPhotos(lang,[4]):''}</section>`).join('')}`}
 ${kind==='space'?consolidatedServices(lang):''}<section class="editorial-section editorial-planning"><h2>${t.planTitle}</h2>${t.plan.map(text=>`<p>${text}</p>`).join('')}</section></div>
 <aside class="editorial-aside" aria-label="${esc(t.rates)}"><p class="editorial-eyebrow">${t.rates}</p>${p?`<dl>${p.rates.map(([price,term])=>`<div><dt>${term}</dt><dd>${price}</dd></div>`).join('')}</dl><p>${p.priceNote}</p>`:`<p class="editorial-start-price">20 € <small>/ h</small></p><p>${t.note}</p>`}<a class="button button-orange" href="#calendar">${t.book}</a>${!isPrice?`<a class="editorial-link" href="${route(lang,'pricing')}">${t.allPrices}</a>`:''}<div class="editorial-location"><p>${t.location}</p><p>${t.access}</p></div></aside></div>
 </article>`;
}
function hours(lang){
 const t=openingHoursCopy[lang];
 return `<section class="opening-hours" aria-label="${t.title}"><h2>${t.title}</h2><dl>${openingHours.map((slot,i)=>`<div><dt>${t.days[i]}</dt><dd><time datetime="${slot.opens}">${slot.opens}</time>–<time datetime="${slot.closes}">${slot.closes}</time></dd></div>`).join('')}</dl></section>`;
}
function minimalFooter(lang){
 const t=sideCopy[lang];
 return `<footer class="minimal-footer" id="contact"><div><a class="minimal-wordmark" href="${route(lang)}">ROOM Jūrmala</a><p>${t.location}</p></div><div><p>${t.contact}</p><a href="tel:+37127850380">+371 27 850 380</a><a href="mailto:welcome@roomjurmala.lv">welcome@roomjurmala.lv</a><small>${t.contactNote}</small>${hours(lang)}</div></footer>`;
}
function serviceHead(lang,kind){
 const p=servicePages[lang][kind],url='https://roomjurmala.lv'+route(lang,kind),image='https://roomjurmala.lv'+photo(p.image===0?p.detailImage:p.image);
 const schemas=[{'@context':'https://schema.org','@type':'Service',name:p.eyebrow,description:p.description,url,serviceType:p.name,areaServed:{'@type':'City',name:'Jūrmala'},provider:{'@type':'LocalBusiness','@id':'https://roomjurmala.lv/#business',name:'ROOM Jūrmala',url:'https://roomjurmala.lv/',telephone:'+37127850380',image,address:{'@type':'PostalAddress',streetAddress:'Skolas iela 50',addressLocality:'Jūrmala',postalCode:'LV-2016',addressCountry:'LV'}}},
 {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:design[lang].home,item:'https://roomjurmala.lv'+route(lang)},{'@type':'ListItem',position:2,name:p.name,item:url}]},
 {'@context':'https://schema.org','@type':'FAQPage',mainEntity:p.faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}];
 return `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(p.title)}</title><meta name="description" content="${esc(p.description)}"><link rel="canonical" href="${url}">${['lv','en','ru','x-default'].map(l=>`<link rel="alternate" hreflang="${l}" href="https://roomjurmala.lv${route(l==='x-default'?'lv':l,kind)}">`).join('')}<meta property="og:type" content="website"><meta property="og:site_name" content="ROOM Jūrmala"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta name="twitter:card" content="summary_large_image">${schemas.map(data=>`<script type="application/ld+json">${json(data)}</script>`).join('')}`;
}
function priceStrip(lang,d){
 return `<section class="price-strip" id="pricing"><h2>${d.simplePrice}</h2><div class="strip-rates"><p><span>${d.from}</span> 20 € <small>/ ${d.perHour}</small></p><p>130 € <small>/ ${d.perDay}</small></p><a class="text-link" href="${route(lang,'pricing')}">${d.allPrices}${diagonal}</a></div></section>`;
}
function reviews(lang){
 const t=reviewCopy[lang];
 const stars=`<span class="review-stars" role="img" aria-label="${esc(t.rating)}">★★★★★</span>`;
 return `<section class="section reviews-section" id="reviews" aria-labelledby="reviews-title"><div class="reviews-heading"><div><p class="reviews-eyebrow">${t.eyebrow}</p><h2 id="reviews-title">${t.title}</h2></div><a class="reviews-score" href="${esc(reviewSource)}" target="_blank" rel="noopener noreferrer"><strong>${lang==='en'?'5.0':'5,0'}<span>/ 5</span></strong><span>${stars}<span class="reviews-count">${t.count}</span></span></a></div>
 <div class="reviews-grid">${customerReviews.map(r=>`<figure class="review-card"><span class="review-quote-mark" aria-hidden="true">“</span><blockquote cite="${esc(r.url)}" lang="lv"><p>${esc(r.quote)}</p></blockquote><figcaption><img class="review-avatar" src="${esc(r.avatar)}" width="40" height="40" alt="" loading="lazy" referrerpolicy="no-referrer"><span><span class="review-author" lang="lv">${esc(r.author)}</span><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(t.original+' · '+r.author)}">${t.original}</a></span></figcaption></figure>`).join('')}</div><div class="reviews-bottom"><div class="review-actions"><a class="text-link" href="${esc(reviewSource)}" target="_blank" rel="noopener noreferrer">${t.all}</a><a class="button review-write" href="https://search.google.com/local/writereview?placeid=ChIJRx5g737n7kYRPc4miG_Jw1o" target="_blank" rel="noopener noreferrer">${t.write}</a></div></div></section>`;
}
function booking(c,d){
 return `<section id="calendar" class="section quick-booking"><div><h2>${d.bookingTitle}</h2><p>${d.bookingIntro}</p></div>
 <div class="booking-calendar" hidden><div class="cal-nav"><button type="button" class="circle-button" id="prevMonth" aria-label="${esc(d.prevMonth)}"><span class="turn-back">${arrow}</span></button><h3 id="calMonthLabel" aria-live="polite"></h3><button type="button" class="circle-button" id="nextMonth" aria-label="${esc(d.nextMonth)}">${arrow}</button></div><div class="cal-weekdays" aria-hidden="true">${c.calendar.daysShort.map(day=>`<span>${day}</span>`).join('')}</div><div id="calGrid" class="cal-grid" role="group" aria-labelledby="calMonthLabel"></div><p class="cal-legend"><span></span>${d.scheduled}</p></div><div class="quick-booking-content"><noscript><p class="notice">${d.noScript} <a href="https://wa.me/37127850380">WhatsApp</a></p></noscript>
 <form id="booking-form" action="https://wa.me/37127850380" method="get" target="_blank" rel="noopener noreferrer" novalidate data-booking-ui hidden>
  <p id="booking-error" class="form-error" role="alert" hidden></p>
  <div class="quick-fields"><div class="field"><label for="booking-date">${c.booking.labels.date}</label><input id="booking-date" type="date" required></div><div class="field"><label for="booking-time">${d.approximateTime}</label><input id="booking-time" type="time" required></div></div>
  <input type="hidden" name="text" id="whatsapp-message"><p id="selected-plan" class="selected-plan" hidden><span></span><button type="button" id="clear-plan">${d.clearPlan}</button></p>
  <button class="button button-orange form-submit" type="submit">${d.bookWhatsApp}</button>
 </form></div><div class="cal-widget" aria-live="polite"></div></section>`;
}
function faqItems(lang,kind,c){
 return servicePages[lang][kind]?servicePages[lang][kind].faq.map(([q,a])=>({q,a})):kind==='space'?source[lang+'-space'].faq:c.faq.items.map(([q,a])=>({q,a}));
}
function faq(lang,kind,c,d){
 const items=faqItems(lang,kind,c);
 return `<section class="section faq-section" id="faq"><div class="faq-heading reveal"><h2>${kind==='home'?d.faqTitle:sideCopy[lang].faq}</h2><p>${c.faq.sub}</p></div><div class="faq-list">${items.map(x=>`<details><summary>${x.q}${plus}</summary><p>${x.a}</p></details>`).join('')}</div></section>`;
}
function footer(lang,c,d){
 const labels={lv:{contact:'Sazinieties ar mums',social:'ROOM ikdiena',credit:'Mājaslapu izstrādāja'},en:{contact:'Get in touch',social:'Life at ROOM',credit:'Website by'},ru:{contact:'Свяжитесь с нами',social:'Жизнь ROOM',credit:'Разработка сайта'}}[lang];
 const socialIcons={
  instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
  facebook:'<path d="M14 21v-8h3l.5-4H14V7c0-1.1.3-2 2-2h2V1.5A24 24 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v8"/>',
  tiktok:'<path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.47V15a1.5 1.5 0 1 0 1 1.42V3h3c.3 3 2 4.7 5 5v3c-2-.1-3.7-.8-5-2"/>'
 };
 const socials=[['Instagram','instagram','https://www.instagram.com/room.jurmala/'],['Facebook','facebook','https://www.facebook.com/people/Room-J%C5%ABrmala/61583247131495/'],['TikTok','tiktok','https://www.tiktok.com/@room.jurmala']];
 return `<footer class="site-footer" id="contact"><div class="footer-map"><iframe title="${esc(c.map.iframeTitle)}" src="https://www.google.com/maps?q=ROOM%20J%C5%ABrmala%2C%20Skolas%20iela%2050%2C%20J%C5%ABrmala&amp;z=16&amp;output=embed&amp;hl=${lang}" width="1200" height="360" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div><div class="footer-main"><div class="footer-identity"><a class="brand" href="${route(lang)}"><img src="/assets/images/brand/logo-header-224.webp" width="224" height="150" alt="ROOM Jūrmala" loading="lazy"></a><div id="map-section"><address>Skolas iela 50, Jūrmala</address><a class="text-link" href="https://www.google.com/maps/search/?api=1&query=ROOM+Jurmala+Skolas+iela+50" target="_blank" rel="noopener noreferrer">${c.map.buttons[0]}${diagonal}</a></div></div><div class="footer-contact"><p class="footer-label">${labels.contact}</p><a class="footer-phone" href="tel:+37127850380">+371 27 850 380</a><a class="footer-email" href="mailto:welcome@roomjurmala.lv">welcome@roomjurmala.lv</a>${hours(lang)}</div></div>
 <nav class="footer-socials" aria-label="${esc(labels.social)}">${socials.map(([name,key,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer"><span class="social-symbol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${socialIcons[key]}</svg></span><span>${name}</span></a>`).join('')}</nav>
 <div class="footer-bottom"><span>${c.footer.copy}</span><a class="site-credit" href="https://seolatvija.lv/" target="_blank" rel="noopener noreferrer"><span>${labels.credit}</span><strong>SEO Latvija</strong></a></div></footer>
 <a class="mobile-book button button-orange" href="#calendar" aria-hidden="true" tabindex="-1">${d.findDate}</a>`;
}
function dialogs(d){
 return `<dialog id="media-dialog" aria-label="${esc(d.explore)}"><button class="dialog-close circle-button" aria-label="${esc(d.close)}">${plus}</button><div id="dialog-content"></div></dialog>`;
}
for(const lang of ['lv','en','ru'])for(const kind of ['home','space','pricing']){
 const c=copy[lang], d=design[lang], page=source[lang+'-'+kind]||{head:serviceHead(lang,kind)};
 let head=page.head.replace(/<!-- Google tag[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/,'');
 head=head.replace(/\s*<!--[^]*?-->/g,'');
 // Schema describes the content still visible on each page.
 head=head.replace(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,(tag,raw)=>{
   const data=JSON.parse(raw);
   if(data['@type']==='FAQPage'){data.mainEntity=faqItems(lang,kind,c).map(({q,a})=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}));}
   if(kind==='space'&&data['@type']==='CollectionPage'){
     data.description=sideCopy[lang].description;
     data.mainEntity={'@type':'ItemList',itemListElement:['party','workshops'].map((k,i)=>({'@type':'ListItem',position:i+1,name:servicePages[lang][k].name,url:'https://roomjurmala.lv'+route(lang,k)}))};
   }
   if([].concat(data['@type']).includes('LocalBusiness'))data.openingHoursSpecification=openingHours;
   delete data.aggregateRating;
   return '<script type="application/ld+json">'+json(data)+'</script>';
 });
 const body=kind==='home'?paperHero(lang,d)+paperGallery(lang,d)+priceStrip(lang,d)+reviews(lang):editorialPage(lang,kind,d);
 const data={lang,d,calculator:calculatorCopy[lang],serviceRequest:servicePages[lang][kind]?.request||'',booking:c.booking,calendar:c.calendar,whatsapp:c.whatsapp,photos:photoFiles.map((f,i)=>({src:photo(i),name:d.photoNames[i],description:d.photoDescriptions[i],video:i<videos.length?'/assets/videos/'+videos[i]:null})),mapTitle:c.map.iframeTitle};
 let html=`<!DOCTYPE html>
<html lang="${lang}">
<head>${head}
  <meta name="theme-color" content="#173f34">
  <link rel="preload" as="font" type="font/woff2" href="/assets/fonts/site-abcaa8b479-co3bmX5slCNuHLi8bLeY9MK7whWMhyjYqXtK.woff2" crossorigin>
  ${lang==='lv'?'<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/site-26a769c817-co3bmX5slCNuHLi8bLeY9MK7whWMhyjYp3tKgS4.woff2" crossorigin>':lang==='ru'?'<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/site-dc67de7e1c-co3bmX5slCNuHLi8bLeY9MK7whWMhyjYrXtKgS4.woff2" crossorigin>':''}
  ${kind==='home'?'<script>document.documentElement.classList.add("has-js")</script><link rel="preload" as="image" href="/assets/images/video-posters/june-17-preview.webp" fetchpriority="high">':''}
  ${kind==='home'?`<style>${criticalStyles(header(lang,kind,c,d)+paperHero(lang,d))}</style>
  <link data-site-styles rel="stylesheet" href="/assets/css/bundle.css?v=20260912-booking" media="print" onload="this.media='all'" onerror="this.media='all';this.dataset.failed='true'">
  <noscript><link rel="stylesheet" href="/assets/css/bundle.css?v=20260912-booking"></noscript>`:'<link rel="stylesheet" href="/assets/css/bundle.css?v=20260912-booking">'}
  <script src="/calendar-events.js?v=20260919-event-images" defer></script>
  <script src="/assets/js/analytics.js?v=20260911" defer></script>
  ${['scroll','paper','hero-tour','films'].map(name=>`<link rel="modulepreload" href="/assets/js/${name}.js?v=20260912-fast2">`).join('')}
  <link rel="modulepreload" href="/assets/js/booking-core.js?v=20260911-mobile-fix">
  <script type="module" src="/assets/js/app.js?v=20260919-event-images"></script>
</head>
<body class="page-${kind} ${kind==='home'?'':'page-editorial'}">${header(lang,kind,c,d)}<main id="main">${body}${kind==='home'?booking(c,d):''}${faq(lang,kind,c,d)}</main>${kind==='home'?footer(lang,c,d):minimalFooter(lang)}${dialogs(d)}
<script id="site-data" type="application/json">${json(data)}</script>
</body></html>
`;
 html=html.replace(/<img\b([^>]*?)src="(\/assets\/images\/gallery\/[^"]+\.(?:jpg|jpeg|png))"([^>]*)>/g,(tag,before,src,after)=>{
   const variants=imageVariants[src];
   if(!variants)return tag;
   return `<img${before}src="${src}" srcset="${variants.map(v=>v.src+' '+v.width+'w').join(', ')}" ${/\bsizes=/.test(before+after)?'':' sizes="auto, 90vw"'}${after}>`;
 });
 if(kind!=='home'){
  const destination=route(lang)+(data.serviceRequest?'?service='+encodeURIComponent(data.serviceRequest):'')+'#calendar';
  html=html.replaceAll('href="#calendar"','href="'+esc(destination)+'"').replace('<script src="/calendar-events.js?v=20260919-event-images" defer></script>','');
 }
 const dir='.'+route(lang,kind);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'index.html',html.replace(/[ \t]+$/gm,'').replace(/\n{3,}/g,'\n\n'));
}
console.log('Built 9 static pages in LV, EN and RU with existing assets.');

const sitemapRoutes=['home','space','pricing'];
fs.writeFileSync('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+sitemapRoutes.flatMap(kind=>['lv','en','ru'].map(lang=>`  <url><loc>https://roomjurmala.lv${route(lang,kind)}</loc>${['lv','en','ru','x-default'].map(l=>`<xhtml:link rel="alternate" hreflang="${l}" href="https://roomjurmala.lv${route(l==='x-default'?'lv':l,kind)}" />`).join('')}<lastmod>2026-09-12</lastmod></url>`)).join('\n')+'\n</urlset>\n');
