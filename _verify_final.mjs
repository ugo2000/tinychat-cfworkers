import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

// 1. All pages script check
const pages = ['/', '/admin', '/test', '/about', '/pricing'];
for (const p of pages) {
  const html = execSync('curl.exe -s https://chathub.asia' + p, { encoding: 'utf8' });
  const s = html.indexOf('<script>');
  const split = html.indexOf("</scr'+'ipt>");
  let status = 'no-script';
  if (s >= 0 && split > s) {
    const script = html.substring(s + 8, split);
    try { new Function(script); status = '✅ OK (' + script.length + ')'; }
    catch(err) { status = '❌ ' + err.message; }
  }
  console.log(p.padEnd(10), 'len=' + html.length, status);
}

// 2. Verify home script has the input enable logic
const html = execSync('curl.exe -s https://chathub.asia/', { encoding: 'utf8' });
const s = html.indexOf('<script>');
const split = html.indexOf("</scr'+'ipt>");
const script = html.substring(s + 8, split);
writeFileSync(base + '_home_script_live.js', script, 'utf8');
const hasEnable = script.includes("msgInput').disabled = false");
const hasDisableOnClose = script.includes('mi.disabled = true');
const hasLogoutDisable = script.includes("msgInput').disabled = true");
console.log('\nHome script checks:');
console.log('  enable on init   :', hasEnable);
console.log('  disable on close :', hasDisableOnClose);
console.log('  disable on logout:', hasLogoutDisable);
