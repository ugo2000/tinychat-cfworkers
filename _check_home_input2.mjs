import { readFileSync } from 'fs';
const html = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/_home_live.html', 'utf8');

// Find ALL occurrences of input-bar with context
let pos = 0;
let idx = 0;
while ((pos = html.indexOf('input-bar', pos)) >= 0) {
  idx++;
  console.log('=== #' + idx + ' input-bar at ' + pos + ' ===');
  console.log(html.substring(Math.max(0, pos - 150), pos + 300));
  console.log('');
  pos += 10;
}

// Find the chat messages area and input area
const chatArea = html.indexOf('id="chat');
console.log('id="chat at:', chatArea);
const msgBox = html.indexOf('msg-box');
console.log('msg-box at:', msgBox);

// Show tail of the HTML (before </body>)
const bodyEnd = html.lastIndexOf('</body>');
console.log('\n=== Tail before </body> (' + bodyEnd + ') ===');
console.log(html.substring(bodyEnd - 2000));
