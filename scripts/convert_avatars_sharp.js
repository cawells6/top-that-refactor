#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const DIR = process.argv[2] || 'public/assets/new-avatars';
let TARGETS = [];

function backup(originalPath) {
  const bak = originalPath + '.bak';
  if (!fs.existsSync(bak)) fs.copyFileSync(originalPath, bak);
}

async function convert(fileName) {
  const full = path.join(DIR, fileName);
  if (!fs.existsSync(full)) {
    console.warn('Missing file', full);
    return { file: fileName, skipped: true };
  }
  // Skip already-processed transparent outputs
  if (/_transparent\.png$/i.test(fileName)) {
    return { file: fileName, skipped: true };
  }
  const outName = fileName.replace(/\.png$/i, '_transparent.png');
  const outFull = path.join(DIR, outName);
  try {
    backup(full);
    const img = sharp(full).ensureAlpha();
    // Convert near-white background to transparent using a threshold on brightness
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels; // expect 3 or 4
    // Create a new buffer where near-white pixels become transparent
    const px = Buffer.from(data);
    const out = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0, j = 0; i < px.length; i += channels, j += 4) {
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      // preserve original alpha when present
      const a = channels >= 4 ? px[i + 3] : 255;
      // simple luminance
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // If pixel is very close to white, make transparent
      const isNearWhite = lum > 245 && r > 240 && g > 240 && b > 240;
      out[j] = r;
      out[j + 1] = g;
      out[j + 2] = b;
      out[j + 3] = isNearWhite ? 0 : a;
    }
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toFile(outFull);
    return { file: fileName, out: outName };
  } catch (err) {
    return { file: fileName, error: String(err) };
  }
}

async function main() {
  const results = [];
  // If no explicit targets provided, process all PNGs in DIR
  if (TARGETS.length === 0) {
    try {
      const files = fs.readdirSync(DIR).filter((f) => /\.png$/i.test(f));
      TARGETS = files;
    } catch (e) {
      console.error('Unable to read directory', DIR, e);
      process.exit(1);
    }
  }
  for (const t of TARGETS) {
    results.push(await convert(t));
  }
  console.log('Convert results:');
  for (const r of results) console.log('-', r.file, r.out ? '-> ' + r.out : r.error || 'skipped');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
