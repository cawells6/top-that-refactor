#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function hasAlphaByIHDR(buffer) {
  if (buffer.length < 26) return null;
  // PNG signature (8) + length(4) + 'IHDR'(4) = 16 bytes; IHDR data starts at 16
  // color type is byte at offset 16 + 9 = 25 (0-based)
  const colorType = buffer.readUInt8(25);
  // color type 6 => RGBA, 4 => grayscale+alpha
  if (colorType === 6 || colorType === 4) return true;
  if (colorType === 3) return false; // indexed-color (may have tRNS)
  return false;
}

function hasTRNS(buffer) {
  // search for ASCII 'tRNS' in the file after the IHDR chunk
  return buffer.indexOf(Buffer.from('tRNS')) !== -1;
}

async function checkFile(filePath) {
  const data = await fs.promises.readFile(filePath);
  if (data.slice(0,8).toString('hex') !== '89504e470d0a1a0a') {
    return { file: filePath, error: 'not a PNG' };
  }
  const hasAlphaIHDR = hasAlphaByIHDR(data);
  const hasTRNSChunk = hasTRNS(data);
  const result = {
    file: path.basename(filePath),
    colorTypeHasAlpha: hasAlphaIHDR,
    tRNS: hasTRNSChunk,
    transparent: Boolean(hasAlphaIHDR || hasTRNSChunk)
  };
  return result;
}

async function main() {
  const target = process.argv[2] || 'public/assets/new-avatars';
  let stat;
  try {
    stat = await fs.promises.stat(target);
  } catch (e) {
    console.error('Path not found:', target);
    process.exit(2);
  }

  const files = stat.isDirectory()
    ? (await fs.promises.readdir(target)).map(f => path.join(target, f))
    : [target];

  const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));
  if (pngFiles.length === 0) {
    console.log('No PNG files found in', target);
    return;
  }

  const results = [];
  for (const f of pngFiles) {
    try {
      const r = await checkFile(f);
      results.push(r);
    } catch (err) {
      results.push({ file: path.basename(f), error: String(err) });
    }
  }

  // Print a concise table-like summary
  console.log('Transparency check results:');
  for (const r of results) {
    if (r.error) {
      console.log('-', r.file + ': ERROR -', r.error);
      continue;
    }
    const status = r.transparent ? 'TRANSPARENT' : 'OPAQUE';
    const details = [];
    if (r.colorTypeHasAlpha) details.push('IHDR alpha');
    if (r.tRNS) details.push('tRNS');
    console.log('-', r.file + ':', status + (details.length ? ` (${details.join(', ')})` : ''));
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('check_png_transparency.js')) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
