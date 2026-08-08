import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
// State machine across whole file, report lines where string state is weird or quotes unbalanced
let inStr = false, strChar = '', inML = false, inLineComment = false;
let errs = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let j = 0;
  let lineOk = true;
  while (j < line.length) {
    const c = line[j];
    if (inStr) {
      if (c === '\\') { j += 2; continue; }
      if (c === strChar) { inStr = false; }
      j++; continue;
    }
    if (inML) {
      if (c === '`') { inML = false; }
      else if (c === '\\') { j++; }
      j++; continue;
    }
    if (c === '"' || c === "'") { inStr = true; strChar = c; j++; continue; }
    if (c === '`') { inML = true; j++; continue; }
    if (c === '/' && j+1 < line.length && line[j+1] === '/') break; // rest is comment
    if (c === '/' && j+1 < line.length && line[j+1] === '*') { j += 2; while (j < line.length - 1 && !(line[j]==='*'&&line[j+1]==='/')) j++; j += 2; continue; }
    j++;
  }
  // At end of line: check for odd quotes or '?' pattern near quotes
  if (inStr) {
    // string still open at end of line - check if it contains '?' after quote
    errs.push('L' + (i+1) + ': STRING_OPEN ' + JSON.stringify(line.substring(0, Math.min(line.length, 120))));
  }
  // Find lines with '? pattern (damaged chinese quotes)
  if (/\'\?/.test(line) || /\?\'/.test(line)) {
    errs.push('L' + (i+1) + ': DAMAGED_QUOTE ' + JSON.stringify(line.substring(0, Math.min(line.length, 140))));
  }
}
console.log('Issues found:', errs.length);
errs.forEach(e => console.log(e));
