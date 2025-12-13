import 'dotenv/config';
import { checkDb, checkProviders, checkKeys } from './healthCheck.service.js';

async function main() {
  const mode = process.argv[2] || 'all';
  if (mode === 'db' || mode === 'all') {
    const ok = await checkDb();
    if (!ok) throw new Error('DB check failed');
    console.log('[health] db ok');
  }
  if (mode === 'api' || mode === 'all') {
    const providers = await checkProviders();
    console.log('[health] providers', providers);
    const keys = await checkKeys();
    console.log('[health] keys', keys.length);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
