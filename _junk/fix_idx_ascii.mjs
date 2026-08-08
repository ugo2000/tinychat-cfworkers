import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('src/index.js', 'utf8');

// Replace all non-ASCII characters with ASCII equivalents
// Remove Chinese characters and replace with clean English comments
let fixed = s;

// Replace specific known Chinese comment patterns
fixed = fixed.replace(/\/\/ 管理.*/g, '// Admin: forward to DO');
fixed = fixed.replace(/\/\/ 个人.*/g, '// Pay config: forward to DO');
fixed = fixed.replace(/\/\/ 管理员.*/g, '// Admin QR: pwd auth');
fixed = fixed.replace(/\/\/ 个人收款.*/g, '// Pay config: forward to DO');
fixed = fixed.replace(/\/\/ [^\x00-\x7F]+/g, (m) => {
  // Generic: replace any remaining non-ASCII comments
  return '// [comment]';
});

// Check remaining non-ASCII in code (not comments)
const lines = fixed.split('\n');
let issues = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Skip pure comment lines
  if (line.trim().startsWith('//')) continue;
  // Check for non-ASCII chars in non-comment lines
  const nonAscii = line.match(/[^\x00-\x7F]/g);
  if (nonAscii) {
    issues.push({ line: i + 1, chars: nonAscii.slice(0, 3), snippet: line.substring(0, 60) });
  }
}

console.log('Remaining non-ASCII in code (non-comment):', issues.length);
if (issues.length > 0) {
  issues.slice(0, 5).forEach(iss => {
    console.log(`  L${iss.line}: ${JSON.stringify(iss.snippet)}`);
  });
}

writeFileSync('src/index.js', fixed);
console.log('Written. Size:', fixed.length);
console.log('Total non-ASCII remaining:', (fixed.match(/[^\x00-\x7F]/g) || []).length);
