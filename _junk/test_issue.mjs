import { readFileSync, writeFileSync } from 'fs';
import { build } from '../node_modules/esbuild/lib/main.js';

// Test: create minimal file with </script> in template literal, build, check error
const testCode = `export default {
  fetch(req, env) {
    return new Response(\`<html><script>alert(1)</script></html>\`);
  }
};`;

writeFileSync('test_min.js', testCode);

try {
  await build({
    entryPoints: ['test_min.js'],
    outfile: 'dist/test_min.js',
    bundle: false,
    format: 'esm',
    minify: false,
    logLevel: 'info',
    // No plugins
  });
  console.log('Build succeeded');
} catch(e) {
  console.log('Build failed:', e.message);
}
