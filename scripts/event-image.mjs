export function decodeEventImage(value) {
  if (value == null || value === '') return null;
  const invalid = () => { const error = new Error('Attēls nav derīgs. Izvēlies citu failu.'); error.status = 400; throw error; };
  if (typeof value !== 'string' || value.length > 2800000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return invalid();
  const bytes = Buffer.from(value.slice(23), 'base64');
  if (bytes.length < 4 || bytes.readUInt16BE(0) !== 0xffd8) return invalid();
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset++] !== 0xff) return invalid();
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if ([0xd9, 0xda].includes(marker) || offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return invalid();
    if ([0xc0,0xc1,0xc2].includes(marker)) {
      if (length < 8) return invalid();
      const height = bytes.readUInt16BE(offset + 3), width = bytes.readUInt16BE(offset + 5);
      if (!width || !height || width > 1600 || height > 1600) return invalid();
      return bytes;
    }
    offset += length;
  }
  return invalid();
}
