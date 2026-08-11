import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

const admin = execSync('curl.exe -s https://chathub.asia/admin', { encoding: 'utf8' });

// Extract script using split close tag
const s = admin.indexOf('<script>');
const e = admin.indexOf("</scr'+'ipt>");
if (s < 0 || e < 0) { console.log('NO SCRIPT'); process.exit(1); }

const script = admin.substring(s + 8, e);
writeFileSync(base + '_admin_script_now.js', script, 'utf8');
console.log('Script length:', script.length);

// Try to parse and find the error
try {
  new Function(script);
  console.log('OK');
} catch(err) {
  console.log('Error:', err.message);
  // The error position is char offset in the script
  // Try to find what's around that position
  const match = err.message.match(/at position (\d+)/);
  if (match) {
    const pos = parseInt(match[1]);
    console.log('Error at position:', pos);
    console.log('Context:', JSON.stringify(script.substring(Math.max(0, pos - 50), pos + 50)));
  }
  
  // Also search for async function definitions
  const lines = script.split('\n');
  let lineNum = 1;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('async function') || trimmed.startsWith('function') || trimmed.startsWith('async')) {
      if (trimmed.match(/^async\s+function/) || trimmed.match(/^async\s+\(/)) {
        console.log('async at line', lineNum, ':', trimmed.substring(0, 80));
      }
    }
    lineNum++;
  }
}
