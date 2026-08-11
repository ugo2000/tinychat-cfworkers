import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const content = readFileSync(base + 'src/html_src.js', 'utf8');

// Find the exact bytes around the closing script tag
const line1112 = content.split('\n')[1111]; // 0-indexed
console.log('Line 1112 raw:', JSON.stringify(line1112));
console.log('Line 1112 char codes:', [...line1112].map(c => c.charCodeAt(0) + '=' + c).join(' '));

// Also check what the about page closing tag looks like
const line988 = content.split('\n')[987];
console.log('\nLine 988 (ABOUT close):', JSON.stringify(line988));
console.log('Line 988 char codes:', [...line988].map(c => c.charCodeAt(0) + '=' + c).join(' '));

// Check the first HTML page close
const line593 = content.split('\n')[592];
console.log('\nLine 593 (HTML close):', JSON.stringify(line593));
