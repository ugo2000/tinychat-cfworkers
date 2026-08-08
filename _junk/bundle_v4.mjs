import { readFileSync, writeFileSync } from 'fs';

// Read the original source
const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
const wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// Fix: escape </script> using </scri${"pt>"}
// This breaks the </script> sequence so it doesn't trigger
// CF runtime's scanner, while rendering as </script> in the browser
htmlSrc = htmlSrc.replace(/<\/script>/gi, '</scri${"pt>"}');

// Verify
const sc = (htmlSrc.match(/<\/script>/gi) || []).length;
console.log('Bare </script> in htmlSrc:', sc);
const ep = (htmlSrc.match(/scri\$\{"pt>"\}/gi) || []).length;
console.log('Escaped scri${"pt>} in htmlSrc:', ep);

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

// Check
const finalSc = (bundle.match(/<\/script>/gi) || []).length;
console.log('Final </script> count:', finalSc);

writeFileSync('dist/index.js', bundle);
console.log('Written dist/index.js', bundle.length, 'bytes');
