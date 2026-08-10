#!/usr/bin/env node
// Scans source/ for images, assigns each a stable number, and generates
// compressed webp + thumbnail into img/. Numbers already in manifest.json are
// never reshuffled, so dropping new files in source/ just appends.
//
// Usage: node build.js

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'source');
const OUT = path.join(ROOT, 'img');
const MANIFEST = path.join(ROOT, 'manifest.json');

const EXT = /\.(png|jpe?g|webp|gif|tiff?|avif|heic)$/i;
const FULL_SIZE = 1600;
const FULL_QUALITY = 82;
const THUMB_SIZE = 480;
const THUMB_QUALITY = 76;

fs.mkdirSync(OUT, { recursive: true });

const manifest = fs.existsSync(MANIFEST)
  ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  : [];
const known = new Map(manifest.map((e) => [e.source, e]));

const found = fs
  .readdirSync(SRC)
  .filter((f) => EXT.test(f))
  .map((f) => ({ name: f, mtime: fs.statSync(path.join(SRC, f)).mtimeMs }))
  .sort((a, b) => a.mtime - b.mtime || a.name.localeCompare(b.name));

let next = manifest.reduce((max, e) => Math.max(max, e.n), 0) + 1;
const entries = [];

for (const { name } of found) {
  const entry = known.get(name) || { n: next++, source: name };
  const pad = String(entry.n).padStart(3, '0');
  entry.full = `img/${pad}.webp`;
  entry.thumb = `img/${pad}.t.webp`;

  const input = path.join(SRC, name);
  for (const [target, size, quality] of [
    [entry.full, FULL_SIZE, FULL_QUALITY],
    [entry.thumb, THUMB_SIZE, THUMB_QUALITY],
  ]) {
    const dest = path.join(ROOT, target);
    if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(input).mtimeMs) continue;
    execFileSync('magick', [
      input,
      '-auto-orient',
      '-resize', `${size}x${size}>`,
      '-strip',
      '-quality', String(quality),
      dest,
    ]);
    console.log(`${target}  <-  ${name}`);
  }

  const [w, h] = execFileSync('magick', ['identify', '-format', '%w %h', path.join(ROOT, entry.full)])
    .toString()
    .split(' ')
    .map(Number);
  entry.w = w;
  entry.h = h;

  entries.push(entry);
}

entries.sort((a, b) => a.n - b.n);
// manifest.json holds the number <-> source mapping so numbers stay stable.
fs.writeFileSync(MANIFEST, JSON.stringify(entries, null, 2) + '\n');
// manifest.js is what the page reads (a plain script, so file:// works too).
const site = entries.map(({ n, full, thumb, w, h }) => ({ n, full, thumb, w, h }));
fs.writeFileSync(
  path.join(ROOT, 'manifest.js'),
  'window.IMAGES = ' + JSON.stringify(site) + ';\n'
);

// Drop generated files whose source disappeared.
const live = new Set(entries.flatMap((e) => [path.basename(e.full), path.basename(e.thumb)]));
for (const f of fs.readdirSync(OUT)) {
  if (!live.has(f)) {
    fs.unlinkSync(path.join(OUT, f));
    console.log(`removed img/${f}`);
  }
}

console.log(`${entries.length} images`);
