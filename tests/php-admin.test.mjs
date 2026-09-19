import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import path from 'node:path';
import { rigaClock, addDays, occurrences, archivedEntries } from '../assets/js/event-model.mjs';

const php = process.env.PHP_BINARY || 'php';
const available = spawnSync(php, ['-v']).status === 0;
const root = path.resolve(import.meta.dirname, '..');
test('PHP owner authentication and durable calendar API', {skip:available ? false : 'Set PHP_BINARY to a PHP 8.3+ executable to run the hosting integration tests.'}, async t => {
  const directory = await mkdtemp(path.join(root, '../php-admin-test-'));
  const data = path.join(directory,'private'); await mkdir(data);
  const token = randomBytes(32).toString('hex');
  await writeFile(path.join(data,'bootstrap.json'), JSON.stringify({tokenHash:createHash('sha256').update(token).digest('hex'),expires:Math.floor(Date.now()/1000)+3600}));
  const probe = createServer(); await new Promise(resolve => probe.listen(0,'127.0.0.1',resolve));
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  let processHandle;
  async function start() {
    processHandle = spawn(php,['-S',`127.0.0.1:${port}`,'scripts/php-router.php'],{cwd:root,env:{...process.env,ROOM_DATA_DIR:data,ROOM_ORIGIN:origin},stdio:'ignore'});
    for (let i=0;i<60;i++) { try { const result=await fetch(origin+'/api/events'); if(result.ok) return; } catch {} await new Promise(resolve=>setTimeout(resolve,50)); }
    throw new Error('PHP server did not start');
  }
  async function stop() { if (processHandle && processHandle.exitCode === null) await new Promise(resolve => { processHandle.once('exit',resolve); processHandle.kill(); }); }
  t.after(async()=>{await stop();await rm(directory,{recursive:true,force:true});});
  await start();
  function client() {
    return {cookie:'',csrf:'',async call(route, method='GET', body, overrides={}) {
      const response=await fetch(origin+route,{method,headers:{Cookie:this.cookie,Origin:origin,'Content-Type':'application/json','X-Room-Admin':'1','X-CSRF-Token':this.csrf,...overrides},...(body===undefined?{}:{body:JSON.stringify(body)})});
      if(response.headers.get('set-cookie')) this.cookie=response.headers.get('set-cookie').split(';')[0];
      const result=await response.json(); if(result.csrf) this.csrf=result.csrf;
      return {status:response.status,body:result,headers:response.headers};
    }};
  }
  const owner = client(), manager = client();
  const call = (...args) => owner.call(...args);
  const eventInput={title:'Pārbaudes darbnīca <img src=x>',date:addDays(rigaClock().date,2),startTime:'17:00',endTime:'18:30',description:'Latviešu burti āčēģīķļņšūž',weekly:false};
  await t.test('guest cannot write, activate without token, forge origin or omit CSRF',async()=>{
    const session=await call('/api/session');
    assert.equal((await call('/api/events/cancel-all','POST',{confirm:true})).status,401);
    assert.equal(session.body.authenticated,false);assert.ok(session.headers.get('set-cookie').includes('HttpOnly'));
    assert.equal((await call('/api/events','POST',eventInput)).status,401);
    assert.equal((await call('/api/setup','POST',{token:'invalid',email:'test@example.com',password:'not-a-real-password'})).status,403);
    assert.equal((await call('/api/events','POST',eventInput,{Origin:'https://example.com'})).status,403);
    assert.equal((await call('/api/events','POST',eventInput,{'X-CSRF-Token':''})).status,403);
  });
  const password=randomBytes(4).toString('hex');
  await t.test('owner setup is single-use and rotates the session',async()=>{
    assert.equal((await call('/api/setup','POST',{token,email:'owner@example.com',password:'1234567'})).status,400);
    const oldCookie=owner.cookie;
    const result=await call('/api/setup','POST',{token,email:'owner@example.com',password}); assert.equal(result.status,201);assert.notEqual(owner.cookie,oldCookie);
    assert.equal((await call('/api/setup','POST',{token,email:'other@example.com',password})).status,403);
    assert.equal((await call('/api/session')).body.authenticated,true);
  });
  await t.test('migration retains the original login, active session and existing events', async()=>{
    const eventsBefore=(await call('/api/events')).body.events;
    await stop();
    const oldSchema=spawnSync(php,['-r',`$db=new SQLite3(getenv('ROOM_TEST_DB')); $db->exec('CREATE TABLE owner(id INTEGER PRIMARY KEY CHECK(id=1),email TEXT NOT NULL,password_hash TEXT NOT NULL,version TEXT NOT NULL)'); $db->exec('INSERT INTO owner SELECT * FROM administrators'); $db->exec('DROP TABLE administrators'); session_save_path(getenv('ROOM_TEST_SESSIONS')); session_id(getenv('ROOM_TEST_SESSION_ID')); session_start(); $_SESSION['owner_version']=$_SESSION['admin_version']; unset($_SESSION['admin_id'],$_SESSION['admin_version']); session_write_close();`],{env:{...process.env,ROOM_TEST_DB:path.join(data,'calendar.sqlite'),ROOM_TEST_SESSIONS:path.join(data,'sessions'),ROOM_TEST_SESSION_ID:owner.cookie.split('=')[1]}});
    assert.equal(oldSchema.status,0);
    await start();
    const session=(await call('/api/session')).body;
    assert.equal(session.authenticated,true); assert.equal(session.user.email,'owner@example.com');
    assert.deepEqual((await call('/api/events')).body.events,eventsBefore);
  });
  let event;
  await t.test('creation validates dates and is idempotent',async()=>{
    const key={'Idempotency-Key':randomUUID()};
    assert.equal((await call('/api/events','POST',{...eventInput,date:'2026-02-30'},key)).status,400);
    assert.equal((await call('/api/events','POST',{...eventInput,endTime:'16:00'},key)).status,400);
    const created=await call('/api/events','POST',eventInput,key);assert.equal(created.status,201); event=created.body.event;
    assert.equal((await call('/api/events','POST',eventInput,key)).body.event.id,event.id);
    const publicEvents=await call('/api/events');assert.equal(publicEvents.body.events.filter(e=>e.id===event.id).length,1);
    assert.equal(publicEvents.body.events.find(e=>e.id===event.id).description.lv,eventInput.description);
    assert.ok(publicEvents.headers.get('cache-control').includes('no-store'));
  });
  await t.test('cancel, restore and recurring exceptions persist',async()=>{
    const change={action:'cancel',scope:'one',date:eventInput.date};
    assert.equal((await call('/api/events/'+event.id,'PATCH',change)).body.event.status,'cancelled');
    assert.equal((await call('/api/events/'+event.id,'PATCH',{...change,action:'restore'})).body.event.status,'active');
    const weekly=(await call('/api/events','POST',{...eventInput,weekly:true},{'Idempotency-Key':randomUUID()})).body.event;
    assert.deepEqual((await call('/api/events/'+weekly.id,'PATCH',change)).body.event.exclusions,[eventInput.date]);
    assert.equal((await call('/api/events/'+weekly.id,'PATCH',{...change,scope:'series',date:addDays(eventInput.date,7)})).body.event.cancelledFrom,addDays(eventInput.date,7));
    const restored=await call('/api/events/'+weekly.id,'PATCH',{...change,action:'restore',scope:'series',date:addDays(eventInput.date,7)});
    assert.equal(restored.body.event.cancelledFrom,undefined);assert.deepEqual(restored.body.event.exclusions,[eventInput.date]);
    await stop();await start();assert.ok((await call('/api/events')).body.events.some(e=>e.id===event.id));
  });
  const managerToken=randomBytes(32).toString('hex'), managerPassword=randomBytes(18).toString('hex');
  await t.test('a second invitation is email-bound and single-use, with no third account or public signup',async()=>{
    await writeFile(path.join(data,'invitations.json'),JSON.stringify({invitations:[{slot:2,email:'manager@example.com',tokenHash:createHash('sha256').update(managerToken).digest('hex'),expires:Math.floor(Date.now()/1000)+3600}]}));
    await manager.call('/api/session');
    const invitation=await manager.call('/api/activation','POST',{token:managerToken});
    assert.equal(invitation.status,200);assert.equal(invitation.body.email,'manager@example.com');
    assert.equal((await manager.call('/api/setup','POST',{token:managerToken,email:'someone@example.com',password:managerPassword})).status,403);
    const created=await manager.call('/api/setup','POST',{token:managerToken,email:'MANAGER@example.com',password:managerPassword});
    assert.equal(created.status,201);assert.equal(created.body.user.email,'manager@example.com');
    assert.equal((await manager.call('/api/setup','POST',{token:managerToken,email:'third@example.com',password:managerPassword})).status,403);
    assert.equal((await manager.call('/api/setup','POST',{email:'third@example.com',password:managerPassword})).status,403);
    assert.equal((await manager.call('/api/activation','POST',{token:managerToken})).status,403);
    assert.equal((await manager.call('/api/session')).body.setupAvailable,false);
  });
  await t.test('both independent accounts can create, cancel and restore the shared events',async()=>{
    assert.equal((await call('/api/session')).body.user.email,'owner@example.com');
    assert.equal((await manager.call('/api/session')).body.user.email,'manager@example.com');
    const created=await manager.call('/api/events','POST',{...eventInput,title:'Otrā administratora pasākums'},{'Idempotency-Key':randomUUID()});
    assert.equal(created.status,201);
    const change={action:'cancel',scope:'one',date:eventInput.date};
    assert.equal((await call('/api/events/'+created.body.event.id,'PATCH',change)).body.event.status,'cancelled');
    assert.equal((await manager.call('/api/events/'+created.body.event.id,'PATCH',{...change,action:'restore'})).body.event.status,'active');
    assert.equal((await manager.call('/api/events/'+event.id,'PATCH',change)).body.event.status,'cancelled');
    assert.equal((await call('/api/events/'+event.id,'PATCH',{...change,action:'restore'})).body.event.status,'active');
    await stop();await start();
    assert.equal((await call('/api/session')).body.authenticated,true);
    assert.equal((await manager.call('/api/session')).body.authenticated,true);
  });
  await t.test('logging out one account leaves the other signed in and passwords cannot cross accounts',async()=>{
    await manager.call('/api/logout','POST',{action:'logout'});
    await manager.call('/api/session');
    assert.equal((await manager.call('/api/events','POST',eventInput,{'Idempotency-Key':randomUUID()})).status,401);
    assert.equal((await call('/api/session')).body.authenticated,true);
    assert.equal((await manager.call('/api/login','POST',{email:'manager@example.com',password})).status,401);
    assert.equal((await manager.call('/api/login','POST',{email:'owner@example.com',password:managerPassword})).status,401);
    assert.equal((await manager.call('/api/login','POST',{email:'manager@example.com',password:managerPassword})).body.user.email,'manager@example.com');
  });
  await t.test('bulk cancellation requires confirmation, clears the future calendar and remains restorable',async()=>{
    const before=(await call('/api/events')).body.events;
    assert.equal((await call('/api/events/cancel-all','POST',{confirm:false})).status,400);
    assert.deepEqual((await call('/api/events')).body.events,before);
    assert.equal((await call('/api/events/cancel-all','POST',{confirm:true},{'X-CSRF-Token':''})).status,403);
    const result=await manager.call('/api/events/cancel-all','POST',{confirm:true});
    assert.equal(result.status,200);assert.ok(result.body.changed>0);
    const today=rigaClock().date;
    assert.equal(occurrences(result.body.events,today,addDays(today,730)).length,0);
    for(const old of before.filter(e=>e.date && e.date<today)) assert.deepEqual(result.body.events.find(e=>e.id===old.id),old);
    assert.equal((await call('/api/events/cancel-all','POST',{confirm:true})).body.changed,0);
    await stop();await start();
    assert.equal(occurrences((await call('/api/events')).body.events,today,addDays(today,730)).length,0);
    const restored=await call('/api/events/'+event.id,'PATCH',{action:'restore',scope:'one',date:eventInput.date});
    assert.equal(restored.body.event.status,'active');
    const weekly=before.find(e=>e.weekdays && e.start===eventInput.date);
    assert.ok(weekly);
    assert.equal((await call('/api/events/'+weekly.id,'PATCH',{action:'restore',scope:'series',date:eventInput.date})).status,200);
    assert.ok(occurrences((await call('/api/events')).body.events,today,addDays(today,30)).length>0);
  });
  await t.test('archive then permanent deletion is required and does not affect other recurring dates',async()=>{
    const create=async weekly=>(await call('/api/events','POST',{...eventInput,weekly},{'Idempotency-Key':randomUUID()})).body.event;
    const single=await create(false);
    const edit=(id,action,scope='one',date=eventInput.date,extra={})=>call('/api/events/'+id,'PATCH',{action,scope,date,...extra});
    assert.equal((await edit(single.id,'delete','one',eventInput.date,{confirm:true})).status,400);
    assert.equal((await edit(single.id,'archive')).status,400);
    await edit(single.id,'cancel');
    assert.equal((await edit(single.id,'archive')).body.event.archived,true);
    assert.equal((await edit(single.id,'restore')).status,400);
    assert.equal((await edit(single.id,'delete')).status,400);
    assert.equal((await edit(single.id,'unarchive')).body.event.status,'cancelled');
    await edit(single.id,'archive');
    assert.equal((await edit(single.id,'delete','one',eventInput.date,{confirm:true})).body.event,null);
    assert.equal((await edit(single.id,'restore')).status,404);
    const series=await create(true);
    await edit(series.id,'cancel');
    const archived=(await edit(series.id,'archive')).body.event;
    assert.equal(archivedEntries([archived]).length,1);
    assert.equal(occurrences([archived],eventInput.date,eventInput.date,true).length,0);
    assert.equal(occurrences([archived],addDays(eventInput.date,7),addDays(eventInput.date,7)).length,1);
    const deleted=(await edit(series.id,'delete','one',eventInput.date,{confirm:true})).body.event;
    assert.deepEqual(deleted.deletedDates,[eventInput.date]);
    assert.equal((await edit(series.id,'restore')).status,400);
    const future=addDays(eventInput.date,7);
    await edit(series.id,'cancel','series',future);
    await edit(series.id,'archive','series',future);
    assert.equal((await edit(series.id,'restore','series',future)).status,400);
    const trimmed=(await edit(series.id,'delete','series',future,{confirm:true})).body.event;
    assert.equal(trimmed.end,addDays(future,-1));
    assert.equal(occurrences([trimmed],future,addDays(future,365)).length,0);
    const whole=await create(true);
    await edit(whole.id,'cancel','series'); await edit(whole.id,'archive','series');
    await edit(whole.id,'unarchive','series');
    assert.equal((await edit(whole.id,'restore','series')).status,200);
    await edit(whole.id,'cancel','series'); await edit(whole.id,'archive','series');
    assert.equal((await edit(whole.id,'delete','series',eventInput.date,{confirm:true})).body.event,null);
    await stop();await start();
    const remaining=(await call('/api/events')).body.events;
    assert.ok(!remaining.some(e=>[single.id,whole.id].includes(e.id)));
    assert.ok(remaining.some(e=>e.id===event.id));
  });
  await t.test('logout revokes access and a correct login restores it',async()=>{
    await call('/api/logout','POST',{action:'logout'});assert.equal((await call('/api/session')).body.authenticated,false);
    assert.equal((await call('/api/events/'+event.id,'PATCH',{action:'cancel',scope:'one',date:eventInput.date})).status,401);
    assert.equal((await call('/api/login','POST',{email:'owner@example.com',password:'wrong'})).status,401);
    assert.equal((await call('/api/login','POST',{email:'owner@example.com',password})).status,200);
  });
  await t.test('repeated login attempts are rate-limited',async()=>{
    let result;
    for(let i=0;i<9;i++) result=await call('/api/login','POST',{email:'owner@example.com',password:'wrong'});
    assert.equal(result.status,429);
  });
});
