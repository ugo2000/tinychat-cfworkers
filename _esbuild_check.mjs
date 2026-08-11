import { build } from 'esbuild';
try {
  const result = await build({
    entryPoints: ['dist/index.js'],
    bundle: false,
    write: false,
    metafile: true,
    logLevel: 'info',
    absWorkingDir: process.cwd(),
  });
  console.log('BUILD OK');
  for (const [k, v] of Object.entries(result.metafile.outputs)) {
    console.log('output:', k);
    console.log('exports:', JSON.stringify(v.exports));
  }
} catch (e) {
  console.log('BUILD FAILED:');
  console.log(String(e.message || e).slice(0, 3000));
  if (e.errors) console.log(JSON.stringify(e.errors).slice(0, 3000));
}
