import test from 'node:test';
import assert from 'node:assert/strict';
import {getQuote,validateBooking,rigaNow,formatDuration,requestMessage,whatsappUrl,validDate} from '../assets/js/booking-core.js';
const data={date:'2026-09-18',time:'14:00'};
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
test('two-field booking validates the date and approximate time',()=>{
  assert.equal(validateBooking(data,now),null);
  assert.deepEqual(validateBooking({...data,time:''},now),{key:'invalidRequired',fields:['time']});
  assert.equal(validateBooking({...data,date:'2026-09-01'},now).key,'invalidDate');
  assert.equal(validateBooking({...data,date:'2026-02-30'},now).key,'invalidDate');
  assert.equal(validateBooking({...data,time:'25:00'},now).key,'invalidTime');
  assert.equal(validateBooking({...data,date:now.date,time:'12:00'},now).key,'pastTime');
  assert.equal(validateBooking({...data,date:now.date,time:'13:00'},now).key,'pastTime');
  assert.equal(validateBooking({...data,date:now.date,time:'13:01'},now),null);
});
test('Riga date is independent of the visitor timezone and handles DST',()=>{
  assert.deepEqual(rigaNow(new Date('2026-09-11T22:30:00Z')),{date:'2026-09-12',time:'01:30'});
  assert.deepEqual(rigaNow(new Date('2026-12-11T22:30:00Z')),{date:'2026-12-12',time:'00:30'});
  assert.equal(validDate('2028-02-29'),true);assert.equal(validDate('2027-02-29'),false);
});
test('WhatsApp request needs no personal fields and retains a selected price',()=>{
  const copy={greeting:'Hello & welcome',labels:{date:'Date',time:'Time'}};
  const message=requestMessage(data,copy,'3 hours · 55 €');
  const url=new URL(whatsappUrl(message));
  assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/37127850380');
  assert.deepEqual([...url.searchParams.keys()],['text']);
  assert.equal(url.searchParams.get('text'),message);
  assert.equal(message,'Hello & welcome\n\nDate: 2026-09-18\nTime: 14:00\n3 hours · 55 €');
  assert(!requestMessage(data,copy).includes('undefined'));
});
test('Russian quantity labels use correct plural forms',()=>{
  const units=[['час','часа','часов'],['день','дня','дней'],['неделя','недели','недель'],['месяц','месяца','месяцев']];
  assert.equal(formatDuration(getQuote('hours',1),'ru',units),'1 час');
  assert.equal(formatDuration(getQuote('hours',3),'ru',units),'3 часа');
  assert.equal(formatDuration(getQuote('hours',8),'ru',units),'8 часов');
});
