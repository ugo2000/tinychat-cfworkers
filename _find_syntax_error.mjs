import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const html = readFileSync(base + '_front_now.html', 'utf16le');
const s = html.indexOf('<script>');
const e = html.indexOf('</script>');
const script = html.substring(s + 8, e);

// Try to find exact error position
// Split into lines and find which line has the error
const lines = script.split('\n');
let lineNum = 0;
let charCount = 0;
for (const line of lines) {
  const test = script.substring(0, charCount + line.length + 1);
  try {
    new Function(test);
  } catch (e) {
    if (e.message.includes('Invalid or unexpected token') || e.message.includes('Unexpected')) {
      console.log('Error near line', lineNum + 1, 'char offset', charCount);
      console.log('Line content:', JSON.stringify(line));
      console.log('Error:', e.message);
      // Show context
      const ctx = lines.slice(Math.max(0, lineNum - 3), lineNum + 3);
      ctx.forEach((l, i) => console.log('L' + (lineNum - 2 + i) + ':', JSON.stringify(l)));
      break;
    }
  }
  charCount += line.length + 1;
  lineNum++;
}

// Also show the send button area in HTML
const btnIdx = html.indexOf('btnSend');
const inputBarIdx = html.indexOf('input-bar');
if (inputBarIdx >= 0) {
  console.log('\n--- input-bar section ---');
  console.log(html.substring(inputBarIdx, inputBarIdx + 500));
}
if (btnIdx >= 0) {
  console.log('\nbtnSend at:', btnIdx);
  console.log(html.substring(btnIdx - 50, btnIdx + 100));
} else {
  console.log('\nbtnSend NOT FOUND in HTML');
}

// Show the end of the script (sendMsg function area)
const sendIdx = script.indexOf('function sendMsg');
if (sendIdx >= 0) {
  console.log('\n--- sendMsg function end ---');
  console.log(script.substring(sendIdx, sendIdx + 500));
}
