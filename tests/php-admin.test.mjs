import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import path from 'node:path';
import { rigaClock, addDays } from '../assets/js/event-model.mjs';

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
  let cookie = '', csrf = '';
  async function call(route, method='GET', body, overrides={}) {
    const response=await fetch(origin+route,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json','X-Room-Admin':'1','X-CSRF-Token':csrf,...overrides},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(response.headers.get('set-cookie')) cookie=response.headers.get('set-cookie').split(';')[0];
    const result=await response.json(); if(result.csrf) csrf=result.csrf;
    return {status:response.status,body:result,headers:response.headers};
  }
  const eventInput={title:'Pārbaudes darbnīca <img src=x>',date:addDays(rigaClock().date,2),startTime:'17:00',endTime:'18:30',description:'Latviešu burti āčēģīķļņšūž',weekly:false};
  await t.test('guest cannot write, activate without token, forge origin or omit CSRF',async()=>{
    const session=await call('/api/session'); assert.equal(session.body.authenticated,false);assert.ok(session.headers.get('set-cookie').includes('HttpOnly'));
    assert.equal((await call('/api/events','POST',eventInput)).status,401);
    assert.equal((await call('/api/setup','POST',{token:'invalid',email:'test@example.com',password:'not-a-real-password'})).status,403);
    assert.equal((await call('/api/events','POST',eventInput,{Origin:'https://example.com'})).status,403);
    assert.equal((await call('/api/events','POST',eventInput,{'X-CSRF-Token':''})).status,403);
  });
  const password=randomBytes(18).toString('hex');
  await t.test('owner setup is single-use and rotates the session',async()=>{
    const oldCookie=cookie;
    const result=await call('/api/setup','POST',{token,email:'owner@example.com',password}); assert.equal(result.status,201);assert.notEqual(cookie,oldCookie);
    assert.equal((await call('/api/setup','POST',{token,email:'other@example.com',password})).status,403);
    assert.equal((await call('/api/session')).body.authenticated,true);
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
