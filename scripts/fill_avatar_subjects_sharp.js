#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const DIR = process.argv[2] || 'public/assets/new-avatars';
const TARGETS = [];
const SIZE = 512; // working square size

function backup(originalPath) {
  const bak = originalPath + '.bak';
  if (!fs.existsSync(bak)) fs.copyFileSync(originalPath, bak);
}

async function processOne(fileName) {
  const full = path.join(DIR, fileName);
  if (!fs.existsSync(full)) {
    return { file: fileName, error: 'missing' };
  }
  try {
    backup(full);
    // Trim transparent border, then resize to fill a square (cover), preserving transparency
    await sharp(full)
      .trim() // remove transparent edges
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9 })
      .toFile(full + '.tmp');
    fs.renameSync(full + '.tmp', full);
    return { file: fileName, status: 'done' };
  } catch (err) {
    return { file: fileName, error: String(err) };
  }
}

async function main() {
  const results = [];
  for (const t of TARGETS) {
    results.push(await processOne(t));
  }
  console.log('Fill-subject results:');
  for (const r of results) console.log('-', r.file, r.status || r.error);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
