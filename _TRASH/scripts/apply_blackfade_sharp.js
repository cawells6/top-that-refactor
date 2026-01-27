#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const DIR = process.argv[2] || 'public/assets/new-avatars';
const RADIUS = 0.6; // fraction of width for radial gradient
const STRENGTH = 0.65; // opacity of black at center

async function applyBlackFade(file) {
  const full = path.join(DIR, file);
  if (!fs.existsSync(full)) return { file, skipped: true };
  // Only target transparent variants
  if (!/_transparent\.png$/i.test(file)) return { file, skipped: true };
  const out = full.replace(/_transparent\.png$/i, '_transparent_fade.png');
  try {
    const img = sharp(full).ensureAlpha();
    const { width, height } = await img.metadata();
    if (!width || !height) return { file, error: 'missing dims' };

    // Create an overlay PNG with a radial black gradient using raw buffer
    const canvasW = width;
    const canvasH = height;
    const overlay = Buffer.alloc(canvasW * canvasH * 4);
    const cx = Math.floor(canvasW * 0.3);
    const cy = Math.floor(canvasH * 0.3);
    const maxR = Math.sqrt(canvasW * canvasW + canvasH * canvasH) * RADIUS;

    for (let y = 0; y < canvasH; y++) {
      for (let x = 0; x < canvasW; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t = Math.max(0, Math.min(1, dist / maxR));
        // opacity ramps from STRENGTH at center to 0 at outer radius
        const alpha = Math.round((1 - t) * STRENGTH * 255);
        const idx = (y * canvasW + x) * 4;
        overlay[idx] = 0; // r
        overlay[idx + 1] = 0; // g
        overlay[idx + 2] = 0; // b
        overlay[idx + 3] = alpha;
      }
    }

    const overlayImg = sharp(overlay, { raw: { width: canvasW, height: canvasH, channels: 4 } });
    await img.composite([{ input: await overlayImg.png().toBuffer(), blend: 'over' }]).png().toFile(out);
    return { file, out: path.basename(out) };
  } catch (e) {
    return { file, error: String(e) };
  }
}

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => /_transparent\.png$/i.test(f));
  const results = [];
  for (const f of files) {
    results.push(await applyBlackFade(f));
  }
  console.log('Black-fade results:');
  for (const r of results) console.log('-', r.file, r.out || r.skipped || r.error || 'done');
}

main().catch((e) => { console.error(e); process.exit(1); });
