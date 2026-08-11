import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const content = readFileSync(base + 'src/html_src.js', 'utf8');
console.log('File length:', content.length);
console.log('File lines:', content.split('\n').length);

// Check for closing backticks in the file
const backticks = [];
let pos = 0;
while ((pos = content.indexOf('`', pos)) >= 0) {
  const line = content.substring(0, pos).split('\n').length;
  backticks.push({ pos, line });
  pos++;
}
console.log('Total backticks:', backticks.length);
backticks.forEach(b => console.log('  line', b.line, 'pos', b.pos));

// Check template string boundaries
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes('const HTML = `') || l.includes('const ADMIN_HTML = `') ||
      l.includes('const TEST_HTML = `') || l.includes('const ABOUT_HTML = `') ||
      l.includes('const PRICING_HTML = `')) {
    console.log('\nTemplate start:', l.substring(0, 50), 'at line', i + 1);
  }
}

// Check the very last few lines
console.log('\nLast 10 lines:');
for (let i = Math.max(0, lines.length - 10); i < lines.length; i++) {
  console.log('L' + (i + 1) + ':', JSON.stringify(lines[i]));
}
