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
