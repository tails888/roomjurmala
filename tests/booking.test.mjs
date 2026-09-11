import test from 'node:test';
import assert from 'node:assert/strict';
import {getQuote,validateBooking,rigaNow,formatDuration,requestMessage,whatsappUrl,validDate} from '../assets/js/booking-core.mjs';
const data={name:'Test Guest',phone:'+371 20000000',package:'hours',eventType:'Workshop',date:'2026-09-18',start:'14:00',end:'17:00',notes:'Three guests'};
const now={date:'2026-09-11',time:'13:00'};
test('all retained hourly and daily price breaks',()=>{
  assert.deepEqual(Array.from({length:8},(_,i)=>getQuote('hours',i+1).price),[20,38,55,70,85,100,115,130]);
  assert.deepEqual(Array.from({length:4},(_,i)=>getQuote('days',i+1).price),[130,250,360,460]);
  assert.equal(getQuote('weeks',4).price,2200);
});
test('membership honors the three-month minimum and full selected cost',()=>{
  assert.throws(()=>getQuote('months',1),RangeError);
  assert.equal(getQuote('months',3).price,1380);
  assert.equal(getQuote('months',12).price,5520);
  assert.throws(()=>getQuote('hours',NaN),RangeError);
  assert.throws(()=>getQuote('hours',2.5),RangeError);
});
test('booking validates dates, phone numbers, required fields and time order',()=>{
  assert.equal(validateBooking(data,now),null);
  assert.equal(validateBooking({...data,name:''},now).key,'invalidRequired');
  assert.equal(validateBooking({...data,phone:'letters123'},now).key,'invalidPhone');
  assert.equal(validateBooking({...data,date:'2026-09-01'},now).key,'invalidDate');
  assert.equal(validateBooking({...data,date:'2026-02-30'},now).key,'invalidDate');
  assert.equal(validateBooking({...data,start:'18:00'},now).key,'invalidTime');
  assert.equal(validateBooking({...data,end:'25:00'},now).key,'invalidTime');
  assert.equal(validateBooking({...data,date:now.date,start:'12:00'},now).key,'pastTime');
  assert.equal(validateBooking({...data,notes:'a'.repeat(501)},now).key,'tooLong');
});
test('Riga date is independent of the visitor timezone and handles DST',()=>{
  assert.deepEqual(rigaNow(new Date('2026-09-11T22:30:00Z')),{date:'2026-09-12',time:'01:30'});
  assert.deepEqual(rigaNow(new Date('2026-12-11T22:30:00Z')),{date:'2026-12-12',time:'00:30'});
  assert.equal(validDate('2028-02-29'),true);assert.equal(validDate('2027-02-29'),false);
});
test('request preserves special characters without adding URL parameters',()=>{
  const copy={greeting:'Hello',labels:{name:'Name',phone:'Phone',package:'Plan',eventType:'Event',date:'Date',time:'Time',notes:'Notes'}};
  const message=requestMessage({...data,name:'A & B',notes:'<text> # ? &'},copy,'Hourly','3 hours · 55 €');
  const url=new URL(whatsappUrl(message));
  assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/37127850380');
  assert.deepEqual([...url.searchParams.keys()],['text']);
  assert.equal(url.searchParams.get('text'),message);
  assert.match(message,/3 hours · 55 €/);
});
test('Russian quantity labels use correct plural forms',()=>{
  const units=[['час','часа','часов'],['день','дня','дней'],['неделя','недели','недель'],['месяц','месяца','месяцев']];
  assert.equal(formatDuration(getQuote('hours',1),'ru',units),'1 час');
  assert.equal(formatDuration(getQuote('hours',3),'ru',units),'3 часа');
  assert.equal(formatDuration(getQuote('hours',8),'ru',units),'8 часов');
});
