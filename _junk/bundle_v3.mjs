import { readFileSync, writeFileSync } from 'fs';

// Strategy: bundle the 3 source files into one self-contained index.js
// Key insight: escape </script> as <\/script> in the HTML content
// - Prevents esbuild/runtime from seeing </script> and closing outer template
// - Browser sees <\/script> in HTML content -> renders as literal text
//   which is treated as invalid tag, script still executes normally

// Step 1: Read original source files
const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
const wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// Step 2: Fix </script> in HTML content -> <\/script>
// This is the KEY fix. In a JS string literal, <\/script> is literal text
// (the backslash doesn't escape anything meaningful). Browser treats
// <\/script> as an invalid/malformed tag (not </script>), so script executes fine.
htmlSrc = htmlSrc.replace(/<\/script>/gi, '<\\/script>');
console.log('</script> after fix:', (htmlSrc.match(/<\/script>/gi) || []).length);

// Step 3: Extract 5 named export template constants from html.js
function extractExport(src, name) {
  // Remove all leading whitespace and find the const declaration
  const pattern = new RegExp(
    `(?:export\\s+)?const\\s+${name}\\s*=\\s*\`([\\s\\S]*?)\`\\s*;?\\s*`,
    'm'
  );
  const m = src.match(pattern);
  if (!m) {
    console.log(`WARNING: ${name} not found`);
    return '';
  }
  return m[1];
}

const HTML = extractExport(htmlSrc, 'HTML');
const ADMIN_HTML = extractExport(htmlSrc, 'ADMIN_HTML');
const TEST_HTML = extractExport(htmlSrc, 'TEST_HTML');
const ABOUT_HTML = extractExport(htmlSrc, 'ABOUT_HTML');
const PRICING_HTML = extractExport(htmlSrc, 'PRICING_HTML');

console.log('Extracted:', {
  HTML: HTML.length,
  ADMIN: ADMIN_HTML.length,
  TEST: TEST_HTML.length,
  ABOUT: ABOUT_HTML.length,
  PRICING: PRICING_HTML.length
});

// Step 4: Clean wechat.js (remove export keyword)
const wxClean = wxSrc.replace(/^export\s+/m, '').trim();

// Step 5: Build the final bundle
let bundle = idxSrc;

// Remove import statements for html and wechat
bundle = bundle
  .replace(/^import\s+.*?from\s+['"]\.\/html\.js['"];?\s*$/m, '')
  .replace(/^import\s+.*?from\s+['"]\.\/wechat\.js['"];?\s*$/m, '');

// Insert wechat code after the SECRET line
bundle = bundle.replace(
  /(const\s+SECRET\s*=\s*new\s+TextEncoder\(\)\.encode\(['"][^'"]+['"]\)[^;]*;)/,
  (m) => m + '\n' + wxClean
);

// Inject HTML template constants before export default
const htmlDecls = [
  `const HTML = \`${HTML}\`;`,
  `const ADMIN_HTML = \`${ADMIN_HTML}\`;`,
  `const TEST_HTML = \`${TEST_HTML}\`;`,
  `const ABOUT_HTML = \`${ABOUT_HTML}\`;`,
  `const PRICING_HTML = \`${PRICING_HTML}\`;`
].join('\n') + '\n';

bundle = bundle.replace(
  /^export\s+default\s*\{/m,
  htmlDecls + '\nexport default {'
);

console.log('Bundle size:', bundle.length);

// Step 6: Verify no bare </script> (escaped versions should be <\/script>)
const scCount = (bundle.match(/<\/script>/gi) || []).length;
console.log('Bare </script> count (should be 0):', scCount);

const escapedCount = (bundle.match(/<\\/script>/gi) || []).length;
console.log('Escaped <\\/script> count:', escapedCount);

// Step 7: Write output
writeFileSync('dist/index.js', bundle);
console.log('Written dist/index.js');

// Step 8: Quick syntax check
const testPart = bundle.replace(/^export\s+default\s*\{[\s\S]*$/m, '');
try {
  new Function(testPart);
  console.log('Parse test: OK');
} catch(e) {
  console.log('Parse test ERROR:', e.message.substring(0, 200));
}
