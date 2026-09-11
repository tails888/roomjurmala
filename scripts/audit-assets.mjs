import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root = process.cwd();
const routes = ['', 'telpa', 'cenas', 'en', 'en/telpa', 'en/cenas', 'ru', 'ru/telpa', 'ru/cenas'];
const pending = routes.map(route => path.resolve(root, route, 'index.html'));
const visited = new Set();
const assetsRoot = path.join(root, 'assets') + path.sep;

function enqueue(reference, from) {
  const url = new URL(reference, 'https://roomjurmala.lv/' + path.relative(root, from));
  if (url.origin !== 'https://roomjurmala.lv') return;
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  assert(file.startsWith(root + path.sep), `Reference escapes the site root in ${from}`);
  assert(fs.existsSync(file), `Missing asset ${reference} in ${path.relative(root, from)}`);
  pending.push(file);
}

while (pending.length) {
  const file = pending.pop();
  if (visited.has(file)) continue;
  visited.add(file);
  if (!/\.(html|css|m?js)$/.test(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  // Includes HTML attributes and the embedded media-viewer JSON catalogue.
  for (const match of source.matchAll(/\/assets\/[A-Za-z0-9_./-]+/g)) enqueue(match[0], file);
  if (file.endsWith('.css')) {
    for (const match of source.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) enqueue(match[1], file);
  }
  if (/\.m?js$/.test(file)) {
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.[^'"]+)['"]/g)) enqueue(match[1], file);
  }
}

function filesIn(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    if (entry.name.startsWith('.')) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}

const files = filesIn(assetsRoot);
const unused = files.filter(file => !visited.has(file)).map(file => path.relative(root, file));
const hashes = new Map();
for (const file of files) {
  const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  hashes.set(hash, [...(hashes.get(hash) || []), path.relative(root, file)]);
}
const duplicates = [...hashes.values()].filter(group => group.length > 1);
assert.equal(unused.length, 0, `Unused assets need review\n${unused.join('\n')}`);
assert.equal(duplicates.length, 0, `Exact duplicate assets need review\n${duplicates.map(group => group.join(' = ')).join('\n')}`);
console.log(`Verified ${files.length} assets: all referenced, no exact duplicates, no missing local dependencies.`);
