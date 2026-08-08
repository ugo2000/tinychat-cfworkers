import { readFileSync } from 'fs';
const src = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');
// Try to parse as Module
try {
  new Function(src);
  console.log('Function() OK');
} catch (e) {
  console.log('Function() FAIL:', e.message);
}
// Try esbuild to check syntax
console.log('\nTrying esbuild...');
const { execSync } = require('child_process');
try {
  const out = execSync('npx esbuild dist/index.js --bundle --outfile=/dev/null 2>&1', {
    cwd: 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers',
    timeout: 10000
  });
  console.log('esbuild OK:', out.toString().substring(0, 200));
} catch (e) {
  console.log('esbuild FAIL:', e.stdout?.toString().substring(0, 300) || e.message);
}
