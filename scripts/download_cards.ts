import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CARD_VALUES = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '0',
  'J',
  'Q',
  'K',
] as const;
const CARD_SUITS = ['S', 'H', 'D', 'C'] as const;

function getCardCodes(): string[] {
  const codes: string[] = [];
  for (const suit of CARD_SUITS) {
    for (const value of CARD_VALUES) {
      codes.push(`${value}${suit}`);
    }
  }
  return codes;
}

function parseArgs(argv: string[]) {
  const args = new Set(argv);
  const getArgValue = (name: string): string | null => {
    const idx = argv.indexOf(name);
    if (idx === -1) return null;
    return argv[idx + 1] ?? null;
  };

  return {
    destDir: getArgValue('--dest') ?? 'public/assets/cards',
    force: args.has('--force'),
    concurrency: Number(getArgValue('--concurrency') ?? '8'),
    quiet: args.has('--quiet'),
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}

async function downloadToFile(
  urlCandidates: string[],
  outPath: string
): Promise<{ url: string; bytes: number }> {
  let lastError = 'Unknown error';
  for (const url of urlCandidates) {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      lastError = `HTTP ${res.status} ${res.statusText}`;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(outPath, buf);
    return { url, bytes: buf.length };
  }
  throw new Error(`Failed to download ${path.basename(outPath)}: ${lastError}`);
}

function makeCandidateUrls(fileName: string): string[] {
  return [
    `https://deckofcardsapi.com/static/img/${fileName}`,
    `https://raw.githubusercontent.com/hayeah/playing-cards-assets/master/png/${fileName}`,
  ];
}

async function main() {
  const { destDir, force, concurrency, quiet } = parseArgs(
    process.argv.slice(2)
  );

  if (!Number.isFinite(concurrency) || concurrency < 1) {
    throw new Error(`Invalid --concurrency value: ${concurrency}`);
  }

  const absDest = path.resolve(process.cwd(), destDir);
  await mkdir(absDest, { recursive: true });

  const codes = getCardCodes();
  const fileNames = [...codes.map((c) => `${c}.png`), 'back.png'];

  const queue = [...fileNames];
  let downloaded = 0;
  let skipped = 0;

  const worker = async () => {
    while (queue.length > 0) {
      const fileName = queue.shift();
      if (!fileName) return;

      const outPath = path.join(absDest, fileName);
      if (!force && (await fileExists(outPath))) {
        skipped += 1;
        continue;
      }

      const urls = makeCandidateUrls(fileName);
      const { url, bytes } = await downloadToFile(urls, outPath);
      downloaded += 1;
      if (!quiet) {
        console.log(`Downloaded ${fileName} (${bytes} bytes) from ${url}`);
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) },
    () => worker()
  );
  await Promise.all(workers);

  console.log(
    `Done. Downloaded: ${downloaded}, skipped: ${skipped}, dest: ${path.relative(
      process.cwd(),
      absDest
    )}`
  );
}

await main();
