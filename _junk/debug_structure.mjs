import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
const out = [];
out.push('Lines: ' + lines.length);
lines.forEach((l, i) => {
  const t = l.trim();
  if (t.startsWith('export class') || t.startsWith('export function') || t.startsWith('export default') || t.includes('export { HTML')) {
    out.push('L' + (i+1) + ': ' + t.substring(0, 80));
  }
});
const edIdx = s.indexOf('export default');
out.push('\nexport default at char: ' + edIdx);
if (edIdx >= 0) {
  out.push('Context: ' + JSON.stringify(s.substring(edIdx-50, edIdx+100)));
}
// Show line structure
out.push('\nLine depth analysis:');
let depth = 0, inStr = false, inML = false;
lines.forEach((l, i) => {
  const lineContent = l;
  let lineDepth = depth;
  for (const c of lineContent) {
    if (!inML && (c === '"' || c === "'")) inStr = !inStr;
    else if (!inStr && c === '`') inML = !inML;
    else if (inML && c === '\\' && i+1 < lineContent.length) { /* skip escaped */ }
    else if (!inStr && !inML && c === '{') depth++;
    else if (!inStr && !inML && c === '}') depth--;
  }
  const t = l.trim();
  if (t.startsWith('}') || t.startsWith('export ') || t.startsWith('class ') || t.startsWith('async function') || t.startsWith('function ')) {
    out.push('L' + (i+1) + ' (d=' + lineDepth + '): ' + t.substring(0, 60));
  }
});
writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/debug_structure.txt', out.join('\n'));
console.log('Written debug_structure.txt');
