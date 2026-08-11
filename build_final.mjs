import { readFileSync, writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

// 1. Import html_src.js to get template VALUES
const htmlSrc = readFileSync(base + 'src/html_src.js', 'utf8');
const mod = await import('data:text/javascript;base64,' + Buffer.from(htmlSrc).toString('base64'));

// 2. Helper: escape </script> inside script blocks to \x3c/script>
// This prevents the browser from seeing </script> in a JS string as HTML tag closer
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

const templates = {
  HTML: mod.HTML,
  ADMIN_HTML: mod.ADMIN_HTML,
  TEST_HTML: mod.TEST_HTML,
  ABOUT_HTML: mod.ABOUT_HTML,
  PRICING_HTML: mod.PRICING_HTML,
};

console.log('Template values:');
for (const [k, v] of Object.entries(templates)) {
  console.log(' ', k, v.length, 'chars');
}

const fixed = {};
let totalReplaced = 0;
for (const [k, v] of Object.entries(templates)) {
  const before = (v.match(/<\/script>/g) || []).length;
  const f = escapeScriptEnd(v);
  const after = (f.match(/<\/script>/g) || []).length;
  fixed[k] = f;
  if (before !== after) console.log(' ', k, ': replaced', before - after, 'occurrences');
  totalReplaced += before - after;
}
console.log('Total replaced:', totalReplaced);

// 3. Read index_src.js, remove import lines (robust: matches import statements regardless of line structure)
let index = readFileSync(base + 'src/index_src.js', 'utf8');
index = index.replace(/import\s+[^;]*from\s+['"][^'"]+['"];\s*/g, '');

// 4. Read wechat_src.js, strip export keywords
let wechat = readFileSync(base + 'src/wechat_src.js', 'utf8');
wechat = wechat.replace(/export\s+(async\s+)?function\s+/g, '$1function ');

// 5. Build final bundle
const bundle = [
  '// ugochat - bundled',
  'const HTML = ' + JSON.stringify(fixed.HTML) + ';',
  'const ADMIN_HTML = ' + JSON.stringify(fixed.ADMIN_HTML) + ';',
  'const TEST_HTML = ' + JSON.stringify(fixed.TEST_HTML) + ';',
  'const ABOUT_HTML = ' + JSON.stringify(fixed.ABOUT_HTML) + ';',
  'const PRICING_HTML = ' + JSON.stringify(fixed.PRICING_HTML) + ';',
  '',
  '// ---- WeChat Pay helpers ----',
  wechat.trim(),
  '',
  'const wxConfigured = isConfigured;',
  'const wxCtx = buildCtx;',
  'const wxOrder = wechatUnifiedOrder;',
  'const wxDecrypt = decryptResource;',
  'const wxVerify = verifyNotify;',
  '',
  '// ---- Main worker ----',
  index.trim(),
  '',
].join('\n');

writeFileSync(base + 'dist/index.js', bundle, 'utf8');
console.log('Bundle written:', bundle.length, 'bytes');

// 6. Validate - check no bare </script> in the bundle's HTML templates
const jsonParts = bundle.match(/const \w+_HTML = "(?:[^"\\]|\\.)*"/g) || [];
let bareCount = 0;
for (const p of jsonParts) {
  const match = p.match(/^const (\w+_HTML) = (.*)$/);
  if (!match) continue;
  const [, name, jsonStr] = match;
  try {
    const decoded = JSON.parse(jsonStr);
    const scripts = [];
    let si = 0;
    while ((si = decoded.indexOf('<script>', si)) >= 0) {
      const ei = decoded.indexOf('</script>', si);
      if (ei < 0) break;
      scripts.push(decoded.substring(si + 8, ei));
      si = ei + 9;
    }
    const bareInScripts = scripts.join('').match(/<\/script>/g);
    if (bareInScripts) {
      console.log('WARN:', name, 'has', bareInScripts.length, 'bare </script> in scripts');
      bareCount += bareInScripts.length;
    }
  } catch(e) {}
}
if (bareCount === 0) console.log('All scripts: no bare </script> - OK');

// 7. node --check
import { execSync } from 'child_process';
try {
  execSync('node --check "' + base + 'dist/index.js"', { stdio: 'pipe' });
  console.log('node --check: PASS');
} catch (e) {
  console.log('node --check: FAIL');
  console.log(e.stderr ? e.stderr.toString() : e.message);
}
