import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/_tmp_entry.js', 'utf8');
const lines = s.split('\n');
console.log('Total lines:', lines.length);

// Find line 158 and surrounding context
console.log('\nL150-170:');
for (let i = 149; i <= 169; i++) {
  const l = lines[i] || '';
  const t = l.trim();
  const indent = (l.match(/^(\s*)/)||[''])[1].length;
  // Check for Chinese/mixed chars
  const hasChinese = /[^\x00-\x7F]/.test(t);
  console.log(`L${i+1} [indent=${indent}][chinese=${hasChinese}]: ${t}`);
}

// Find the problematic Chinese comment lines
console.log('\nSearching for Chinese comments that start with // and contain {...}:');
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (/[^\x00-\x7F]/.test(t) && t.startsWith('//')) {
    console.log(`L${i+1}: ${lines[i]}`);
  }
}

// Find orphan {
let depth = 0;
const orphans = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  for (const ch of l) { if (ch === '{') depth++; else if (ch === '}') depth--; }
  if (depth < 0) { orphans.push({ line: i+1, depth, text: lines[i].substring(0,80) }); depth = 0; }
}
console.log('\nOrphan { lines:', orphans.length);
orphans.slice(0,5).forEach(o => console.log(`  L${o.line}: depth=${o.depth}: ${o.text}`));
