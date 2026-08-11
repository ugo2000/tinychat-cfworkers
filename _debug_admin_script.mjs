import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

const admin = execSync('curl.exe -s https://chathub.asia/admin', { encoding: 'utf8' });
const s = admin.indexOf('<script>');
const e = admin.indexOf("</scr'+'ipt>");
const script = admin.substring(s + 8, e);
writeFileSync(base + '_admin_script_now.js', script, 'utf8');

// Find the error position
try {
  new Function(script);
} catch(err) {
  console.log('Error:', err.message);
  const match = err.message.match(/at position (\d+)/);
  if (match) {
    const pos = parseInt(match[1]);
    console.log('Error at position:', pos);
    const start = Math.max(0, pos - 100);
    const end = Math.min(script.length, pos + 100);
    console.log('Context:', JSON.stringify(script.substring(start, end)));
    console.log('Lines around error:');
    const lines = script.split('\n');
    let globalPos = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = globalPos + lines[i].length + 1;
      if (globalPos <= pos && pos < lineEnd) {
        console.log('  Line', i + 1, '(offset', globalPos, '):', lines[i]);
        if (i > 0) console.log('  Line', i, ':', lines[i - 1]);
        if (i > 1) console.log('  Line', i - 1, ':', lines[i - 2]);
        break;
      }
      globalPos = lineEnd;
    }
  }
}

// Check for function definitions
const funcLines = script.split('\n');
let lineNum = 1;
let globalPos = 0;
for (const line of funcLines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('async function') || 
      trimmed.startsWith('function') || 
      trimmed === 'async' ||
      trimmed.startsWith('const') && trimmed.includes('=>')) {
    console.log('Line', lineNum, ':', trimmed.substring(0, 100));
  }
  globalPos += line.length + 1;
  lineNum++;
}
