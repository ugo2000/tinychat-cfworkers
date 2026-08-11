import { execSync } from 'child_process';
const admin = execSync('curl.exe -s https://chathub.asia/admin', { encoding: 'utf8' });
const s = admin.indexOf('<script>');
const e = admin.indexOf("</scr'+'ipt>");
const script = admin.substring(s + 8, e);
const lines = script.split('\n');
console.log('Lines 82-92:');
for (let i = 81; i < 92; i++) {
  console.log('Line', i+1, ':', JSON.stringify(lines[i]));
}
console.log('\nAll lines with } or { or }; :');
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t === '}' || t === '{' || t === '};') console.log('Line', i+1, ':', JSON.stringify(t));
}
