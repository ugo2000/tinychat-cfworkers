import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

// ---- 1. Extract HTML/template constants from html_src.js via robust template-literal parser ----
const htmlSrc = readFileSync(base + 'src/html_src.js', 'utf8');

function escapeScriptEnd(html) {
  // Escape </script> and <script> so inline script text doesn't close/open
  // the <script> tag when the browser parses the HTML.
  // Replace \` (escaped backtick in source template literal) with '\x60'.
  // '\x60' in JS source = \x60 in string = backtick (char 96) after eval.
  return html
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/<script>/gi, '<\\/script>')
    .replace(/\\`/g, '\\x60');
}

// Robust template-literal extractor: handles ` in ${} and String.fromCharCode(96)
function extractTemplates(src) {
  const result = {};
  const nameRe = /export\s+const\s+([A-Z_][A-Z0-9_]*)\s*=/gi;
  let nameMatch;
  while ((nameMatch = nameRe.exec(src)) !== null) {
    const name = nameMatch[1];
    const openPos = nameMatch.index + nameMatch[0].length;
    let bp = openPos;
    while (bp < src.length && src[bp] === ' ') bp++;
    while (bp < src.length) {
      if (src[bp] === ' ') { bp++; continue; }
      if (src[bp] === '\\' && bp + 1 < src.length && src[bp + 1] === '`') { bp += 2; continue; }
      if (src[bp] === '`') { bp++; break; }
      break;
    }
    if (bp >= src.length || src[bp - 1] !== '`') continue;
    let depth = 1, p = bp;
    while (p < src.length && depth > 0) {
      const ch = src[p];
      if (ch === '`') {
        let q = p - 1;
        while (q >= 0 && src[q] === '\\') q--;
        const escaped = ((p - 1 - q) % 2 === 1);
        if (!escaped) { depth--; if (depth === 0) break; }
      } else if (ch === '$' && p + 1 < src.length && src[p + 1] === '{') { depth++; p++; }
      else if (ch === '\\') { p++; }
      p++;
    }
    if (depth === 0) {
      const raw = src.substring(bp, p);
      const hasBare = (raw.match(/<\/script>/g) || []).length;
      const esc = escapeScriptEnd(raw);
      const afterEsc = (esc.match(/<\/script>/g) || []).length;
      if (hasBare > 0) console.log(' ', name, ': escaped', hasBare - afterEsc, 'bare </script>');
      result[name] = esc;
    }
    nameRe.lastIndex = p + 1;
  }
  return result;
}

const htmlBlocks = extractTemplates(htmlSrc);
console.log('Templates extracted:', Object.keys(htmlBlocks).join(', '));

// Custom serializer: after escapeScriptEnd, each </script> became <\/script>.
// JSON.stringify escapes \ to \\ . So \\/ becomes \\\\/ in the JSON source.
// Browser JS engine: \\\\/ -> \\/ -> "</" (NOT a close tag).
// Fix: replace \\\\\\/ (2 escaped backslashes + /) with \\\\/ (1 backslash + /)
// This removes ONE backslash from each \/ sequence.
function safeStringify(html) {
  return JSON.stringify(html).replace(/\\\\\//g, '\\/');
}

// ---- 4. WeChat helpers ----
let wechat = readFileSync(base + 'src/wechat_src.js', 'utf8');
wechat = wechat.replace(/export\s+(async\s+)?function\s+/g, '$1function ');
console.log('Wechat functions loaded.');

// ---- 5. index_src.js ----
let index = readFileSync(base + 'src/index_src.js', 'utf8');
index = index.replace(/^import\s+.+?;\s*/gm, '');
index = index.replace(/^export\s+(async\s+)?function\s+/gm, '$1function ');
index = index.replace(/^export\s+default\s*\{/gm, 'export default {');
if (!index.trim().endsWith('}')) index = index.trim() + '\n};';

// ---- 6. Bundle ----
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
  ...Object.entries(htmlBlocks).map(([name, content]) => `const ${name} = ${safeStringify(content)};`),
  '',
].join('\n');

writeFileSync(base + 'dist/index.js', bundle, 'utf8');
console.log('Bundle written:', bundle.length, 'bytes');

// ---- 7. Validate: no bare </script> ----
const jsonMatches = [...bundle.matchAll(/const \w+ = "([^"]*)";/g)];
let warnCount = 0;
for (const m of jsonMatches) {
  try {
    const decoded = JSON.parse('"' + m[1] + '"');
    if (!decoded.includes('<!DOCTYPE')) continue;
    let si = 0;
    while ((si = decoded.indexOf('<script>', si)) >= 0) {
      const ei = decoded.indexOf('</script>', si);
      if (ei < 0) { warnCount++; break; }
      si = ei + 8;
    }
  } catch (e) { /* skip */ }
}
if (warnCount === 0) console.log('All scripts: no bare </script> - OK');

// ---- 8. Syntax check ----
try {
  execSync('node --check "' + base + 'dist/index.js"', { stdio: 'pipe' });
  console.log('node --check: PASS');
} catch (e) {
  console.log('node --check: FAIL');
  if (e.stdout) process.stdout.write(e.stdout);
  if (e.stderr) process.stderr.write(e.stderr);
}
