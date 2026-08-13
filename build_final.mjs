import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

// 1. Import html_src.js via base64 data URL to get template VALUES
const htmlSrc = readFileSync(base + 'src/html_src.js', 'utf8');
const mod = await import('data:text/javascript;base64,' + Buffer.from(htmlSrc).toString('base64'));

// 2. Escape </script> inside script blocks so browser doesn't close the HTML tag
function escapeScriptEnd(html) {
  let result = '';
  let pos = 0;
  while (pos < html.length) {
    const scriptStart = html.indexOf('<script>', pos);
    if (scriptStart < 0) { result += html.substring(pos); break; }
    result += html.substring(pos, scriptStart + '<script>'.length);
    const scriptEnd = html.indexOf('</script>', scriptStart);
    if (scriptEnd < 0) { result += html.substring(scriptStart + '<script>'.length); break; }
    const content = html.substring(scriptStart + '<script>'.length, scriptEnd);
    result += content.replace(/<\/script>/g, '\\x3c/script>');
    result += '</script>';
    pos = scriptEnd + '</script>'.length;
  }
  return result;
}

const fixed = {};
for (const [k, v] of Object.entries(mod)) {
  if (typeof v === 'string' && v.includes('<!DOCTYPE html>')) {
    const before = (v.match(/<\/script>/g) || []).length;
    fixed[k] = escapeScriptEnd(v);
    const after = (fixed[k].match(/<\/script>/g) || []).length;
    if (before !== after) console.log(' ', k, ': escaped', before - after, 'bare </script>');
  }
}
console.log('Templates fixed.');

// 3. Build HTML constants string (JSON-stringified)
const htmlBlocks = Object.entries(fixed)
  .map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`)
  .join('\n');

// 4. Read wechat_src.js: strip "export " prefix from function declarations
let wechat = readFileSync(base + 'src/wechat_src.js', 'utf8');
wechat = wechat.replace(/export\s+(async\s+)?function\s+/g, '$1function ');
console.log('Wechat functions loaded.');

// 5. Read index_src.js, remove import lines
let index = readFileSync(base + 'src/index_src.js', 'utf8');
index = index.replace(/^import\s+.+?;\s*/gm, '');
// Remove "export " before function keywords (ChatRoom class export is KEPT)
index = index.replace(/^export\s+(async\s+)?function\s+/gm, '$1function ');
// KEEP "export default {" and its closing "}" — old build structure that works
index = index.replace(/^export\s+default\s*\{/gm, 'export default {');
// Ensure closing "}" exists at end (source may be missing it)
if (!index.trim().endsWith('}')) index = index.trim() + '\n};';

// 6. Bundle: Worker code FIRST, then HTML constants at the end
const bundle = [
  '// ugochat - bundled',
  '',
  '// ---- WeChat Pay helpers ----',
  wechat,
  '',
  'const wxConfigured = isConfigured;',
  'const wxCtx = buildCtx;',
  'const wxOrder = wechatUnifiedOrder;',
  'const wxDecrypt = decryptResource;',
  'const wxVerify = verifyNotify;',
  '',
  '// ---- Main worker (fetch handler + DO) ----',
  index,
  '',
  '// ---- HTML template constants (at end for file size, not execution order) ----',
  htmlBlocks,
  '',
].join('\n');

writeFileSync(base + 'dist/index.js', bundle, 'utf8');
console.log('Bundle written:', bundle.length, 'bytes');

// 7. Validate: no bare </script> in embedded HTML scripts
const jsonMatches = [...bundle.matchAll(/const \w+ = "([^"]*)";/g)];
let warnCount = 0;
for (const m of jsonMatches) {
  try {
    const decoded = JSON.parse('"' + m[1] + '"');
    if (!decoded.includes('<!DOCTYPE')) continue;
    let si = 0;
    while ((si = decoded.indexOf('<script>', si)) >= 0) {
      const ei = decoded.indexOf('</script>', si);
      if (ei < 0) break;
      const scriptContent = decoded.substring(si + 8, ei);
      if (/<\/script>/.test(scriptContent)) {
        console.log('WARN: bare </script> in', m[0].slice(0, 40));
        warnCount++;
      }
      si = ei + 9;
    }
  } catch(e) {}
}
if (warnCount === 0) console.log('All scripts: no bare </script> - OK');

// 8. node --check
try {
  execSync('node --check "' + base + 'dist/index.js"', { stdio: 'pipe' });
  console.log('node --check: PASS');
} catch (e) {
  console.log('node --check: FAIL');
  console.log(e.stderr ? e.stderr.toString().slice(0, 500) : e.message.slice(0, 300));
}
