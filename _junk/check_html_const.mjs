import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
const idx = s.indexOf('const HTML');
console.log('Found at:', idx);
console.log('Snippet:', JSON.stringify(s.substring(idx, idx + 50)));
console.log('Starts with backtick:', s.substring(idx + 'const HTML = '.length, idx + 'const HTML = '.length + 1) === '`');
