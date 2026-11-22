// Copies the repository's documentation into src/ so VitePress can build it.
// The markdown is written and kept next to the code (backend/docs,
// frontend/docs, the READMEs); src/ only holds a generated copy, laid out
// with the same paths as the repository so relative links keep working.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(siteRoot, '..');
const out = path.join(siteRoot, 'src');

// repository paths published on the site
export const SOURCES = [
  'backend/README.md',
  'backend/docs',
  'frontend/README.md',
  'frontend/ARCHITECTURE.md',
  'frontend/docs',
];

for (const dir of ['backend', 'frontend']) rmSync(path.join(out, dir), { recursive: true, force: true });

for (const source of SOURCES) {
  const from = path.join(repoRoot, source);
  if (!existsSync(from)) throw new Error(`docs source not found: ${source}`);
  const to = path.join(out, source);
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to, {
    recursive: true,
    filter: (file) => !file.endsWith('.DS_Store'),
  });
}

console.log(`synced ${SOURCES.length} documentation sources into src/`);
