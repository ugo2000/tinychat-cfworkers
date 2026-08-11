import { execSync, writeFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const base = __dirname.replace(/\\/g, '/') + '/';

const html = execSync('curl.exe -s https://chathub.asia/', { encoding: 'utf8' });
writeFileSync(base + '_front_raw.html', html);
console.log('length:', html.length);
console.log('first 300:', JSON.stringify(html.substring(0, 300)));

// Show the script section
const s = html.indexOf('<script>');
const e = html.indexOf('</script>');
console.log('\nFirst <script> at:', s, 'first </script> at:', e);
if (s >= 0 && e >= 0) {
  const extracted = html.substring(s, e + 9);
  console.log('Extracted (s to e+9):', extracted.length, 'chars');
  console.log('Content:', JSON.stringify(extracted.substring(0, 100)));
}
