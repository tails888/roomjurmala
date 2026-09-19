import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import { openEventStore } from '../scripts/event-store.mjs';
import { createLocalServer } from '../scripts/serve.mjs';
import { rigaClock, addDays, validateEvent, occurrences, archivedEntries } from '../assets/js/event-model.mjs';

const root = path.resolve(import.meta.dirname, '..');
const now = {date:'2026-09-19', time:'13:00'};
const input = {title:'Radošā darbnīca', date:'2026-09-21', startTime:'17:00', endTime:'18:30', description:'Ņem līdzi labu omu.', weekly:true};
async function fixture(t) {
  const folder = await mkdtemp(path.join(root, '../event-tests-'));
  t.after(() => rm(folder, {recursive:true, force:true}));
  const file = path.join(folder, 'events.json');
  return {file, store:await openEventStore(file, path.join(root, 'content/events-seed.json'))};
}

test('new event survives restart, and concurrent writes do not overwrite each other', async t => {
  const {file, store} = await fixture(t);
  const added = await Promise.all(Array.from({length:8}, (_,i) => store.create({...input, title:'Pasākums '+i}, now)));
  const reopened = await openEventStore(file, path.join(root, 'content/events-seed.json'));
  for (const event of added) assert.ok(reopened.list().some(e => e.id === event.id));
  assert.equal(new Set(added.map(e => e.id)).size, 8);
});

test('cancel one weekly occurrence without changing the following week, then restore it', async t => {
  const {store} = await fixture(t);
  const event = await store.create(input, now);
  await store.change(event.id, {action:'cancel', scope:'one', date:input.date}, now);
  let saved = store.list().find(e => e.id === event.id);
  assert.deepEqual(occurrences([saved], input.date, addDays(input.date, 14)).map(row => row.date), ['2026-09-28','2026-10-05']);
  assert.equal(occurrences([saved], input.date, addDays(input.date, 14), true).length, 1);
  await store.change(event.id, {action:'restore', scope:'one', date:input.date}, now);
  saved = store.list().find(e => e.id === event.id);
  assert.equal(occurrences([saved], input.date, addDays(input.date, 14)).length, 3);
});

test('cancel future series preserves earlier dates and single-date exceptions', async t => {
  const {store} = await fixture(t);
  const event = await store.create(input, now);
  await store.change(event.id, {action:'cancel', scope:'one', date:'2026-10-05'}, now);
  await store.change(event.id, {action:'cancel', scope:'series', date:'2026-09-28'}, now);
  assert.deepEqual(occurrences([store.list().find(e => e.id === event.id)], input.date, '2026-10-12').map(row => row.date), [input.date]);
  await store.change(event.id, {action:'restore', scope:'series', date:'2026-09-28'}, now);
  assert.deepEqual(occurrences([store.list().find(e => e.id === event.id)], input.date, '2026-10-12').map(row => row.date), [input.date, '2026-09-28', '2026-10-12']);
});

test('one-time events can be cancelled and restored without deleting data', async t => {
  const {store} = await fixture(t);
  const event = await store.create({...input, weekly:false}, now);
  await store.change(event.id, {action:'cancel', scope:'one', date:input.date}, now);
  assert.equal(occurrences([store.list().find(e => e.id === event.id)], input.date, input.date).length, 0);
  await store.change(event.id, {action:'restore', scope:'one', date:input.date}, now);
  assert.equal(occurrences([store.list().find(e => e.id === event.id)], input.date, input.date).length, 1);
});

test('invalid dates, past times, reversed times and wrong types are rejected', () => {
  for (const [patch, field] of [[{date:'2026-02-30'},'date'], [{date:'2026-09-18'},'date'], [{title:'  '},'title'],
    [{startTime:'19:00'},'endTime'], [{endTime:'24:00'},'endTime'], [{date:now.date,startTime:'12:00'},'startTime'], [{weekly:'yes'},'weekly']]) {
    assert.ok(validateEvent({...input, ...patch}, now)[field]);
  }
  assert.deepEqual(validateEvent(input, now), {});
  assert.deepEqual(rigaClock(new Date('2026-10-25T01:30:00Z')), {date:'2026-10-25',time:'03:30'});
});

test('API persists changes, validates requests and rejects foreign origins and private files', async t => {
  const {file} = await fixture(t);
  const server = await createLocalServer({root, dataFile:file});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const headers = {'Content-Type':'application/json','X-Room-Admin':'1',Origin:origin};
  const payload = {...input, date:addDays(rigaClock().date, 1), weekly:false};
  assert.equal((await fetch(origin+'/api/events', {method:'POST', headers:{...headers, Origin:'https://example.com'}, body:JSON.stringify(payload)})).status, 403);
  assert.equal((await fetch(origin+'/api/events', {method:'POST', headers, body:'bad JSON'})).status, 400);
  assert.equal((await fetch(origin+'/api/events', {method:'POST', headers, body:JSON.stringify({...payload,title:''})})).status, 400);
  const foreignHostStatus = await new Promise((resolve, reject) => {
    http.get(origin+'/api/events', {headers:{Host:'example.com'}}, response => { response.resume(); resolve(response.statusCode); }).on('error',reject);
  });
  assert.equal(foreignHostStatus, 403);
  for (const url of ['/content/events-seed.json','/scripts/event-store.mjs','/.git/config','/data/events.json']) assert.equal((await fetch(origin+url)).status, 404);
  const created = await fetch(origin+'/api/events', {method:'POST', headers, body:JSON.stringify(payload)});
  assert.equal(created.status, 201);
  const {event} = await created.json();
  const response = await fetch(origin+'/api/events/'+event.id, {method:'PATCH',headers,body:JSON.stringify({action:'cancel',scope:'one',date:payload.date})});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).event.status, 'cancelled');
  assert.equal(JSON.parse(await readFile(file,'utf8')).events.find(e => e.id === event.id).status, 'cancelled');
});

test('public calendar respects API cancellations and retains Latvian text as language fallback', async () => {
  const context = {window:{}};
  vm.runInNewContext(await readFile(path.join(root,'calendar-events.js'),'utf8'), context);
  const calendar = context.window.RoomJurmalaCalendar;
  calendar.events.splice(0, calendar.events.length,
    {date:'2026-09-21', time:'17:00-18:00', title:{lv:'Atcelts'}, status:'cancelled'},
    {start:'2026-09-21', weekdays:[1],time:'17:00-18:00',title:{lv:'Izņēmums'},exclusions:['2026-09-21']},
    {start:'2026-09-21', weekdays:[1],time:'17:00-18:00',title:{lv:'Sērija'},cancelledFrom:'2026-09-21'},
    {date:'2026-09-21',time:'18:00-19:00',title:{lv:'Darbnīca'}});
  assert.equal(calendar.getEventsForDate(2026,8,21).length, 1);
  assert.equal(calendar.resolveLocalized(calendar.getEventsForDate(2026,8,21)[0].title,'en'), 'Darbnīca');
});

test('bulk cancellation preserves past events, persists and can be restored',async t=>{
  const {file,store}=await fixture(t);
  const weekly=await store.create(input,now);
  const once=await store.create({...input,weekly:false},now);
  const past=await store.create({...input,date:'2026-09-18',weekly:false},{date:'2026-09-17',time:'12:00'});
  assert.throws(()=>store.cancelAll({confirm:false},now));
  const result=await store.cancelAll({confirm:true},now);
  assert.ok(result.changed>0);
  assert.equal(occurrences(result.events,now.date,addDays(now.date,730)).length,0);
  assert.deepEqual(result.events.find(e=>e.id===past.id),past);
  assert.equal((await store.cancelAll({confirm:true},now)).changed,0);
  const reopened=await openEventStore(file,path.join(root,'content/events-seed.json'));
  assert.equal(occurrences(reopened.list(),now.date,addDays(now.date,730)).length,0);
  await reopened.change(once.id,{action:'restore',scope:'one',date:input.date},now);
  await reopened.change(weekly.id,{action:'restore',scope:'series',date:input.date},now);
  assert.equal(occurrences(reopened.list().filter(e=>[once.id,weekly.id].includes(e.id)),input.date,input.date).length,2);
});

test('archive and permanent deletion isolate one occurrence and retain earlier series history',async t=>{
  const {store}=await fixture(t);
  const one=await store.create({...input,weekly:false},now);
  await assert.rejects(store.archive(one.id,{action:'delete',scope:'one',date:input.date,confirm:true}));
  await store.change(one.id,{action:'cancel',scope:'one',date:input.date},now);
  await store.archive(one.id,{action:'archive',scope:'one',date:input.date});
  assert.equal(archivedEntries(store.list()).length,1);
  await assert.rejects(store.archive(one.id,{action:'delete',scope:'one',date:input.date}));
  assert.equal((await store.archive(one.id,{action:'delete',scope:'one',date:input.date,confirm:true})).event,null);
  const weekly=await store.create(input,now);
  const command={scope:'one',date:input.date};
  await store.change(weekly.id,{...command,action:'cancel'},now);
  await store.archive(weekly.id,{...command,action:'archive'});
  await store.archive(weekly.id,{...command,action:'delete',confirm:true});
  await assert.rejects(store.change(weekly.id,{...command,action:'restore'},now));
  const next=addDays(input.date,7);
  assert.equal(occurrences(store.list().filter(e=>e.id===weekly.id),next,next).length,1);
  await store.change(weekly.id,{action:'cancel',scope:'series',date:next},now);
  await store.archive(weekly.id,{action:'archive',scope:'series',date:next});
  const result=await store.archive(weekly.id,{action:'delete',scope:'series',date:next,confirm:true});
  assert.equal(result.event.end,addDays(next,-1));
  assert.equal(archivedEntries([result.event]).length,0);
});

 test('local event photos persist separately and permanent deletion removes their file', async t => {
  const {file,store} = await fixture(t);
  const bytes = await readFile(path.join(root,'assets/images/social/og-image.jpg'));
  const event = await store.create({...input,weekly:false,imageData:'data:image/jpeg;base64,'+bytes.toString('base64')},now);
  assert.equal(event.image,'/api/events/'+event.id+'/image');
  assert.deepEqual(await store.image(event.id),bytes);
  assert.equal(event.imageData,undefined);
  await assert.rejects(store.create({...input,imageData:'data:image/jpeg;base64,SGVsbG8='},now));
  const reopened = await openEventStore(file,path.join(root,'content/events-seed.json'));
  assert.deepEqual(await reopened.image(event.id),bytes);
  await reopened.change(event.id,{action:'cancel',scope:'one',date:input.date},now);
  await reopened.archive(event.id,{action:'archive',scope:'one',date:input.date});
  await reopened.archive(event.id,{action:'delete',scope:'one',date:input.date,confirm:true});
  await assert.rejects(reopened.image(event.id));
  await assert.rejects(readFile(path.join(file+'.images',event.id+'.jpg')),{code:'ENOENT'});
});
