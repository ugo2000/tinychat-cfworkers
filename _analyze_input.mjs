import { readFileSync } from 'fs';
const html = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/_home_live.html', 'utf8');
const s = html.indexOf('<script>');
const e = html.indexOf("</scr'+'ipt>");
const script = html.substring(s + 8, e);
import { writeFileSync } from 'fs';
writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/_home_script.js', script, 'utf8');

// Find all references to msgInput and disabled
const lines = script.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('msgInput') || lines[i].includes('disabled') || lines[i].includes('connectWS') || lines[i].includes('showPage')) {
    console.log('L' + (i+1) + ': ' + lines[i].substring(0, 160));
  }
}
console.log('\nTotal lines:', lines.length);
