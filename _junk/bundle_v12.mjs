import { readFileSync, writeFileSync } from 'fs';

const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
let wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// Escape </script> -> <\/script> in HTML (prevents CF runtime scanner match)
htmlSrc = htmlSrc.replace(/<\/script>/gi, '<\\/script>');
wxSrc = wxSrc.replace(/<\/script>/gi, '<\\/script>');
console.log('htmlSrc </script>:', (htmlSrc.match(/<\/script>/gi)||[]).length);

// Escape template-interrupting chars in htmlSrc BEFORE extracting:
// - Backtick (`) inside templates would close outer template in bundle
// - ${ inside templates would start expression in bundle
// Strategy: escape them as \` and \${ (JS template literal escapes)
// But we must NOT escape backticks that are inside String.fromCharCode() workarounds
// After step 1 above, all bare </script> are gone, so all remaining
// backticks can be safely escaped.

// Escape backticks: replace ` with \` (inside templates)
// We do this carefully - only escape backticks that would cause issues
// For a template literal content: ` -> \`
// This is the standard JS escape for backtick in template literal
htmlSrc = htmlSrc.replace(/`/g, '\\`');
console.log('After backtick escape, backtick count:', (htmlSrc.match(/`/g)||[]).length);

// Escape ${ -> \${ (prevents template expression injection)
htmlSrc = htmlSrc.replace(/\$\{/g, '\\${');
console.log('After ${ escape, ${ count:', (htmlSrc.match(/\$\{/g)||[]).length);

// Clean wechat exports
let wxClean = wxSrc
  .replace(/^export\s+/gm, '')
  .replace(/^export\s+async\s+/gm, '');
console.log('WeChat has export:', /export/.test(wxClean));

// Extract 5 templates using NON-LAZY regex (greedy .*)
// The templates no longer contain backticks or ${ after escaping above,
// so the lazy .*? won't accidentally match across nested templates
function extractByRegex(src, name) {
  // Match from `const NAME = ` to the closing `; (across multiple lines)
  const re = new RegExp(
    `(?:export\\\\s+)?const\\\\s+${name}\\\\s*=\\\\s*\x60([\\\\s\\\\S]*?)\x60\\\\s*;`,
    'm'
  );
  const m = src.match(re);
  if (!m) {
    console.log('NOT FOUND:', name);
    return '';
  }
  return m[1];
}

const tpl = {
  HTML: extractByRegex(htmlSrc, 'HTML'),
  ADMIN_HTML: extractByRegex(htmlSrc, 'ADMIN_HTML'),
  TEST_HTML: extractByRegex(htmlSrc, 'TEST_HTML'),
  ABOUT_HTML: extractByRegex(htmlSrc, 'ABOUT_HTML'),
  PRICING_HTML: extractByRegex(htmlSrc, 'PRICING_HTML'),
};
for (const [k, v] of Object.entries(tpl)) {
  console.log(`${k}: ${v.length} chars`);
}

// Build bundle
let bundle = idxSrc;
bundle = bundle
  .replace(/^import\s+.*?from\s+['"]\.\/html\.js['"];?\s*$/m, '')
  .replace(/^import\s+.*?from\s+['"]\.\/wechat\.js['"];?\s*$/m, '');

bundle = bundle.replace(
  /(const\s+SECRET\s*=\s*new\s+TextEncoder\(\)\.encode\(['"][^'"]+['"]\)[^;]*;)/,
  (m) => m + '\n' + wxClean
);

const htmlDecls = [
  `const HTML = \`${tpl.HTML}\`;`,
  `const ADMIN_HTML = \`${tpl.ADMIN_HTML}\`;`,
  `const TEST_HTML = \`${tpl.TEST_HTML}\`;`,
  `const ABOUT_HTML = \`${tpl.ABOUT_HTML}\`;`,
  `const PRICING_HTML = \`${tpl.PRICING_HTML}\`;`,
].join('\n') + '\n';

bundle = bundle.replace(
  /^export\s+default\s*\{/m,
  htmlDecls + '\nexport default {'
);

// Verify
const scCount = (bundle.match(/<\/script>/gi)||[]).length;
const btCount = (bundle.match(/`/g)||[]).length;
console.log('\nBare </script>:', scCount, '(expected 0)');
console.log('Remaining backticks in bundle:', btCount);
console.log('Bundle size:', bundle.length);
console.log('Has handlePayApprove:', bundle.includes('handlePayApprove'));
console.log('Has payPending:', bundle.includes('payPending'));
console.log('Has uploadQR:', bundle.includes('uploadQR'));

// Key line check
const lines = bundle.split('\n');
let edLine = -1, zhLine = -1, htmlCloseLine = -1;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l === 'export default {') edLine = i + 1;
  if (l === 'const ZH=`;') zhLine = i + 1;
  if (l === '</html>`;') htmlCloseLine = i + 1;
}
console.log(`\nexport default: L${edLine}`);
console.log(`const ZH=`: L${zhLine}`);
console.log(`</html>: L${htmlCloseLine}`);

writeFileSync('dist/index.js', bundle);
console.log('\nWritten dist/index.js');
