import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

const admin = execSync('curl.exe -s https://chathub.asia/admin', { encoding: 'utf8' });
console.log('Admin page length:', admin.length);

const s = admin.indexOf('<script>');
const e = admin.indexOf('</script>');
if (s < 0 || e < 0) {
  console.log('NO SCRIPT TAG FOUND');
  console.log('Split close present:', admin.includes("</scr'+'ipt>"));
  writeFileSync(base + '_admin_live_now.html', admin, 'utf8');
  console.log('Written to _admin_live_now.html');
} else {
  const script = admin.substring(s + 8, e);
  console.log('Script: ' + s + '-' + e + ' len=' + script.length);
  writeFileSync(base + '_admin_script_now.js', script, 'utf8');
  console.log('Written to _admin_script_now.js');
  try {
    new Function(script);
    console.log('✅ new Function OK');
  } catch(err) {
    console.log('❌ ERROR:', err.message);
  }
}
