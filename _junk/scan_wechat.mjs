import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/wechat_src.js', 'utf8');
console.log('Length:', s.length);
console.log('Exports:', JSON.stringify(s.match(/export\s+(async\s+)?function\s+(\w+)/g)));
console.log('---first 500 chars---');
console.log(s.substring(0, 500));
console.log('---last 300 chars---');
console.log(s.substring(s.length - 300));
