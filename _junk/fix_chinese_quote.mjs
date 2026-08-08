import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
// Replace Chinese curly apostrophe with ASCII single quote
const oldLen = s.length;
s = s.replace(/\u2019/g, "'").replace(/\uFF07/g, "'");
writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', s);
console.log('Fixed Chinese quotes. Length change:', oldLen, '->', s.length);
