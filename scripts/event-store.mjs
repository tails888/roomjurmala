import { decodeEventImage } from './event-image.mjs';
import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateEvent, validDate, occursOn, rigaClock, isArchived, changeArchive } from '../assets/js/event-model.mjs';

export class EventError extends Error {
  constructor(message, status = 400, fields) { super(message); this.status = status; this.fields = fields; }
}

// One serialized writer and atomic rename keep simultaneous requests from losing data.
// The local store lives outside the served web root and is never checked into Git.
export async function openEventStore(file, seedFile) {
  let state;
  try { state = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = JSON.parse(await readFile(seedFile, 'utf8'));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(state, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
  if (state.version !== 1 || !Array.isArray(state.events)) throw new Error('Unsupported event store');
  let queue = Promise.resolve();
  function update(change) {
    const task = queue.then(async () => {
      const next = structuredClone(state);
      const result = await change(next);
      const temp = file + '.tmp';
      await writeFile(temp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
      await rename(temp, file);
      state = next;
      return result;
    });
    queue = task.catch(() => {});
    return task;
  }
  return {
    list: () => structuredClone(state.events),
    async image(id) {
      if (!state.events.some(e => e.id === id && e.image)) throw new EventError('Attēls nav atrasts.',404);
      return readFile(path.join(file + '.images', id + '.jpg'));
    },
    create(input, now = rigaClock()) {
      return update(async next => {
        const fields = validateEvent(input, now);
        if (Object.keys(fields).length) throw new EventError('Pārbaudi atzīmētos laukus.', 400, fields);
        const event = {
          id: randomUUID(), title: { lv: input.title.trim() }, description: { lv: (input.description || '').trim() },
          time: `${input.startTime}-${input.endTime}`, status: 'active', exclusions: [], createdAt: new Date().toISOString()
        };
        if (input.weekly) Object.assign(event, { type: 'weekly', start: input.date, weekdays: [new Date(input.date + 'T12:00:00Z').getUTCDay()] });
        else event.date = input.date;
        const bytes = decodeEventImage(input.imageData);
        if (bytes) {
          await mkdir(file + '.images', {recursive:true, mode:0o700});
          await writeFile(path.join(file + '.images', event.id + '.jpg'), bytes, {mode:0o600});
          event.image = '/api/events/' + event.id + '/image';
        }
        next.events.push(event);
        return event;
      });
    },
    cancelAll(input, now = rigaClock()) {
      if (input?.confirm !== true) throw new EventError('Apstiprini, ka vēlies atcelt visus pasākumus.');
      return update(next => {
        let changed = 0;
        for (const event of next.events) {
          if (event.status === 'cancelled') continue;
          if (event.date) {
            if (event.date < now.date) continue;
            event.status = 'cancelled';
          } else if (event.weekdays) {
            if ((event.end && event.end < now.date) || (event.cancelledFrom && event.cancelledFrom <= now.date)) continue;
            event.cancelledFrom = now.date;
          } else continue;
          event.updatedAt = new Date().toISOString(); changed++;
        }
        return {events:structuredClone(next.events), changed};
      });
    },
    async archive(id,input) {
      const result = await update(next=>{
        const index=next.events.findIndex(e=>e.id===id);
        if (index<0) throw new EventError('Pasākums nav atrasts.',404);
        let event;
        try { event=changeArchive(next.events[index],input); } catch (error) { throw new EventError(error.message); }
        if (!event) next.events.splice(index,1);
        return {event,id};
      });
      if (!result.event) await unlink(path.join(file + '.images', id + '.jpg')).catch(error => { if (error.code !== 'ENOENT') throw error; });
      return result;
    },
    change(id, input, now = rigaClock()) {
      return update(next => {
        const event = next.events.find(e => e.id === id);
        if (!event) throw new EventError('Šis pasākums vairs nav pieejams.', 404);
        if (!input || !['cancel', 'restore'].includes(input.action) || !['one', 'series'].includes(input.scope)
          || !validDate(input.date) || !occursOn(event, input.date)) throw new EventError('Nederīga pasākuma izvēle.');
        if (isArchived(event,input.date) || event.deletedDates?.includes(input.date) || (input.action==='restore' && input.scope==='series' && event.archivedFrom)) throw new EventError('Vispirms atgriez pasākumu no arhīva.');
        if (input.date < now.date) throw new EventError('Pagājušu pasākumu nevar mainīt.');
        if (input.scope === 'series' && !event.weekdays) throw new EventError('Šis pasākums neatkārtojas.');
        if (input.action === 'cancel') {
          if (input.scope === 'series') event.cancelledFrom = event.cancelledFrom && event.cancelledFrom < input.date ? event.cancelledFrom : input.date;
          else if (event.weekdays) event.exclusions = [...new Set([...(event.exclusions || []), input.date])];
          else event.status = 'cancelled';
        } else {
          if (input.scope === 'series') delete event.cancelledFrom;
          else if (event.cancelledFrom && input.date >= event.cancelledFrom) throw new EventError('Atjauno visu atcelto sēriju.');
          else if (event.weekdays) event.exclusions = (event.exclusions || []).filter(d => d !== input.date);
          else event.status = 'active';
        }
        event.updatedAt = new Date().toISOString();
        return event;
      });
    }
  };
}
