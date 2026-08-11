import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

const admin = execSync('curl.exe -s https://chathub.asia/admin', { encoding: 'utf8' });
console.log('Page len:', admin.length);
const s = admin.indexOf('<script>');
const e = admin.indexOf("</scr'+'ipt>");
console.log('script at', s, 'split close at', e);
const script = admin.substring(s + 8, e);
writeFileSync(base + '_admin_live_v2.js', script, 'utf8');
console.log('Script len:', script.length, 'lines:', script.split('\n').length);

try {
  new Function(script);
  console.log('✅ new Function OK');
} catch(err) {
  console.log('❌', err.message);
  const m = err.message.match(/at position (\d+)/);
  if (m) {
    const pos = parseInt(m[1]);
    const lines = script.split('\n');
    let ls = 0;
    for (let li = 0; li < lines.length; li++) {
      const le = ls + lines[li].length + 1;
      if (ls <= pos && pos < le) {
        console.log('Error on line', li+1, ':');
        for (let k = Math.max(0, li-3); k <= Math.min(lines.length-1, li+3); k++) {
          console.log('  ', k+1, ':', JSON.stringify(lines[k].substring(0, 200)));
        }
        break;
      }
      ls = le;
    }
  }
}
