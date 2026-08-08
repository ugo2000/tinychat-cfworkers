import * as esbuild from '../node_modules/esbuild/lib/main.js';
console.log('esbuild keys:', Object.keys(esbuild).slice(0, 10));

// Try simple build
try {
  const result = await esbuild.build({
    entryPoints: ['src/index.js'],
    outfile: 'dist/test.js',
    bundle: false,
    format: 'esm',
    minify: false,
  });
  console.log('Build result:', JSON.stringify(result));
} catch(e) {
  console.error('Error:', e.message);
}
