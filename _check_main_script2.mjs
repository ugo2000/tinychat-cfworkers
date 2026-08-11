import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const base = __dirname.replace(/\\/g, '/') + '/';

const htmlSrc = readFileSync(base + 'src/html_src.js', 'utf8');
const tmp = `
const mod = {};
${htmlSrc}
export const { HTML, ADMIN_HTML, TEST_HTML, ABOUT_HTML, PRICING_HTML } = mod;
`;
writeFileSync(base + '_tmp_html.mjs', tmp, 'utf8');
const { HTML } = await import('./_tmp_html.mjs');

const scriptStart = HTML.indexOf('<script>');
const scriptEnd = HTML.indexOf('</script>');
console.log('script start:', scriptStart, ', script end:', scriptEnd);
if (scriptStart >= 0 && scriptEnd >= 0) {
  const script = HTML.substring(scriptStart + 8, scriptEnd);
  console.log('script content length:', script.length);
  const bad = script.indexOf('</scr');
  console.log('</scr inside script:', bad >= 0 ? 'FOUND at ' + bad : 'CLEAN');
  if (bad >= 0) {
    console.log('CTX:', JSON.stringify(script.substring(bad - 30, bad + 60)));
  }
}
