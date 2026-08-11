import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// The first backtick is at 49807. Let's see the context
console.log('Backtick context:');
console.log(bundle.substring(49800, 49950));
console.log('---');
console.log(bundle.substring(0, 200));
