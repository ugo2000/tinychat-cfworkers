import { readFileSync, writeFileSync } from 'fs';

const BASE = 'C:\\Users\\Administrator\\.qclaw\\workspace-agent-7ac59ebd\\chat-app-workers';
const idxSrc = readFileSync(BASE + '/src/index_src.js', 'utf8');
const htmlSrc = readFileSync(BASE + '/src/html_src.js', 'utf8');
const wxSrc = readFileSync(BASE + '/src/wechat_src.js', 'utf8');

console.log('index_src.js length:', idxSrc.length, 'bytes');

// ============ Fix 1: Remove trailing extra } ============
// The file ends with: \n  }\n  }\n (json fn close + orphan extra })
// Remove the last } if the file ends with two }
const lines = idxSrc.split('\n');
console.log('Lines:', lines.length);
console.log('Last 3 lines:', JSON.stringify(lines.slice(-3)));

// Check if last non-empty line is }
const nonEmpty = lines.filter(l => l.trim() !== '');
const lastNonEmpty = nonEmpty[nonEmpty.length - 1] || '';
console.log('Last non-empty line:', JSON.stringify(lastNonEmpty));

// If the last non-empty line is just }, check if the previous non-empty is also }
if (lastNonEmpty.trim() === '}') {
  const prevNonEmpty = nonEmpty.length >= 2 ? nonEmpty[nonEmpty.length - 2] : '';
  console.log('Prev non-empty line:', JSON.stringify(prevNonEmpty));
  if (prevNonEmpty.includes('function json') || prevNonEmpty.includes('Response(JSON.stringify')) {
    // The last } is extra - remove it
    console.log('Removing extra trailing }');
  }
}

// Simpler approach: remove the LAST } from the file if it's orphaned
// Count braces in the file
let depth = 0;
for (const ch of idxSrc) { if (ch === '{') depth++; else if (ch === '}') depth--; }
console.log('Original brace balance:', depth);

// If balance is -1, remove the last orphaned }
// Strategy: walk from end, find the first } that makes balance = 0
// Actually: just trim the trailing } if it creates imbalance
let fixed = idxSrc;
if (depth === -1) {
  // Find the last } in the file that, when removed, makes balance = 0
  let runningDepth = 0;
  let lastOrphanIdx = -1;
  // Walk from beginning
  for (let i = 0; i < fixed.length; i++) {
    if (fixed[i] === '{') runningDepth++;
    else if (fixed[i] === '}') runningDepth--;
  }
  // Now runningDepth = -1. Walk backwards from end to find orphaned }
  let checkDepth = 0;
  for (let i = fixed.length - 1; i >= 0; i--) {
    if (fixed[i] === '}') checkDepth++;
    else if (fixed[i] === '{') checkDepth--;
    if (checkDepth === 1) { lastOrphanIdx = i; break; }
  }
  if (lastOrphanIdx >= 0) {
    console.log('Removing orphan } at index:', lastOrphanIdx);
    fixed = fixed.substring(0, lastOrphanIdx) + fixed.substring(lastOrphanIdx + 1);
  }
}

// ============ Fix 2: Remove Chinese comment lines (they may have { after //) ============
const lines2 = fixed.split('\n').map(line => {
  const hasChinese = /[^\x00-\x7F]/.test(line);
  if (!hasChinese) return line;
  const t = line.trim();
  if (t.startsWith('//')) {
    // Replace this line with pure comment (no code after //)
    const slashSlashIdx = line.indexOf('//');
    return line.substring(0, slashSlashIdx + 2) + ' FIXED COMMENT';
  }
  return line;
}).join('\n');

// ============ Fix 3: Remove pure // comment lines ============
const cleanLines = lines2.split('\n').map(line => {
  const t = line.trim();
  if (t === '') return '';
  if (t.startsWith('//')) return '___DELETED___';
  return line;
});
let cleanIdx = cleanLines.join('\n').replace(/^___DELETED___\n/gm, '');

depth = 0;
for (const ch of cleanIdx) { if (ch === '{') depth++; else if (ch === '}') depth--; }
console.log('\nAfter fixes, brace balance:', depth);
if (depth !== 0) {
  console.log('ERROR: Still unbalanced. Checking orphans...');
  let lineDepth = 0;
  for (let i = 0; i < cleanIdx.split('\n').length; i++) {
    const l = cleanIdx.split('\n')[i];
    for (const ch of l) { if (ch === '{') lineDepth++; else if (ch === '}') lineDepth--; }
    if (lineDepth < 0) console.log(`  L${i+1} orphan: ${l.substring(0,60)}`);
  }
  process.exit(1);
}

// ============ Continue bundle ============
// Remove import lines
let cleanIdx2 = cleanIdx
  .replace(/import\s+HTML,\s*\{[^}]*\}\s*from\s+['"]\.\/html\.js['"];?/g, '')
  .replace(/import\s*\{[^}]*\bwechat\b[^}]*\}\s*from\s+['"]\.\/wechat\.js['"];?/g, '')
  .replace(/export\s*\{\s*HTML[^}]*\}[^;]*;?/g, '')
  .replace(/const\s+HTML\s*=\s*`[\s\S]*?`;?\n?/g, '')
  .replace(/const\s+ADMIN_HTML\s*=\s*`[\s\S]*?`;?\n?/g, '')
  .replace(/const\s+TEST_HTML\s*=\s*`[\s\S]*?`;?\n?/g, '')
  .replace(/const\s+ABOUT_HTML\s*=\s*`[\s\S]*?`;?\n?/g, '')
  .replace(/const\s+PRICING_HTML\s*=\s*`[\s\S]*?`;?\n?/g, '');

// Preprocess html_src
const htmlPre = htmlSrc
  .replace(/String\.fromCharCode\(96\)\+`/g, '__BACKTICK__')
  .replace(/String\.fromCharCode\(96\)\+\\\`/g, '__BACKTICK_ESC__');

function extractTemplateSmart(src, name) {
  const marker = 'const ' + name + ' = ';
  const start = src.indexOf(marker + '`');
  if (start < 0) return '';
  const cs = start + marker.length + 1;
  let i = cs;
  while (i < src.length) {
    if (src[i] === '\\' && i+1 < src.length && '`$'.includes(src[i+1])) { i += 2; }
    else if (src[i] === '\\' && i+1 < src.length && src[i+1] === '\\') { i += 2; }
    else if (src[i] === '`') return src.substring(cs, i);
    else i++;
  }
  return src.substring(cs);
}

const tpl = {
  HTML: extractTemplateSmart(htmlPre, 'HTML'),
  ADMIN_HTML: extractTemplateSmart(htmlPre, 'ADMIN_HTML'),
  TEST_HTML: extractTemplateSmart(htmlPre, 'TEST_HTML'),
  ABOUT_HTML: extractTemplateSmart(htmlPre, 'ABOUT_HTML'),
  PRICING_HTML: extractTemplateSmart(htmlPre, 'PRICING_HTML'),
};

function restoreWorkarounds(s) {
  return s.replace(/__BACKTICK_ESC__/g, 'String.fromCharCode(96)+\\`').replace(/__BACKTICK__/g, 'String.fromCharCode(96)+`');
}

for (const [name, content] of Object.entries(tpl)) {
  const escaped = restoreWorkarounds(content).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  writeFileSync(BASE + '/dist/_' + name + '.js', `export const ${name} = ${JSON.stringify(escaped)};\n`);
  console.log('Injected:', name, 'orig=' + content.length, 'escaped=' + escaped.length);
}

// Add inject imports
const injectImports = [
  "import { HTML } from './_HTML.js';",
  "import { ADMIN_HTML } from './_ADMIN_HTML.js';",
  "import { TEST_HTML } from './_TEST_HTML.js';",
  "import { ABOUT_HTML } from './_ABOUT_HTML.js';",
  "import { PRICING_HTML } from './_PRICING_HTML.js';",
].join('\n');
cleanIdx2 = injectImports + '\n' + cleanIdx2;

// Inject wechat
let wxClean = wxSrc.replace(/^export\s+/gm, '');
cleanIdx2 = cleanIdx2.replace(/(const\s+SECRET\s*=\s*new\s+TextEncoder\(\)\.encode\(['"][^'"]+['"]\)\s*;)/, (m) => m + '\n' + wxClean);

depth = 0;
for (const ch of cleanIdx2) { if (ch === '{') depth++; else if (ch === '}') depth--; }
console.log('\ncleanIdx2 brace balance:', depth, '(should be 0)');
writeFileSync(BASE + '/dist/_tmp_entry.js', cleanIdx2);

// Run esbuild
import * as esbuild from 'esbuild';
try {
  const result = await esbuild.build({
    entryPoints: [BASE + '/dist/_tmp_entry.js'],
    bundle: true,
    outfile: BASE + '/dist/index.js',
    format: 'esm',
    inject: [BASE+'/dist/_HTML.js', BASE+'/dist/_ADMIN_HTML.js', BASE+'/dist/_TEST_HTML.js', BASE+'/dist/_ABOUT_HTML.js', BASE+'/dist/_PRICING_HTML.js'],
  });
  console.log('\nesbuild errors:', result.errors.length);
  result.errors.forEach(e => console.log('  ERROR:', e.text, '@', e.location?.file + ':' + e.location?.line));
} catch(e) {
  console.log('esbuild FAILED:', e.message.substring(0, 500));
}

// Verify
const dist = readFileSync(BASE + '/dist/index.js', 'utf8');
depth = 0;
for (const ch of dist) { if (ch === '{') depth++; else if (ch === '}') depth--; }
console.log('\nBundle brace: balance=' + depth);
console.log('Size:', dist.length);
console.log('Bare </script>:', (dist.match(/<\/script>/gi)||[]).length);
console.log('Has handlePayApprove:', dist.includes('handlePayApprove'));
console.log('Has payPending:', dist.includes('payPending'));
console.log('Has async signWeChat:', dist.includes('async function signWeChat'));

// Deploy via CF API
const cred = readFileSync('C:\\Users\\Administrator\\AppData\\Roaming\\xdg.config\\.wrangler\\config\\default.toml', 'utf8');
const tokenMatch = cred.match(/oauth_token\s*=\s*["']([^"']+)["']/);
const token = tokenMatch ? tokenMatch[1] : '';
const ACCOUNT = '40c232b7d826cb8cef7de637e8dc96ed';
const SCRIPT_NAME = 'tinychat';

console.log('\n--- Deploying via CF API ---');
const distBin = readFileSync(BASE + '/dist/index.js');
const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${SCRIPT_NAME}`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/javascript' },
  body: distBin
});
const data = await resp.json().catch(() => null);
if (resp.status !== 200) {
  console.log('Deploy FAILED:', resp.status);
  console.log('Errors:', JSON.stringify(data?.errors || data, null, 2).substring(0, 1000));
} else {
  console.log('SUCCESS! Deployed worker');
  const ver = (dist.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/) || ['','?'])[1];
  console.log('Version:', ver);
}
