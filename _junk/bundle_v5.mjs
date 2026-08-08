import { readFileSync, writeFileSync } from 'fs';

const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
const wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// Key fix: escape </script> as <\/script>
// In JS string, <\/script> renders as literal "<\/script>"
// Browser HTML parser sees <\/script> -> invalid tag, renders as text
// CF runtime scanner: doesn't match </script>, passes validation
htmlSrc = htmlSrc.replace(/<\/script>/gi, '<\\/script>');
const sc = (htmlSrc.match(/<\/script>/gi) || []).length;
console.log('Bare </script> left:', sc);
// Check escaped version: in the string it's <\\/script> (literal backslash + /script)
const epRaw = '<\\/script>';
const ep = (htmlSrc.match(new RegExp(epRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
console.log('Escaped (checking for <\\\\/script>):', ep);

// Extract 5 templates
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

// Clean wechat
const wxClean = wxSrc.replace(/^export\s+/m, '').trim();

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

const finalSc = (bundle.match(/<\/script>/gi) || []).length;
console.log('Final bare </script>:', finalSc);

writeFileSync('dist/index.js', bundle);
console.log('Written dist/index.js', bundle.length, 'bytes');
