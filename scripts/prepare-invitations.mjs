// Generates private activation links. This script does not send email.
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const [output, ...options] = process.argv.slice(2);
if (!output || !options.length || options.length % 2) throw new Error('Usage: node scripts/prepare-invitations.mjs OUTSIDE_REPO [--owner EMAIL] [--manager EMAIL]');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.resolve(output);
if (directory === root || directory.startsWith(root + path.sep)) throw new Error('Keep activation material outside the repository.');
const invitations = [], links = [], emails = new Set(), slots = new Set();
const origin = process.env.ROOM_ORIGIN || 'https://roomjurmala.lv';
for (let i = 0; i < options.length; i += 2) {
  const slot = {'--owner':1, '--manager':2}[options[i]];
  const email = options[i+1].trim().toLowerCase();
  if (!slot || slots.has(slot) || emails.has(email) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Provide distinct, valid email addresses and each role at most once.');
  slots.add(slot); emails.add(email);
  const token = randomBytes(32).toString('hex');
  invitations.push({slot,email,tokenHash:createHash('sha256').update(token).digest('hex'),expires:Math.floor(Date.now()/1000)+172800});
  links.push({email,slot,url:`${origin}/admin/#activate=${token}`});
}
await mkdir(directory, {recursive:true, mode:0o700});
await writeFile(path.join(directory, 'invitations.json'), JSON.stringify({invitations}), {flag:'wx',mode:0o600});
await writeFile(path.join(directory, 'activation-links.json'), JSON.stringify(links,null,2)+'\n', {flag:'wx',mode:0o600});
console.log(`Prepared ${links.length} private activation link(s), valid for 48 hours. Upload only invitations.json outside public_html.`);
