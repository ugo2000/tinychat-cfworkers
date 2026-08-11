import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const content = readFileSync(base + 'src/html_src.js', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);

// Find the uploadQR function
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('reader.onload')) {
    console.log('\nreader.onload at line', i + 1);
    for (let j = i - 2; j <= i + 15; j++) {
      if (lines[j] !== undefined) console.log('L' + (j + 1) + ':', JSON.stringify(lines[j]));
    }
  }
  if (lines[i].includes('reader.readAsDataURL')) {
    console.log('\nreader.readAsDataURL at line', i + 1, ':', JSON.stringify(lines[i]));
  }
}
