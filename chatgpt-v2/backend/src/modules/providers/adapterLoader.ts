import path from 'node:path';
import url from 'node:url';
import { ProviderAdapter } from './adapter.types.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export async function loadAdapter(adapterFile: string): Promise<ProviderAdapter> {
  // adapter_file stored like "openai.adapter" (without extension)
  const fullPath = path.join(__dirname, '..', '..', 'providers', 'adapters', `${adapterFile}.ts`);
  // In dist, TS becomes .js
  const jsPath = fullPath.replace(/\.ts$/, '.js');

  const mod = await import(url.pathToFileURL(jsPath).toString());
  if (!mod.default) throw new Error(`Adapter ${adapterFile} does not export default`);
  return mod.default as ProviderAdapter;
}
