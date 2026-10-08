// Calendar dates and times always refer to Europe/Riga, independent of the device.
export function rigaClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function addDays(date, days) {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function occursOn(event, date) {
  if (event.date) return event.date === date;
  return Boolean(event.weekdays?.includes(new Date(date + 'T12:00:00Z').getUTCDay())
    && (!event.start || date >= event.start) && (!event.end || date <= event.end));
}

export function isCancelled(event, date) {
  return event.status === 'cancelled' || Boolean(event.cancelledFrom && date >= event.cancelledFrom)
    || Boolean(event.exclusions?.includes(date));
}

export function occurrences(events, from, to, cancelled = false, time = '') {
  const rows = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    for (const event of events) {
      if (!isArchived(event,date) && !event.deletedDates?.includes(date) && occursOn(event, date) && isCancelled(event, date) === cancelled
        && (date > from || event.time.split('-')[1] > time)) rows.push({ event, date });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.event.time.localeCompare(b.event.time));
}

export function validateEvent(input, now = rigaClock()) {
  const errors = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { form: 'Pārbaudi ievadīto informāciju.' };
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 160) errors.title = 'Ievadi pasākuma nosaukumu līdz 160 rakstzīmēm.';
  if (!validDate(input.date) || input.date < now.date || input.date > addDays(now.date, 730)) errors.date = 'Izvēlies datumu no šodienas līdz diviem gadiem uz priekšu.';
  const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!validTime(input.startTime)) errors.startTime = 'Norādi sākuma laiku.';
  if (!validTime(input.endTime)) errors.endTime = 'Norādi beigu laiku.';
  if (validTime(input.startTime) && validTime(input.endTime) && input.endTime <= input.startTime) errors.endTime = 'Beigu laikam jābūt vēlāk par sākumu.';
  if (input.date === now.date && validTime(input.startTime) && input.startTime <= now.time) errors.startTime = 'Izvēlies laiku, kas vēl nav pagājis.';
  if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 2000)) errors.description = 'Apraksts var būt līdz 2000 rakstzīmēm.';
  if (typeof input.weekly !== 'boolean') errors.weekly = 'Pārbaudi atkārtošanas izvēli.';
  return errors;
}

export function isArchived(event,date) {
  return event.archived === true || Boolean(event.archivedFrom && date >= event.archivedFrom) || Boolean(event.archivedDates?.includes(date));
}
export function archivedEntries(events) {
  return events.flatMap(event => event.date ? (event.archived ? [{event,date:event.date,series:false}] : []) : [
    ...(event.archivedDates || []).map(date=>({event,date,series:false})),
    ...(event.archivedFrom ? [{event,date:event.archivedFrom,series:true}] : [])
  ]).sort((a,b)=>b.date.localeCompare(a.date));
}
export function changeArchive(event,input) {
  const {action,date,scope}=input || {};
  if (!['archive','unarchive','delete'].includes(action) || !validDate(date) || !['one','series'].includes(scope)) throw new Error('Nederīga arhīva darbība.');
  const series=scope==='series';
  if (series ? !event.weekdays : !occursOn(event,date)) throw new Error('Pasākums nav atrasts.');
  if (action==='archive') {
    if (series ? !event.cancelledFrom : !isCancelled(event,date) || event.deletedDates?.includes(date)) throw new Error('Arhivēt var tikai atceltu pasākumu.');
    if (series) event.archivedFrom=event.cancelledFrom;
    else if (event.date) event.archived=true;
    else {
      if (event.cancelledFrom && date>=event.cancelledFrom) throw new Error('Arhivē visu atcelto sēriju.');
      event.archivedDates=[...new Set([...(event.archivedDates || []),date])];
    }
  } else {
    if (series ? event.archivedFrom!==date : event.date ? !event.archived : !event.archivedDates?.includes(date)) throw new Error('Pasākums nav arhīvā.');
    if (action==='delete' && input.confirm!==true) throw new Error('Apstiprini neatgriezenisku dzēšanu.');
    if (action==='delete' && event.date) return null;
    if (series) {
      if (action==='delete') {
        const end=addDays(event.archivedFrom,-1);
        if (event.start && event.start>end) return null;
        event.end=event.end && event.end<end ? event.end : end;
        delete event.cancelledFrom;
        for (const field of ['exclusions','archivedDates','deletedDates']) event[field]=(event[field] || []).filter(d=>d<=event.end);
      }
      delete event.archivedFrom;
    } else if (event.date) delete event.archived;
    else {
      event.archivedDates=(event.archivedDates || []).filter(d=>d!==date);
      if (action==='delete') event.deletedDates=[...new Set([...(event.deletedDates || []),date])];
    }
  }
  event.updatedAt=new Date().toISOString();
  return event;
}
