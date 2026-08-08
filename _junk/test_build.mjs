import * as esbuild from '../node_modules/esbuild/lib/main.js';

const result = await esbuild.build({
  entryPoints: ['src/html.js'],
  outfile: 'dist/test_html.js',
  format: 'esm',
  minify: false,
  sourcemap: false,
  logLevel: 'info',
});
console.log('Errors:', result.errors?.length || 0);
if (result.errors?.length) result.errors.forEach(e => console.log('ERROR:', e.text));
else console.log('Build OK');
