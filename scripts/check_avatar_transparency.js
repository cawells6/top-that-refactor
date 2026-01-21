#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const DIR = process.argv[2] || 'public/assets/new-avatars';

async function hasTransparency(file) {
  try {
    const { data, info } = await sharp(path.join(DIR, file)).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const px = Buffer.from(data);
    for (let i = 0, j = 0; i < px.length; i += info.channels, j += 4) {
      const a = px[i + (info.channels - 1)];
      if (a < 255) return true;
    }
    return false;
  } catch (e) {
    return `error: ${e.message}`;
  }
}

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => /\.png$/i.test(f));
  const results = [];
  for (const f of files) {
    // skip backups
    if (/\.bak$/i.test(f)) continue;
    const v = await hasTransparency(f);
    results.push({ file: f, transparent: v });
  }
  console.log('Transparency report:');
  for (const r of results) console.log('-', r.file, r.transparent);
}

main().catch((e) => { console.error(e); process.exit(1); });
