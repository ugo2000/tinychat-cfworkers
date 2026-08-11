import { build } from 'esbuild';
for (const f of ['_mini.mjs', 'dist/index.js']) {
  try {
    const r = await build({ entryPoints: [f], bundle: false, write: false, metafile: true, logLevel: 'silent', absWorkingDir: process.cwd() });
    const outs = Object.entries(r.metafile.outputs);
    console.log(f, '->', outs.map(([k, v]) => `${k}: exports=${JSON.stringify(v.exports)}`).join(' | ') || 'NO OUTPUTS');
  } catch (e) {
    console.log(f, 'FAILED:', String(e.message || e).slice(0, 500));
  }
}
