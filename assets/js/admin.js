import { rigaClock, addDays, validDate, validateEvent, occurrences } from './event-model.mjs';

const $ = selector => document.querySelector(selector);
const form = $('#event-form');
const list = $('#event-list');
const dialog = $('#cancel-dialog');
let events = [], cancelled = false, limit = 6, pending = null, busy = false, loaded = false, toastTimer, refreshing = false;
const icons = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  repeat: '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-12 5h6"/>'
};
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function icon(name) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', '0 0 24 24'); node.setAttribute('aria-hidden', 'true');
  node.innerHTML = icons[name];
  return node;
}
function label(event) { return typeof event.title === 'string' ? event.title : event.title.lv; }
function dateLabel(date, options = {day:'numeric', month:'long'}) {
  return new Intl.DateTimeFormat('lv-LV', {...options, timeZone:'UTC'}).format(new Date(date + 'T12:00:00Z'));
}
function notify(message) {
  clearTimeout(toastTimer); $('#toast span').textContent = message; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 8000);
}
function announceChange() {
  try { localStorage.setItem('room-events-updated', String(Date.now())); } catch { /* Polling still works without browser storage. */ }
}
function render() {
  const now = rigaClock();
  const rows = occurrences(events, now.date, addDays(now.date, 730), cancelled, now.time);
  list.replaceChildren();
  list.setAttribute('aria-busy', 'false');
  $('#upcoming-filter').setAttribute('aria-pressed', String(!cancelled));
  $('#cancelled-filter').setAttribute('aria-pressed', String(cancelled));
  if (!rows.length) {
    const empty = el('div', 'empty-state');
    empty.append(icon('calendar'), el('h3', '', cancelled ? 'Nav atceltu pasākumu' : 'Vieta jaunam pasākumam'),
      el('p', '', cancelled ? 'Šeit būs atceltie pasākumi. Ja pārdomāsi, tos varēsi atjaunot.' : 'Pievieno pirmo pasākumu, un tas parādīsies mājaslapas kalendārā.'));
    list.append(empty);
  }
  let month = '';
  for (const {event, date} of rows.slice(0, limit)) {
    if (date.slice(0, 7) !== month) {
      month = date.slice(0, 7);
      list.append(el('h2', 'month-label', dateLabel(date, {month:'long',year:'numeric'})));
    }
    const row = el('article', 'event-row' + (cancelled ? ' is-cancelled' : ''));
    row.dataset.eventId = event.id;
    row.dataset.date = date;
    const tile = el('div', 'date-tile'); tile.setAttribute('aria-label', dateLabel(date, {dateStyle:'full'}));
    tile.append(el('strong', '', String(Number(date.slice(8)))), el('span', '', dateLabel(date, {weekday:'short'}).replace('.', '').slice(0,3).toUpperCase()));
    const body = el('div', 'event-body'); body.append(el('h3', 'event-title', label(event)));
    const meta = el('p', 'event-meta');
    const time = el('span'); time.append(icon('clock'), document.createTextNode(event.time.replaceAll(':', '.').replace('-', '–'))); meta.append(time);
    if (event.weekdays) { const repeat = el('span'); repeat.append(icon('repeat'), document.createTextNode('Katru nedēļu')); meta.append(repeat); }
    body.append(meta);
    const wholeSeries = Boolean(event.cancelledFrom && date >= event.cancelledFrom);
    const action = el('button', 'event-action', cancelled ? (wholeSeries ? 'Atjaunot sēriju' : 'Atjaunot') : 'Atcelt');
    action.type = 'button'; action.disabled = busy;
    action.setAttribute('aria-label', `${action.textContent} · ${label(event)} · ${dateLabel(date)}`);
    action.addEventListener('click', () => cancelled ? restore(event, date, wholeSeries, action) : openCancel(event, date));
    row.append(tile, body, action); list.append(row);
  }
  $('#load-more').hidden = rows.length <= limit;
}
async function api(url = '/api/events', options = {}) {
  const response = await fetch(url, {...options, cache:'no-store', headers:{'Content-Type':'application/json','X-Room-Admin':'1', ...options.headers}, signal:AbortSignal.timeout(12000)});
  let result;
  try { result = await response.json(); } catch { throw new Error('Administrācija nav savienota. Pārbaudi, vai lokālais serveris darbojas.'); }
  if (!response.ok) { const error = new Error(result.error || 'Neizdevās saglabāt. Mēģini vēlreiz.'); error.fields = result.fields; throw error; }
  return result;
}
async function refresh() {
  if (busy || refreshing || dialog.open) return;
  refreshing = true;
  try {
    const data = await api();
    if (!Array.isArray(data.events)) throw new Error('Pasākumu dati nav pieejami.');
    const changed = JSON.stringify(events) !== JSON.stringify(data.events);
    events = data.events;
    $('#list-error').hidden = true;
    if (!loaded || changed) render();
    loaded = true; $('#publish').disabled = false;
  } catch {
    $('#list-error').hidden = false;
    if (!loaded) { list.replaceChildren(); list.setAttribute('aria-busy','false'); }
  } finally { refreshing = false; }
}
function setBusy(value) {
  busy = value;
  for (const control of form.elements) control.disabled = value || (!loaded && control.id === 'publish');
  $('#publish').textContent = value ? 'Saglabā…' : 'Publicēt pasākumu';
  $('#confirm-cancel').disabled = value;
  $('#keep-event').disabled = value;
  $('#add-event').disabled = value;
  document.querySelectorAll('.event-action').forEach(button => { button.disabled = value; });
}
function updateEvent(event) {
  const index = events.findIndex(existing => existing.id === event.id);
  if (index < 0) events.push(event); else events[index] = event;
  announceChange();
  render();
}
function clearErrors() {
  form.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field-error').forEach(node => { node.hidden = true; });
  $('#form-error').hidden = true;
}
function showErrors(errors) {
  clearErrors();
  for (const [name, message] of Object.entries(errors)) {
    const field = form.elements.namedItem(name), hint = $('#error-' + name);
    if (field && hint) { field.setAttribute('aria-invalid','true'); hint.textContent = message; hint.hidden = false; }
  }
  $('#form-error').textContent = 'Pārbaudi atzīmētos laukus.';
  $('#form-error').hidden = false;
  form.querySelector('[aria-invalid=true]')?.focus();
}
function updateRepeat() {
  const date = form.elements.date.value;
  $('#repeat-hint').hidden = !form.elements.weekly.checked;
  $('#repeat-hint').textContent = validDate(date) ? `Reizi nedēļā no ${dateLabel(date)}. Atsevišķus datumus varēsi atcelt.` : 'Pasākums atkārtosies izvēlētajā nedēļas dienā.';
}
form.addEventListener('input', event => {
  const field = event.target;
  field.removeAttribute('aria-invalid');
  const hint = $('#error-' + field.name); if (hint) hint.hidden = true;
  $('#form-error').hidden = true;
  updateRepeat();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !loaded) return;
  const input = { title:form.elements.title.value, date:form.elements.date.value, startTime:form.elements.startTime.value,
    endTime:form.elements.endTime.value, description:form.elements.description.value, weekly:form.elements.weekly.checked };
  const errors = validateEvent(input);
  if (Object.keys(errors).length) { showErrors(errors); return; }
  clearErrors(); setBusy(true);
  try {
    const result = await api('/api/events', {method:'POST', body:JSON.stringify(input)});
    cancelled = false; limit = 6;
    updateEvent(result.event); form.reset(); updateRepeat();
    notify('Pasākums publicēts un redzams mājaslapā.');
  } catch (error) {
    if (error.fields) showErrors(error.fields);
    else { $('#form-error').textContent = error.name === 'TimeoutError' ? 'Savienojums pārtrūka. Pirms mēģini vēlreiz, pārbaudi pasākumu sarakstu.' : error.message; $('#form-error').hidden = false; }
  } finally { setBusy(false); }
});
function openCancel(event, date) {
  pending = {event, date};
  $('#cancel-summary').textContent = `${label(event)} · ${dateLabel(date)} · ${event.time.replaceAll(':','.').replace('-','–')}`;
  $('#cancel-scope').hidden = !event.weekdays;
  $('[name=cancelScope][value=one]').checked = true;
  $('#cancel-error').hidden = true;
  dialog.showModal();
}
$('#confirm-cancel').addEventListener('click', async () => {
  if (!pending || busy) return;
  const {event, date} = pending;
  const scope = event.weekdays ? $('[name=cancelScope]:checked').value : 'one';
  setBusy(true);
  try {
    const result = await api('/api/events/' + event.id, {method:'PATCH', body:JSON.stringify({action:'cancel',date,scope})});
    updateEvent(result.event); dialog.close();
    notify(scope === 'series' ? 'Šis un turpmākie pasākumi atcelti.' : 'Pasākums atcelts. To var atjaunot sadaļā “Atceltie”.');
    $('#cancelled-filter').focus({preventScroll:true});
  } catch (error) { $('#cancel-error').textContent = error.message; $('#cancel-error').hidden = false; }
  finally { setBusy(false); }
});
async function restore(event, date, wholeSeries, button) {
  if (busy) return;
  setBusy(true);
  try {
    const result = await api('/api/events/' + event.id, {method:'PATCH', body:JSON.stringify({action:'restore',date,scope:wholeSeries ? 'series' : 'one'})});
    updateEvent(result.event); notify(wholeSeries ? 'Pasākumu sērija atjaunota.' : 'Pasākums atjaunots un redzams mājaslapā.');
    $('#upcoming-filter').focus({preventScroll:true});
  } catch (error) { notify(error.message); button.focus(); }
  finally { setBusy(false); }
}
$('#keep-event').addEventListener('click', () => { if (!busy) dialog.close(); });
dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
$('#upcoming-filter').addEventListener('click', () => { cancelled = false; limit = 6; render(); });
$('#cancelled-filter').addEventListener('click', () => { cancelled = true; limit = 6; render(); });
$('#load-more').addEventListener('click', () => { limit += 6; render(); });
$('#retry').addEventListener('click', refresh);
$('#close-toast').addEventListener('click', () => { $('#toast').hidden = true; });
$('#add-event').addEventListener('click', () => {
  $('#event-editor').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
  $('#event-title').focus({preventScroll:true});
});
form.elements.date.min = rigaClock().date;
form.elements.date.max = addDays(rigaClock().date, 730);
window.addEventListener('focus', refresh);
window.addEventListener('storage', event => { if (event.key === 'room-events-updated') refresh(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
setInterval(() => { if (!document.hidden) refresh(); }, 15000);
refresh();
