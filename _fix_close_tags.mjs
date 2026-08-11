import { readFileSync, writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const content = readFileSync(base + 'src/html_src.js', 'utf8');

// Count occurrences using string search
const oldTag = '<\\/script>';
let count = 0, pos = 0;
while ((pos = content.indexOf(oldTag, pos)) >= 0) { count++; pos += oldTag.length; }
console.log('Found', count, 'occurrences of', JSON.stringify(oldTag));

const newTag = "</scr'+'ipt>";
const result = content.split(oldTag).join(newTag);

// Verify
pos = 0; let remaining = 0;
while ((pos = result.indexOf(oldTag, pos)) >= 0) { remaining++; pos += oldTag.length; }
console.log('Remaining oldTag:', remaining);

writeFileSync(base + 'src/html_src.js', result, 'utf8');
console.log('Written. Length:', result.length);

// Verify new tag
let newCount = 0; pos = 0;
while ((pos = result.indexOf(newTag, pos)) >= 0) { newCount++; pos += newTag.length; }
console.log('New tag count:', newCount);
