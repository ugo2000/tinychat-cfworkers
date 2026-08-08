import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');

// Count occurrences of key markers
const markers = [
  'const HTML = ',
  'export default',
  'export default {',
  'WORKER ENTRY',
  'WECHAT PAY',
  'HTML Templates',
  'String.fromCharCode(96)',
  '<!DOCTYPE html>',
];
markers.forEach(m => {
  const cnt = (s.match(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) || []).length;
  console.log(`${m}: ${cnt}`);
});

console.log('\nFirst occurrence of const HTML:');
const idx = s.indexOf('const HTML = ');
console.log(JSON.stringify(s.substring(idx, idx + 50)));

// Find all export default lines
const lines = s.split('\n');
lines.forEach((l, i) => { if (l.includes('export default')) console.log(`L${i+1}: ${l.trim()}`); });
