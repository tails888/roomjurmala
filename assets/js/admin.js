import { rigaClock, addDays, validDate, validateEvent, occurrences, archivedEntries } from './event-model.mjs';
import { prepareEventImage, sharingText, googleProfileUrl } from './event-sharing.mjs';
import { initializeAuth, request } from './admin-auth.mjs';

const $ = selector => document.querySelector(selector);
const form = $('#event-form');
const list = $('#event-list');
const dialog = $('#cancel-dialog');
const bulkDialog = $('#cancel-all-dialog');
const deleteDialog = $('#delete-dialog');
let archived = false, pendingDelete = null;
let events = [], cancelled = false, limit = 6, pending = null, busy = false, loaded = false, toastTimer, refreshing = false;
let imageData = '', imagePreparing = false, imageRevision = 0;
const publishedDialog = $('#published-dialog');
let createRequestId = crypto.randomUUID();
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
  const rows = archived ? archivedEntries(events) : occurrences(events, now.date, addDays(now.date, 730), cancelled, now.time);
  list.replaceChildren();
  list.setAttribute('aria-busy', 'false');
  $('#upcoming-filter').setAttribute('aria-pressed', String(!cancelled && !archived));
  $('#cancelled-filter').setAttribute('aria-pressed', String(cancelled && !archived));
  $('#archive-filter').setAttribute('aria-pressed',String(archived));
  if (!rows.length) {
    const empty = el('div', 'empty-state');
    empty.append(icon('calendar'), el('h3', '', archived ? 'Arhīvs ir tukšs' : cancelled ? 'Nav atceltu pasākumu' : 'Vieta jaunam pasākumam'),
      el('p', '', archived ? 'Arhivētie pasākumi būs šeit. Tos varēs atgriezt pie atceltajiem vai dzēst neatgriezeniski.' : cancelled ? 'Šeit būs atceltie pasākumi. Ja pārdomāsi, tos varēsi atjaunot.' : 'Pievieno pirmo pasākumu, un tas parādīsies mājaslapas kalendārā.'));
    list.append(empty);
  }
  let month = '';
  for (const {event, date, series} of rows.slice(0, limit)) {
    if (date.slice(0, 7) !== month) {
      month = date.slice(0, 7);
      list.append(el('h2', 'month-label', dateLabel(date, {month:'long',year:'numeric'})));
    }
    const row = el('article', 'event-row' + (cancelled || archived ? ' is-cancelled' : ''));
    row.dataset.eventId = event.id;
    row.dataset.date = date;
    const tile = el('div', 'date-tile'); tile.setAttribute('aria-label', dateLabel(date, {dateStyle:'full'}));
    tile.append(el('strong', '', String(Number(date.slice(8)))), el('span', '', dateLabel(date, {weekday:'short'}).replace('.', '').slice(0,3).toUpperCase()));
    const body = el('div', 'event-body'); body.append(el('h3', 'event-title', label(event)));
    const meta = el('p', 'event-meta');
    const time = el('span'); time.append(icon('clock'), document.createTextNode(event.time.replaceAll(':', '.').replace('-', '–'))); meta.append(time);
    if (event.weekdays) { const repeat = el('span'); repeat.append(icon('repeat'), document.createTextNode(archived && series ? 'Sērija no šī datuma' : 'Katru nedēļu')); meta.append(repeat); }
    body.append(meta);
    if (event.image) { const photo = el('img', 'event-thumbnail'); photo.src = event.image; photo.alt = label(event); photo.loading = 'lazy'; body.append(photo); }
    const wholeSeries = archived ? Boolean(series) : Boolean(event.cancelledFrom && date >= event.cancelledFrom);
    const action = el('button', 'event-action', archived ? 'Uz atceltajiem' : cancelled ? (wholeSeries ? 'Atjaunot sēriju' : 'Atjaunot') : 'Atcelt');
    action.type = 'button'; action.disabled = busy;
    action.setAttribute('aria-label', `${action.textContent} · ${label(event)} · ${dateLabel(date)}`);
    action.addEventListener('click', () => archived ? archiveAction(event,date,wholeSeries,'unarchive') : cancelled ? restore(event, date, wholeSeries, action) : openCancel(event, date));
    const actions = el('div','event-actions'); actions.append(action);
    if (!cancelled && !archived) {
      const share = el('button', 'event-action', 'Google'); share.type = 'button'; share.disabled = busy;
      share.setAttribute('aria-label', `Sagatavot Google ierakstu · ${label(event)}`);
      share.addEventListener('click', () => showSharing(event, date)); actions.append(share);
    }
    if (cancelled || archived) {
      const extra = el('button','event-action', archived ? 'Dzēst' : wholeSeries ? 'Arhivēt sēriju' : 'Arhivēt');
      extra.type='button'; extra.disabled=busy;
      extra.setAttribute('aria-label',`${extra.textContent} · ${label(event)} · ${dateLabel(date)}`);
      extra.addEventListener('click',()=>archived ? openDelete(event,date,wholeSeries) : archiveAction(event,date,wholeSeries,'archive'));
      actions.append(extra);
    }
    row.append(tile, body, actions); list.append(row);
  }
  $('#load-more').hidden = rows.length <= limit;
}
async function api(url = '/api/events', options = {}) {
  return request(url, options);
}
async function refresh() {
  if (busy || refreshing || dialog.open || bulkDialog.open || deleteDialog.open || $('#main').hidden) return;
  refreshing = true;
  try {
    const data = await api();
    if (!Array.isArray(data.events)) throw new Error('Pasākumu dati nav pieejami.');
    const changed = JSON.stringify(events) !== JSON.stringify(data.events);
    events = data.events;
    $('#list-error').hidden = true;
    if (!loaded || changed) render();
    loaded = true; $('#publish').disabled = busy || imagePreparing; $('#cancel-all').disabled = false;
  } catch {
    $('#list-error').hidden = false;
    if (!loaded) { list.replaceChildren(); list.setAttribute('aria-busy','false'); }
  } finally { refreshing = false; }
}
function setBusy(value) {
  busy = value;
  for (const control of form.elements) control.disabled = value || ((!loaded || imagePreparing) && control.id === 'publish');
  $('#publish').textContent = value ? 'Saglabā…' : 'Publicēt pasākumu';
  $('#confirm-cancel').disabled = value;
  $('#keep-event').disabled = value;
  $('#add-event').disabled = value;
  $('#cancel-all').disabled = value || !loaded;
  $('#keep-archive').disabled = value; $('#delete-check').disabled = value;
  $('#confirm-delete').disabled = value || !$('#delete-check').checked;
  $('#keep-all').disabled = value; $('#cancel-all-check').disabled = value;
  $('#confirm-cancel-all').disabled = value || !$('#cancel-all-check').checked;
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
  createRequestId = crypto.randomUUID();
  const field = event.target;
  field.removeAttribute('aria-invalid');
  const hint = $('#error-' + field.name); if (hint) hint.hidden = true;
  $('#form-error').hidden = true;
  updateRepeat();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !loaded || imagePreparing) return;
  const input = { title:form.elements.title.value, date:form.elements.date.value, startTime:form.elements.startTime.value,
    endTime:form.elements.endTime.value, description:form.elements.description.value, weekly:form.elements.weekly.checked, imageData };
  const errors = validateEvent(input);
  if (Object.keys(errors).length) { showErrors(errors); return; }
  clearErrors(); setBusy(true);
  try {
    const result = await api('/api/events', {method:'POST', headers:{'Idempotency-Key':createRequestId}, body:JSON.stringify(input)});
    createRequestId = crypto.randomUUID();
    cancelled = false; archived = false; limit = 6;
    updateEvent(result.event); form.reset(); resetImage(); updateRepeat();
    showSharing(result.event, input.date);
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
$('#upcoming-filter').addEventListener('click', () => { cancelled = false; archived = false; limit = 6; render(); });
$('#cancelled-filter').addEventListener('click', () => { cancelled = true; archived = false; limit = 6; render(); });
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
initializeAuth(refresh);

$('#cancel-all').addEventListener('click', () => {
  if (busy || !loaded) return;
  $('#cancel-all-check').checked = false; $('#confirm-cancel-all').disabled = true;
  $('#cancel-all-error').hidden = true; bulkDialog.showModal();
});
$('#cancel-all-check').addEventListener('change', () => { $('#confirm-cancel-all').disabled = busy || !$('#cancel-all-check').checked; });
$('#keep-all').addEventListener('click', () => { if (!busy) bulkDialog.close(); });
bulkDialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
$('#confirm-cancel-all').addEventListener('click', async () => {
  if (busy || !$('#cancel-all-check').checked) return;
  setBusy(true);
  try {
    const result = await api('/api/events/cancel-all', {method:'POST', body:JSON.stringify({confirm:true})});
    events = result.events; cancelled = false; archived = false; limit = 6;
    announceChange(); render(); bulkDialog.close();
    notify(result.changed ? 'Visi šodienas un turpmākie pasākumi atcelti. Tos var atjaunot sadaļā “Atceltie”.' : 'Visi šodienas un turpmākie pasākumi jau ir atcelti.');
    $('#cancelled-filter').focus({preventScroll:true});
  } catch (error) { $('#cancel-all-error').textContent = error.message; $('#cancel-all-error').hidden = false; }
  finally { setBusy(false); }
});

$('#archive-filter').addEventListener('click',()=>{ archived=true; cancelled=false; limit=6; render(); });
async function archiveAction(event,date,series,action) {
  if (busy) return;
  setBusy(true);
  try {
    const result=await api('/api/events/'+event.id,{method:'PATCH',body:JSON.stringify({action,date,scope:series?'series':'one'})});
    updateEvent(result.event);
    notify(action==='archive' ? 'Pasākums pārvietots uz arhīvu.' : 'Pasākums atgriezts sadaļā “Atceltie”.');
  } catch(error) { notify(error.message); }
  finally { setBusy(false); }
}
function openDelete(event,date,series) {
  pendingDelete={event,date,series};
  $('#delete-summary').textContent=`${label(event)} · ${series ? 'Visa arhivētā sērija no ' : ''}${dateLabel(date,{day:'numeric',month:'long',year:'numeric'})}`;
  $('#delete-check').checked=false; $('#confirm-delete').disabled=true; $('#delete-error').hidden=true;
  deleteDialog.showModal();
}
$('#delete-check').addEventListener('change',()=>{ $('#confirm-delete').disabled=busy || !$('#delete-check').checked; });
$('#keep-archive').addEventListener('click',()=>{ if (!busy) deleteDialog.close(); });
deleteDialog.addEventListener('cancel',event=>{ if (busy) event.preventDefault(); });
$('#confirm-delete').addEventListener('click',async()=>{
  if (busy || !pendingDelete || !$('#delete-check').checked) return;
  setBusy(true);
  const {event,date,series}=pendingDelete;
  try {
    const result=await api('/api/events/'+event.id,{method:'PATCH',body:JSON.stringify({action:'delete',date,scope:series?'series':'one',confirm:true})});
    if (result.event) updateEvent(result.event);
    else { events=events.filter(e=>e.id!==event.id); announceChange(); render(); }
    deleteDialog.close(); notify('Pasākums neatgriezeniski izdzēsts.'); $('#archive-filter').focus({preventScroll:true});
  } catch(error) { $('#delete-error').textContent=error.message; $('#delete-error').hidden=false; }
  finally { setBusy(false); }
});

function resetImage() {
  imageRevision++; imageData = ''; imagePreparing = false;
  $('#event-image').value = ''; $('#image-preview').removeAttribute('src');
  $('#image-preview-wrap').hidden = true; $('#error-image').hidden = true;
  $('#image-help').textContent = 'Izvēlies JPG, PNG vai WebP attēlu līdz 10 MB.';
}
$('#event-image').addEventListener('change', async () => {
  const file = $('#event-image').files[0];
  const revision = ++imageRevision;
  imageData = ''; $('#image-preview-wrap').hidden = true; $('#error-image').hidden = true;
  if (!file) { resetImage(); setBusy(busy); return; }
  imagePreparing = true; $('#publish').disabled = true;
  $('#image-help').textContent = 'Sagatavo attēlu…';
  try {
    const prepared = await prepareEventImage(file);
    if (revision !== imageRevision) return;
    imageData = prepared;
    $('#image-preview').src = imageData; $('#image-preview-wrap').hidden = false;
    $('#image-help').textContent = 'Attēls gatavs. Lai nomainītu, izvēlies citu failu.';
  } catch (error) {
    if (revision !== imageRevision) return;
    $('#error-image').textContent = error.message; $('#error-image').hidden = false;
    $('#event-image').value = ''; $('#image-help').textContent = 'Izvēlies citu JPG, PNG vai WebP attēlu.';
  } finally { if (revision === imageRevision) { imagePreparing = false; setBusy(busy); } }
});
$('#remove-image').addEventListener('click', () => { resetImage(); createRequestId = crypto.randomUUID(); setBusy(busy); });
function showSharing(event, date) {
  $('#google-text').value = sharingText(event, date);
  $('#open-google').href = googleProfileUrl;
  $('#share-status').hidden = true;
  $('#download-image').hidden = !event.image;
  if (event.image) { $('#download-image').href = event.image; $('#download-image').download = 'room-jurmala-pasakums.jpg'; }
  else { $('#download-image').removeAttribute('href'); }
  publishedDialog.showModal();
  $('#google-text').scrollTop = 0;
  $('#published-title').focus();
}
$('#close-published').addEventListener('click', () => publishedDialog.close());
$('#copy-google').addEventListener('click', async () => {
  // Start copying while this page is focused, and open within the same click gesture.
  let copyAttempt;
  try { copyAttempt = navigator.clipboard.writeText($('#google-text').value).then(() => true, () => false); }
  catch { copyAttempt = Promise.resolve(false); }
  const popup = window.open(googleProfileUrl, '_blank');
  if (popup) popup.opener = null;
  let copied = await copyAttempt;
  if (!copied) {
    $('#google-text').focus(); $('#google-text').select();
    try { copied = document.execCommand('copy'); } catch { /* Selected text remains available for manual copying. */ }
  }
  $('#share-status').textContent = copied
    ? (popup ? 'Teksts nokopēts. Ielīmē to Google ierakstā un pievieno bildi.' : 'Teksts nokopēts. Spied “Atvērt Google profilu”, lai turpinātu.')
    : 'Neizdevās nokopēt automātiski. Iezīmē un nokopē tekstu augstāk, tad atver Google profilu.';
  $('#share-status').hidden = false;
});
