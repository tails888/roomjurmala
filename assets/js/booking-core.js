const hourly=[0,20,38,55,70,85,100,115,130];
const daily=[0,130,250,360,460];
export const limits={hours:[1,8],days:[1,4],weeks:[1,4],months:[3,12]};
export function getQuote(mode='hours',value=3){
  if(!Object.hasOwn(limits,mode)) throw new RangeError('Unknown rental mode');
  const [min,max]=limits[mode];
  const number=Number(value);
  if(!Number.isInteger(number)||number<min||number>max) throw new RangeError('Invalid duration');
  const price=mode==='hours'?hourly[number]:mode==='days'?daily[number]:mode==='weeks'?550*number:460*number;
  const full=number*({hours:20,days:160,weeks:800,months:640}[mode]);
  return {mode,quantity:number,price,saving:full-price,package:({hours:'hours',days:'day',weeks:'week',months:'month'})[mode]};
}
export function formatDuration(quote,lang,units){
  const category=new Intl.PluralRules(lang).select(quote.quantity);
  const forms=units[['hours','days','weeks','months'].indexOf(quote.mode)];
  return quote.quantity+' '+forms[category==='one'?0:category==='few'?1:2];
}
export function rigaNow(now=new Date()){
  const fields=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Riga',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  return {date:fields.year+'-'+fields.month+'-'+fields.day,time:fields.hour+':'+fields.minute};
}
export function validDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T12:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function validateBooking(data,now=rigaNow()){
  const missing=['date','time'].filter(key=>!String(data[key]||'').trim());
  if(missing.length)return {key:'invalidRequired',fields:missing};
  if(!validDate(data.date)||data.date<now.date)return {key:'invalidDate',fields:['date']};
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time))return {key:'invalidTime',fields:['time']};
  if(data.date===now.date&&data.time<=now.time)return {key:'pastTime',fields:['time']};
  return null;
}
export function requestMessage(data,copy,plan=''){
  return [copy.greeting,'',copy.labels.date+': '+data.date,copy.labels.time+': '+data.time,plan].filter((line,i)=>line||i===1).join('\n');
}
export function whatsappUrl(message){return 'https://wa.me/37127850380?text='+encodeURIComponent(message);}
