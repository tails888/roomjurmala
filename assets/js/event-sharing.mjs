// The venue identifier is the same as the existing website's Google Maps link.
export const googleProfileUrl = 'https://maps.google.com/maps?ftid=0x46eee77eef601e47:0x5ac3c96f8826ce3d';
export function sharingText(event, date = event.date || event.start) {
  const local = value => typeof value === 'string' ? value : value?.lv || '';
  const formatted = new Intl.DateTimeFormat('lv-LV', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'}).format(new Date(date + 'T12:00:00Z'));
  return [local(event.title), `${formatted} · ${event.time.replace('-', '–')}`,
    'ROOM Jūrmala · Skolas iela 50, Jūrmala', event.weekdays ? 'Atkārtojas katru nedēļu.' : '',
    local(event.description), 'https://roomjurmala.lv/#calendar'].filter(Boolean).join('\n\n');
}
export async function prepareEventImage(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Izvēlies JPG, PNG vai WebP attēlu.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Attēls ir pārāk liels. Izvēlies failu līdz 10 MB.');
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Neizdevās atvērt attēlu. Izvēlies citu failu.')); image.src = url; });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Attēls nav derīgs.');
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d'); context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/jpeg', .85);
    if (result.length > 2800000) throw new Error('Attēls ir pārāk liels. Izvēlies mazāku attēlu.');
    return result;
  } finally { URL.revokeObjectURL(url); }
}
