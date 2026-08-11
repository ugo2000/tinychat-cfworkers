import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

const adminJson = JSON.parse(bundle.match(/const ADMIN_HTML = "[\s\S]*?"(?=;)/)[0].replace('const ADMIN_HTML = ', ''));
const s = adminJson.indexOf('<script>');
const e = adminJson.indexOf('</script>');
const script = adminJson.substring(s + 8, e);

// Find the raw bytes of 'async function approvePay' in the bundle
const funcStr = 'async function approvePay';
const rawIdx = bundle.indexOf(funcStr);
console.log('"async function approvePay" in bundle at:', rawIdx);
if (rawIdx >= 0) {
  console.log('Bundle context:', JSON.stringify(bundle.substring(rawIdx - 50, rawIdx + 80)));
  // Check for any weird chars
  const ctx = bundle.substring(rawIdx - 50, rawIdx + 80);
  for (let i = 0; i < ctx.length; i++) {
    const cp = ctx.codePointAt(i);
    if (cp > 127 || cp < 32) {
      console.log('Special char at offset', i, ': U+' + cp.toString(16).toUpperCase().padStart(4, '0'), '=', JSON.stringify(ctx[i]));
    }
  }
}

// Now let's look at the closing of the previous function
// Find 'function logout' and what comes after
const logoutIdx = bundle.indexOf('function logout');
console.log('\n"function logout" in bundle at:', logoutIdx);
if (logoutIdx >= 0) {
  console.log('After logout:', JSON.stringify(bundle.substring(logoutIdx, logoutIdx + 100)));
}

// Check the extracted script content directly
const lines = script.split('\n');
const approveIdx = lines.findIndex(l => l.includes('async function approvePay'));
const logoutIdx2 = lines.findIndex(l => l.includes('function logout'));
console.log('\nIn extracted script:');
console.log('logout at line:', logoutIdx2);
console.log('approvePay at line:', approveIdx);
if (logoutIdx2 >= 0) {
  for (let i = logoutIdx2 - 2; i <= logoutIdx2 + 5; i++) {
    if (lines[i]) console.log('L' + (i + 1) + ':', JSON.stringify(lines[i]));
  }
}

// Check the script in the bundle (look for the actual closing of the previous function)
// In the bundle, the admin HTML's script section is JSON-encoded
// Let's find what comes AFTER the clearVisitors function in the bundle
const clearVisitorsIdx = bundle.indexOf('async function clearVisitors');
if (clearVisitorsIdx >= 0) {
  console.log('\nclearVisitors in bundle:', JSON.stringify(bundle.substring(clearVisitorsIdx, clearVisitorsIdx + 200)));
}

// Actually, let me just check: is the approvePay function properly defined in the script?
console.log('\nScript line 104:', JSON.stringify(lines[103]));
console.log('Script line 105:', JSON.stringify(lines[104]));
console.log('Script line 106:', JSON.stringify(lines[105]));
