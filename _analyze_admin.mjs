import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

const html = execSync('curl.exe -s https://chathub.asia/admin', { encoding: 'utf8' });
writeFileSync(base + '_admin_raw.html', html);
console.log('admin HTML len:', html.length);

const s = html.indexOf('<script>');
const e = html.indexOf('</script>');
if (s >= 0 && e >= 0) {
  const script = html.substring(s + 8, e);
  writeFileSync(base + '_admin_script.js', script);
  console.log('admin script len:', script.length);
  try { new Function(script); console.log('admin script syntax: OK'); }
  catch (err) { console.log('admin script ERROR:', err.message); }
} else {
  console.log('No script found!');
}

// Key element checks
const checks = [
  ['form tag', html.includes('<form')],
  ['input field', html.includes('<input')],
  ['username', html.includes('username')],
  ['password', html.includes('password')],
  ['login button', html.includes('Login') || html.includes('login')],
  ['admin page title', html.includes('Admin')],
];
checks.forEach(([n, ok]) => console.log(ok ? '[OK]' : '[MISSING]', n));

// Show first 1000 chars of HTML body
const bodyIdx = html.indexOf('<body');
console.log('\n--- HTML body start ---');
console.log(html.substring(bodyIdx, bodyIdx + 1000));
