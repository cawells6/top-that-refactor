/* eslint-disable no-console */
const fs = require('node:fs/promises');
const path = require('node:path');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const distDir = path.join(process.cwd(), 'dist');

  try {
    await fs.access(distDir);
  } catch {
    console.log('[postbuild] dist/ not found; skipping extension fix');
    return;
  }

  const files = await walk(distDir);
  const jsFiles = files.filter((f) => f.endsWith('.js'));

  if (jsFiles.length === 0) {
    console.log('[postbuild] No .js files found under dist/; skipping extension fix');
    return;
  }

  let updatedCount = 0;
  for (const filePath of jsFiles) {
    const original = await fs.readFile(filePath, 'utf8');
    const updated = original.replaceAll('.ts', '.js');
    if (updated !== original) {
      await fs.writeFile(filePath, updated, 'utf8');
      updatedCount++;
    }
  }

  console.log(`[postbuild] Updated ${updatedCount}/${jsFiles.length} JS files`);
}

main().catch((err) => {
  console.error('[postbuild] Failed:', err);
  process.exitCode = 1;
});

