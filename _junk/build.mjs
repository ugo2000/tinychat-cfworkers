import * as esbuild from '../node_modules/esbuild/lib/main.js';
import { scriptTagPlugin } from './esbuild-plugin.mjs';

const result = await esbuild.build({
  entryPoints: ['src/index.js'],
  outdir: 'dist',
  bundle: true,  // MUST be true to inline html.js and wechat.js
  format: 'esm',
  plugins: [scriptTagPlugin()],
  minify: false,
  sourcemap: false,
  logLevel: 'info',
});
console.log('Errors:', result.errors?.length || 0);
if (result.errors?.length) result.errors.forEach(e => console.log('ERROR:', e.text, e.location));
else console.log('Build OK');
