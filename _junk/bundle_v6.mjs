import { readFileSync, writeFileSync } from 'fs';

const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
const wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// Step 1: Fix </script> in HTML -> <\/script>
htmlSrc = htmlSrc.replace(/<\/script>/gi, '<\\/script>');
const sc = (htmlSrc.match(/<\/script>/gi) || []).length;
console.log('Bare </script> left:', sc);

// Step 2: Fix </script> in wechat.js too
let wxClean = wxSrc.replace(/<\/script>/gi, '<\\/script>');

// Step 3: Remove ALL export keywords from wechat.js
// Since wechat functions are only called internally in this bundle,
// we don't need the export keywords. Removing them makes the code
// valid in non-ESM (or strict-ESM) contexts.
wxClean = wxClean
  .replace(/^export\s+/gm, '')  // leading export
  .replace(/^export\s+async\s+/gm, '');  // leading export async
console.log('WeChat code has export:', /export/.test(wxClean));

// Step 4: Extract 5 HTML templates
function extractExport(src, name) {
  const pattern = new RegExp(
    `(?:export\\s+)?const\\s+${name}\\s*=\\s*\`([\\s\\S]*?)\`\\s*;?\\s*`,
    'm'
  );
  const m = src.match(pattern);
  return m ? m[1] : '';
}

const tpl = {
  HTML: extractExport(htmlSrc, 'HTML'),
  ADMIN_HTML: extractExport(htmlSrc, 'ADMIN_HTML'),
  TEST_HTML: extractExport(htmlSrc, 'TEST_HTML'),
  ABOUT_HTML: extractExport(htmlSrc, 'ABOUT_HTML'),
  PRICING_HTML: extractExport(htmlSrc, 'PRICING_HTML'),
};
for (const [k, v] of Object.entries(tpl)) {
  console.log(`${k}: ${v.length} chars`);
}

// Step 5: Build bundle
let bundle = idxSrc;

// Remove import statements for html and wechat
bundle = bundle
  .replace(/^import\s+.*?from\s+['"]\.\/html\.js['"];?\s*$/m, '')
  .replace(/^import\s+.*?from\s+['"]\.\/wechat\.js['"];?\s*$/m, '');

// Insert wechat code after SECRET line
bundle = bundle.replace(
  /(const\s+SECRET\s*=\s*new\s+TextEncoder\(\)\.encode\(['"][^'"]+['"]\)[^;]*;)/,
  (m) => m + '\n' + wxClean
);

// Inject HTML template constants before export default
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

// Final check
const finalSc = (bundle.match(/<\/script>/gi) || []).length;
const finalExp = (bundle.match(/\nexport\s+/gm) || []).length;
console.log('Final bare </script>:', finalSc);
console.log('Remaining export keywords:', finalExp);

writeFileSync('dist/index.js', bundle);
console.log('Written dist/index.js', bundle.length, 'bytes');
