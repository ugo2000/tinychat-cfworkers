import { readFileSync } from 'fs';
const cred = readFileSync('C:\\Users\\Administrator\\AppData\\Roaming\\xdg.config\\.wrangler\\config\\default.toml', 'utf8');
console.log('=== CREDENTIALS FILE ===');
console.log(cred.substring(0, 200));
console.log('\n=== TOKEN EXTRACTION ===');
const tokenMatch = cred.match(/oauth_token\s*=\s*(.+?)(\n|$)/);
if (tokenMatch) {
  console.log('Token:', tokenMatch[1]);
  console.log('Token length:', tokenMatch[1].trim().length);
}
