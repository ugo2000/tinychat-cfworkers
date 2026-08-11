import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const content = readFileSync(base + 'src/html_src.js', 'utf8');
const lines = content.split('\n');

// Check all 5 closing tag lines
const checks = [593, 824, 889, 988, 1112];
for (const lineNum of checks) {
  const line = lines[lineNum - 1];
  console.log('L' + lineNum + ':', JSON.stringify(line));
  const codes = [...line].map(c => c.charCodeAt(0)).join(' ');
  console.log('  codes:', codes);
}

// Check total </script> count
let pos = 0, count = 0;
while ((pos = content.indexOf('</script>', pos)) >= 0) { count++; pos += 9; }
console.log('\nTotal </script> in file:', count);

// Check for &#60;
let pos2 = 0, count2 = 0;
while ((pos2 = content.indexOf('&#60;', pos2)) >= 0) { count2++; pos2 += 5; }
console.log('Total &#60; in file:', count2);

// Check for the broken tag
const broken = (content.match(/<\/scr\$\{""\}ipt>/g) || []).length;
console.log('Broken tag count:', broken);
