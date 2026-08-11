import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

const html = execSync('curl.exe -s https://chathub.asia/', { encoding: 'utf8' });
writeFileSync(base + '_home_live.html', html, 'utf8');
console.log('Home len:', html.length);

// Check for input-related elements
const checks = ['input-bar', 'inputBar', 'textInput', 'chatInput', 'sendBtn', '<input', '<textarea', 'id="input', 'id="msg', 'id="chat'];
for (const c of checks) {
  let pos = 0, count = 0;
  while ((pos = html.indexOf(c, pos)) >= 0) { count++; pos += c.length; }
  console.log(c.padEnd(18), ':', count);
}

// Show the region around input-bar / send button
const ib = html.indexOf('input-bar');
if (ib >= 0) {
  console.log('\n=== Around input-bar (' + ib + ') ===');
  console.log(html.substring(ib - 300, ib + 800));
} else {
  // find sendBtn or similar
  const sb = html.indexOf('send');
  if (sb >= 0) {
    console.log('\n=== Around first "send" (' + sb + ') ===');
    console.log(html.substring(sb - 300, sb + 600));
  }
}
