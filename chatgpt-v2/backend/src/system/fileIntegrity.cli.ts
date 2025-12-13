import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.join(process.cwd(), 'dist'));

function sha256File(p: string) {
  const buf = fs.readFileSync(p);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error('dist/ not found. Build first.');
    process.exit(2);
  }
  const files = walk(ROOT).filter(f => f.endsWith('.js') || f.endsWith('.map') || f.endsWith('.json'));
  const manifest = files.map(f => {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    return { file: rel, sha256: sha256File(f), bytes: fs.statSync(f).size };
  });

  const outPath = path.resolve(path.join(process.cwd(), 'dist', 'integrity.manifest.json'));
  fs.writeFileSync(outPath, JSON.stringify({ generated_at: new Date().toISOString(), entries: manifest }, null, 2));
  console.log(`Wrote ${manifest.length} entries to ${outPath}`);
}

main();
