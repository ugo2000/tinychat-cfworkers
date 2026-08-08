import { readFileSync, writeFileSync } from 'fs';

const idx = readFileSync('src/index.js', 'utf8');
let html = readFileSync('src/html.js', 'utf8');
const wx = readFileSync('src/wechat.js', 'utf8');

// CRITICAL: Strip export declarations from html.js so they don't become top-level statements
// html.js starts with: export const HTML = `...
html = html
  // Main HTML: remove "export const HTML = " but keep the backtick
  .replace(/^export const HTML = /, '')
  // Other templates: remove "export const XXX_HTML = "
  .replace(/^export const ADMIN_HTML = /gm, 'const ADMIN_HTML = ')
  .replace(/^export const TEST_HTML = /gm, 'const TEST_HTML = ')
  .replace(/^export const ABOUT_HTML = /gm, 'const ABOUT_HTML = ')
  .replace(/^export const PRICING_HTML = /gm, 'const PRICING_HTML = ');

// Fix </script> in nested templates
html = html.replace(/<\/script>/g, '</scr${""}ipt>');

// Fix nested template backticks in ABOUT/PRICING (ZH=` and EN=` patterns)
html = html.replace(/const ZH=`/g, 'const ZH=String.fromCharCode(96)+`');
html = html.replace(/const EN=`/g, 'const EN=String.fromCharCode(96)+`');

// Strip export from wechat.js
const wxCode = wx.replace(/^export\s+/gm, '').trim();

// Remove imports from index.js
let bundle = idx
  .replace(/import\s+HTML,\s*\{[^}]*\}\s+from\s+'[^']*html\.js';/, '')
  .replace(/import\s+\{[^}]*\}\s+from\s+'[^']*wechat\.js';/, '');

// Insert wechat after SECRET
bundle = bundle.replace(
  /const SECRET = new TextEncoder\(\)\.encode\([^)]+\);/,
  `const SECRET = new TextEncoder().encode('tinychat-hmac-secret-2026');\n\n// === Wechat Pay Module ===\n${wxCode}`
);

// Append all HTML templates before export default
bundle = bundle.replace(
  /(export default \{)/,
  `// === HTML Templates ===\n${html}\n\n$1`
);

writeFileSync('dist/index.js', bundle);
console.log('Bundle size:', bundle.length);

const s = bundle;
// Verify
const checks = {
  'BAD_WORDS': s.includes('BAD_WORDS'),
  'APP_VERSION': s.includes('APP_VERSION'),
  'const HTML = `': s.includes('const HTML = `'),
  'const ADMIN_HTML = `': s.includes('const ADMIN_HTML = `'),
  'const TEST_HTML = `': s.includes('const TEST_HTML = `'),
  'const ABOUT_HTML = `': s.includes('const ABOUT_HTML = `'),
  'const PRICING_HTML = `': s.includes('const PRICING_HTML = `'),
  'export default {': s.includes('export default {'),
  'isConfigured': s.includes('isConfigured'),
  'wechatUnifiedOrder': s.includes('wechatUnifiedOrder'),
  // Make sure no top-level export from template files
  'export const HTML': s.includes('export const HTML'),
  'export const ADMIN': s.includes('export const ADMIN'),
  'export const TEST': s.includes('export const TEST'),
};
Object.entries(checks).forEach(([k,v]) => console.log(k + ':', v));
