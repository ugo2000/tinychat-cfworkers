import { execSync } from 'child_process';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

const admin = execSync('curl.exe -s https://chathub.asia/admin', { encoding: 'utf8' });

const s = admin.indexOf('<script>');
const e = admin.indexOf("</scr'+'ipt>");
if (s < 0 || e < 0) { console.log('NO SCRIPT'); process.exit(1); }

const script = admin.substring(s + 8, e);
console.log('Script len:', script.length);
const lines = script.split('\n');
console.log('Total lines:', lines.length);

// Find uploadQR
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('uploadQR') || lines[i].includes('loadPending') || lines[i].includes('reader.readAsDataURL')) {
    console.log('Line', i + 1, ':', lines[i]);
  }
}

try {
  new Function(script);
  console.log('\n✅ new Function OK');
} catch(err) {
  console.log('\n❌', err.message);
  const m = err.message.match(/at position (\d+)/);
  if (m) {
    const pos = parseInt(m[1]);
    console.log('Context:', JSON.stringify(script.substring(Math.max(0, pos-80), pos+80)));
    let lineStart = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = lineStart + lines[i].length + 1;
      if (lineStart <= pos && pos < lineEnd) {
        console.log('Error on line', i+1, ':', lines[i]);
        if (i > 0) console.log('Prev line', i, ':', lines[i-1]);
        break;
      }
      lineStart = lineEnd;
    }
  }
}
