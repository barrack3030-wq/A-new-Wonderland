import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = 'src/content';
const required = {
  destinations: ['title', 'description', 'image', 'location', 'category'],
  packages: ['title', 'description', 'image', 'duration', 'destination'],
  blog: ['title', 'description', 'image', 'author', 'pubDate'],
};

const errors = [];

async function collectMarkdown(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdown(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files;
}

function parseFrontmatter(raw, path) {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    errors.push(path + ': missing opening frontmatter delimiter');
    return null;
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (end === -1) {
    errors.push(path + ': missing closing frontmatter delimiter');
    return null;
  }

  const fm = lines.slice(1, end);
  const keys = new Set();
  let blockKey = null;

  for (let i = 0; i < fm.length; i++) {
    const line = fm[i];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    if (/^\s/.test(line)) continue;

    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s|$)/);
    if (!match) {
      errors.push(path + ':' + (i + 2) + ': invalid frontmatter line: ' + line.trim());
      continue;
    }

    const key = match[1];
    if (keys.has(key)) errors.push(path + ':' + (i + 2) + ': duplicate key "' + key + '"');
    keys.add(key);

    const value = line.slice(match[0].length).trim();
    blockKey = value === '|' || value === '>' || value.startsWith('|-') || value.startsWith('>-') || value.startsWith('|+') || value.startsWith('>+')
      ? key
      : null;
  }

  return keys;
}

for (const path of await collectMarkdown(ROOT)) {
  const raw = await readFile(path, 'utf8');
  const keys = parseFrontmatter(raw, path);
  if (!keys) continue;

  const collection = path.split('/')[2];
  for (const key of required[collection] ?? []) {
    if (!keys.has(key)) errors.push(path + ': missing required frontmatter key "' + key + '"');
  }
}

if (errors.length) {
  console.error('\nFrontmatter validation failed:\n');
  for (const error of errors) console.error(' - ' + error);
  process.exit(1);
}

console.log('Frontmatter validation passed for all content files.');
