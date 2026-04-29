import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DATASET_DIR = path.resolve(process.cwd(), 'data/datasets/trial-data');
const TARGET_DIR = path.resolve(process.cwd(), process.argv[2] ?? DEFAULT_DATASET_DIR);
const MANIFEST_FILENAME = 'manifest.json';

const VERSION_INFO = {
  tdc_version: '1.0.0',
  workspace_contract_version: '1.0.0',
  reward_version: '1.0',
  bridge_version: '1.0',
};

interface ManifestEntry {
  path: string;
  hash: string;
  bytes: number;
  records: number;
}

const isDataFile = (entry: string): boolean =>
  (entry.endsWith('.json') || entry.endsWith('.jsonl')) && entry !== MANIFEST_FILENAME;

const readDatasetFiles = (directory: string): string[] => {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error(`Dataset directory not found: ${directory}`);
  }
  return fs.readdirSync(directory).filter(isDataFile);
};

const computeHash = (buffer: Buffer): string =>
  `sha256-${createHash('sha256').update(buffer).digest('base64')}`;

const countRecords = (raw: string): number => {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.length;
    }
    if (typeof parsed === 'object') {
      // Single session object
      return 1;
    }
  } catch {
    // Fall back to JSONL where each line is its own record
    return trimmed.split('\n').filter((line) => line.trim().length > 0).length;
  }
  return 1;
};

const buildManifestEntries = (directory: string, files: string[]): ManifestEntry[] => {
  return files.map((relativePath) => {
    const absolutePath = path.join(directory, relativePath);
    const buffer = fs.readFileSync(absolutePath);
    const records = countRecords(buffer.toString('utf8'));
    return {
      path: relativePath,
      hash: computeHash(buffer),
      bytes: buffer.byteLength,
      records,
    };
  });
};

const writeManifest = (directory: string, entries: ManifestEntry[]) => {
  const manifestPath = path.join(directory, MANIFEST_FILENAME);
  const totalRecords = entries.reduce((sum, entry) => sum + entry.records, 0);
  const manifest = {
    ...VERSION_INFO,
    generated_at: new Date().toISOString(),
    count: totalRecords,
    files: entries,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(
    `🗂️  Wrote manifest for ${entries.length} file(s) ` +
      `(${totalRecords} record(s)) to ${path.relative(process.cwd(), manifestPath)}`
  );
};

try {
  const files = readDatasetFiles(TARGET_DIR);
  if (files.length === 0) {
    console.warn(`⚠️  No dataset files found in ${TARGET_DIR}. Nothing to do.`);
    process.exit(0);
  }
  const entries = buildManifestEntries(TARGET_DIR, files);
  writeManifest(TARGET_DIR, entries);
} catch (error) {
  console.error(`Failed to build dataset manifest: ${(error as Error).message}`);
  process.exit(1);
}

