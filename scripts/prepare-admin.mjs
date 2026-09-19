// Run locally, then upload only bootstrap.json into the private server directory.
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const output = process.argv[2];
if (!output) throw new Error('Pass an output directory outside the repository.');
const dir = path.resolve(output), root = process.cwd();
if (dir === root || dir.startsWith(root + path.sep)) throw new Error('Activation material must stay outside the repository.');
await mkdir(dir, {recursive:true, mode:0o700});
const token = randomBytes(32).toString('hex');
const origin = process.env.ROOM_ORIGIN || 'https://roomjurmala.lv';
await writeFile(path.join(dir, 'bootstrap.json'), JSON.stringify({tokenHash:createHash('sha256').update(token).digest('hex'),expires:Math.floor(Date.now()/1000)+172800}), {flag:'wx',mode:0o600});
await writeFile(path.join(dir, 'activation.txt'), `${origin}/admin/#activate=${token}\n`, {flag:'wx',mode:0o600});
console.log('Created private bootstrap.json and activation.txt. The activation link expires after 48 hours.');
