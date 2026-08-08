import { readFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
// Show exact chars 30650-30700 as raw chars
const chunk = s.substring(30650, 30700);
console.log('Chars at 30650-30700:');
for (let i = 0; i < chunk.length; i++) {
  const c = chunk[i];
  const code = chunk.charCodeAt(i);
  if (code < 32 && code !== 10) process.stdout.write(`\\x${code.toString(16).padStart(2,'0')}`);
  else process.stdout.write(c);
}
console.log('\n---');
// Show hex
const buf = Buffer.from(chunk, 'utf8');
console.log('Hex:', buf.toString('hex'));
