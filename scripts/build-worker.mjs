import { cp, mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('dist/server', { recursive: true });
await build({
  entryPoints: ['worker/index.js'],
  outfile: 'dist/server/index.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  bundle: true,
});
const config = {
  name: 'siempre-celeste',
  main: 'index.js',
  compatibility_date: '2026-06-01',
  assets: {
    directory: '../client',
    binding: 'ASSETS',
    html_handling: 'auto-trailing-slash',
    run_worker_first: true,
  },
  d1_databases: [{
    binding: 'DB',
    database_name: 'siempre-celeste',
    database_id: '00000000-0000-0000-0000-000000000001',
    migrations_dir: '../../drizzle',
  }],
};
await writeFile('dist/server/wrangler.json', JSON.stringify(config, null, 2));
await mkdir('dist/.openai', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/.openai/drizzle', { recursive: true });
