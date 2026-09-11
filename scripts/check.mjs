import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const origin = 'https://roomjurmala.lv';
const routes = ['', 'telpa/', 'cenas/', 'en/', 'en/telpa/', 'en/cenas/', 'ru/', 'ru/telpa/', 'ru/cenas/'];
const pages = new Map();
const read = file => fs.readFileSync(file, 'utf8');
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
const localFile = pathname => path.join(root, decodeURIComponent(pathname), pathname.endsWith('/') ? 'index.html' : '');

for (const route of routes) {
  const file = localFile('/' + route);
  const html = read(file);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size, `${route} has duplicate IDs`);
  pages.set('/' + route, { file, html, ids: new Set(ids) });
}

function checkUrl(value, base) {
  const url = new URL(value.replaceAll('&amp;', '&'), base);
  if (url.origin !== origin) return;
  const file = localFile(url.pathname);
  assert(fs.existsSync(file), `${base} links to missing file ${url.pathname}`);
  if (url.hash && pages.has(url.pathname)) {
    assert(pages.get(url.pathname).ids.has(decodeURIComponent(url.hash.slice(1))), `${base} links to missing fragment ${url.href}`);
  }
}

for (const [route, { html, ids }] of pages) {
  const base = origin + route;
  const lang = route.startsWith('/en/') ? 'en' : route.startsWith('/ru/') ? 'ru' : 'lv';
  assert(html.includes(`<html lang="${lang}">`), `${route} language`);
  assert.equal([...html.matchAll(/<h1[ >]/g)].length, 1, `${route} needs one h1`);
  assert.equal([...html.matchAll(/<title>/g)].length, 1, `${route} title`);
  assert(/<title>[^<]+<\/title>/.test(html), `${route} empty title`);
  assert(/<meta name="description" content="[^"]+"/.test(html), `${route} description`);
  const canonical = [...html.matchAll(/<link\b[^>]*>/g)].map(m => attrs(m[0])).filter(a => a.rel === 'canonical');
  assert.equal(canonical.length, 1, `${route} canonical count`);
  assert.equal(canonical[0].href, base, `${route} canonical URL`);
  const alternate = [...html.matchAll(/<link\b[^>]*>/g)].map(m => attrs(m[0])).filter(a => a.rel === 'alternate');
  for (const locale of ['lv', 'en', 'ru']) assert(alternate.some(a => a.hreflang === locale), `${route} lacks ${locale} alternate`);
  assert(!/src="https:\/\/www.googletagmanager/.test(html), `${route} loads analytics in local preview`);
  for (const match of html.matchAll(/<(?:a|link|img|script|source|video)\b[^>]*>/g)) {
    const a = attrs(match[0]);
    for (const key of ['href', 'src', 'poster']) if (a[key]) checkUrl(a[key], base);
    if (match[0].startsWith('<img')) assert('alt' in a && a.width && a.height, `${route} image lacks alt or dimensions`);
  }
  for (const match of html.matchAll(/<(?:label|[^>]+)\b[^>]*\b(?:for|aria-controls|aria-labelledby|aria-describedby)="[^>]*>/g)) {
    const a = attrs(match[0]);
    for (const key of ['for', 'aria-controls', 'aria-labelledby', 'aria-describedby']) {
      if (a[key]) for (const id of a[key].split(/\s+/)) assert(ids.has(id), `${route} references missing ID ${id}`);
    }
  }
  const jsonScripts = [...html.matchAll(/<script[^>]*type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/g)];
  assert(jsonScripts.length >= 2, `${route} structured data and UI copy`);
  for (const m of jsonScripts) JSON.parse(m[1]);
  const data = JSON.parse(html.match(/<script id="site-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  for (const photo of data.photos) {
    checkUrl(photo.src, base);
    checkUrl(photo.video, base);
  }
  if (['/','/en/','/ru/'].includes(route)) {
    assert.equal([...html.matchAll(/<video\b/g)].length,5,`${route} must embed all five real videos`);
    assert.equal([...html.matchAll(/class="ambient-video"/g)].length,5,`${route} visibility-controlled media`);
    assert(html.includes('"@type":"FAQPage"')&&html.includes('id="faq"'),`${route} must include visible FAQs and matching schema`);
  }
  assert(!/id="customerName"|id="customerPhone"|id="bookingNotes"/.test(html),`${route} booking should stay simple`);
  if (['/','/en/','/ru/'].includes(route)) {
  assert.equal([...html.matchAll(/<input[^>]*type="(?:date|time)"/g)].length,2,`${route} has two booking fields`);
  assert(/action="https:\/\/wa.me\/37127850380" method="get"/.test(html),`${route} native WhatsApp handoff`);
  assert(/data-booking-ui hidden/.test(html), `${route} must not expose an unhandled form before JS is ready`);
  } else {
    assert(!ids.has('calendar')&&!ids.has('booking-form'),route+' must use the homepage calendar');
    assert(!/<iframe|class="footer-socials"|class="reviews-section"/.test(html),route+' should have no map, social or reviews widgets');
    assert((html.includes('class="editorial-page"')||html.includes('class="simple-price-page"'))&&html.includes('class="minimal-footer"'),route+' needs the minimal article layout');
    assert(html.includes('#calendar'),route+' needs a homepage booking link');
  }
}

for(const lang of ['','en/','ru/']){
 for(const slug of ['bernu-ballites','telpas-nodarbibam']){
  assert(!fs.existsSync(path.join(root,lang,slug,'index.html')),'Retired service page still exists');
  assert(pages.get('/'+lang+'telpa/').ids.has(slug),'Consolidated service section missing');
 }
}
for(const route of ['/cenas/','/en/cenas/','/ru/cenas/']){
 const {html}=pages.get(route);
 assert(html.includes('data-simple-calculator'),'Simple calculator must be present');
 assert.equal((html.match(/data-simple-hour=/g)||[]).length,8,'All eight hourly prices must remain available');
 assert(html.includes('class="regular-rental"'),'Longer hire terms must remain available');
}
const sitemap=read('sitemap.xml');
const submitted=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
assert.equal(submitted.length,pages.size,'Sitemap must contain every page once');
assert.deepEqual(new Set(submitted),new Set(pages.keys()),'Sitemap and built routes must match');
const titles=[...pages.values()].map(p=>p.html.match(/<title>([^<]+)<\/title>/)[1]);
assert.equal(new Set(titles).size,titles.length,'Page titles must be distinct');
for(const [route,{html}] of pages){
 if(!/bernu-ballites|telpas-nodarbibam/.test(route))continue;
 const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 assert(schemas.some(s=>s['@type']==='Service'),'Service schema missing');
 const breadcrumbs=schemas.find(s=>s['@type']==='BreadcrumbList');
 assert.equal(breadcrumbs.itemListElement.at(-1).item,origin+route,'Breadcrumb must name the canonical page');
 for(const question of schemas.find(s=>s['@type']==='FAQPage').mainEntity){
  assert(html.includes('<summary>'+question.name),'FAQ question must be visible');
  assert(html.includes('<p>'+question.acceptedAnswer.text+'</p>'),'FAQ answer must match visible copy');
 }
 assert([...pages.entries()].some(([other,p])=>other!==route&&p.html.includes('href="'+route+'"')),'Service page needs an internal link');
 const language=route.startsWith('/en/')?'en':route.startsWith('/ru/')?'ru':'lv';
 const suffix=route.replace(/^\/(?:en|ru)\//,'/');
 const links=[...html.matchAll(/<link\b[^>]*>/g)].map(m=>attrs(m[0])).filter(a=>a.rel==='alternate');
 for(const locale of ['lv','en','ru']){
  const expected=origin+(locale==='lv'?'':'/'+locale)+suffix;
  assert(links.some(a=>a.hreflang===locale&&a.href===expected),'Language link must stay on the same service');
 }
}

for (const file of ['assets/css/site.css', 'assets/css/paper.css', 'assets/fonts/site-fonts.css']) {
  for (const match of read(file).matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
    checkUrl(match[1], origin + '/' + file);
  }
}
for (const dir of ['assets/js', 'scripts', 'tests']) {
  for (const file of fs.readdirSync(dir).filter(f => /\.(m?js)$/.test(f))) {
    const result = spawnSync(process.execPath, ['--check', path.join(dir, file)], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
}
assert(fs.existsSync('assets/vendor/three.module.js') && fs.existsSync('assets/vendor/three.core.js'), 'Three.js modules');
assert(fs.existsSync('assets/vendor/THREE-LICENSE.txt'), 'Three.js license');
console.log('Verified all 9 routes, SEO metadata, internal links, assets, JSON, IDs, form fallback and JavaScript syntax.');
