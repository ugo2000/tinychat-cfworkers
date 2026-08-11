import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

// Check home page
const home = execSync('curl.exe -s https://chathub.asia/', { encoding: 'utf8' });
const homeScript = home.indexOf('<script>');
const homeEndScript = home.indexOf('</script>');
console.log('HOME: len=' + home.length + ' script=' + homeScript + ' endScript=' + homeEndScript);
writeFileSync(base + '_home_live.html', home, 'utf8');
if (homeScript >= 0 && homeEndScript >= 0) {
  const script = home.substring(homeScript + 8, homeEndScript);
  writeFileSync(base + '_home_script.js', script, 'utf8');
  console.log('  Script len=' + script.length);
  try {
    new Function(script);
    console.log('  ✅ new Function OK');
  } catch(err) {
    console.log('  ❌ ERROR:', err.message);
  }
} else {
  console.log('  NO SCRIPT TAG - split close used');
}

// Check admin page
const admin = execSync('curl.exe -s https://chathub.asia/admin', { encoding: 'utf8' });
const adminScript = admin.indexOf('<script>');
const adminEndScript = admin.indexOf('</script>');
console.log('\nADMIN: len=' + admin.length + ' script=' + adminScript + ' endScript=' + adminEndScript);
writeFileSync(base + '_admin_live.html', admin, 'utf8');
if (adminScript >= 0 && adminEndScript >= 0) {
  const script = admin.substring(adminScript + 8, adminEndScript);
  writeFileSync(base + '_admin_script.js', script, 'utf8');
  console.log('  Script len=' + script.length);
  try {
    new Function(script);
    console.log('  ✅ new Function OK');
  } catch(err) {
    console.log('  ❌ ERROR:', err.message);
  }
} else {
  console.log('  NO SCRIPT TAG - split close used');
}

// Check if the page has HTML content after the script
console.log('\nHome HTML after script:', home.length - homeEndScript - 9, 'chars');
console.log('Admin HTML after script:', admin.length - adminEndScript - 9, 'chars');
