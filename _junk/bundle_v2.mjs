import { readFileSync, writeFileSync } from 'fs';

// Strategy: read the ORIGINAL source files and create a PROPER bundle
// Key fix: escape HTML closing tags that would close the outer template literal
// Also fix: keep the outer backticks on the HTML const

// Step 1: Read the backup sources
const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
const wxSrc = readFileSync('src/wechat_src.js', 'utf8');

console.log('index_src.js:', idxSrc.length);
console.log('html_src.js:', htmlSrc.length);
console.log('wechat_src.js:', wxSrc.length);

// Step 2: Fix </script> in html using ZWSP between </scri and pt
// This prevents esbuild/runtime from seeing </script>
const ZWSP = '\u200B';
htmlSrc = htmlSrc.replace(/<\/script>/gi, (m) => {
  return '</scri' + ZWSP + 'pt>';
});
const scriptCount = (htmlSrc.match(/<\/script>/gi) || []).length;
console.log('After ZWSP fix, </script> count:', scriptCount);

// Step 3: Extract the 5 named exports from html.js
// Format: export const HTML = `...`;  or  const HTML = `...`;
function extractExport(src, name) {
  // Try both patterns
  const pattern1 = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\`([\\s\\S]*?)\`;?\\s*`, 'm');
  const pattern2 = new RegExp(`const\\s+${name}\\s*=\\s*\`([\\s\\S]*?)\`;?\\s*`, 'm');
  const m = src.match(pattern1) || src.match(pattern2);
  if (!m) {
    console.log(`WARNING: Could not find ${name}`);
    return null;
  }
  return m[1];
}

const HTML = extractExport(htmlSrc, 'HTML');
const ADMIN_HTML = extractExport(htmlSrc, 'ADMIN_HTML');
const TEST_HTML = extractExport(htmlSrc, 'TEST_HTML');
const ABOUT_HTML = extractExport(htmlSrc, 'ABOUT_HTML');
const PRICING_HTML = extractExport(htmlSrc, 'PRICING_HTML');

console.log('Extracted sizes:', {
  HTML: HTML ? HTML.length : null,
  ADMIN_HTML: ADMIN_HTML ? ADMIN_HTML.length : null,
  TEST_HTML: TEST_HTML ? TEST_HTML.length : null,
  ABOUT_HTML: ABOUT_HTML ? ABOUT_HTML.length : null,
  PRICING_HTML: PRICING_HTML ? PRICING_HTML.length : null
});

// Step 4: Extract WeChat exports
// Remove export keyword
const wxClean = wxSrc.replace(/^export\s+/m, '');

// Step 5: Build the final bundle
// Start with index_src (which has no imports/exports), remove the import lines
let bundle = idxSrc;

// Remove import lines for html and wechat
bundle = bundle.replace(/^import\s+.*?from\s+['"]\.\/html\.js['"];?\s*$/m, '');
bundle = bundle.replace(/^import\s+.*?from\s+['"]\.\/wechat\.js['"];?\s*$/m, '');

// Remove the export default line (we'll add it back properly)
// Actually keep the export default - we need it

// Insert wechat code after SECRET
bundle = bundle.replace(
  /(const\s+SECRET\s*=[\s\S]{1,200}?)(\n\s*const\s+BAD_WORDS)/,
  (m, before, after) => before + '\n' + wxClean + '\n' + after
);

// Now handle the HTML templates
// We need to inject them into the module before export default
// Strategy: add const declarations before export default

// The export default line in index_src.js looks like:
// export default {
//   fetch: ...
// };
// We want to insert HTML const declarations before it

// Find the export default line
const exportDefaultMatch = bundle.match(/^export\s+default\s*\{/m);
if (!exportDefaultMatch) {
  console.log('ERROR: Could not find export default in index_src');
  process.exit(1);
}

// Build HTML const declarations
const htmlDecls = `
const HTML = \`${HTML}\`;
const ADMIN_HTML = \`${ADMIN_HTML}\`;
const TEST_HTML = \`${TEST_HTML}\`;
const ABOUT_HTML = \`${ABOUT_HTML}\`;
const PRICING_HTML = \`${PRICING_HTML}\`;
`;

bundle = bundle.replace(
  /^export\s+default\s*\{/m,
  htmlDecls + '\nexport default {'
);

// Step 6: Escape HTML closing tags inside template literals
// </html>, </body>, </head> in HTML content will close the outer template
// We need to escape these to prevent premature closure
// Use String.fromCharCode to construct them without triggering HTML scanner
bundle = bundle.replace(
  /<\/html>/gi,
  '<\\/html>'
);
bundle = bundle.replace(
  /<\/body>/gi,
  '<\\/body>'
);
bundle = bundle.replace(
  /<\/head>/gi,
  '<\\/head>'
);

console.log('Bundle size:', bundle.length);

// Step 7: Verify no </script> (should be 0 since we used ZWSP)
const sc = (bundle.match(/<\/script>/gi) || []).length;
console.log('</script> count in bundle:', sc);

// Step 8: Write output
writeFileSync('dist/index.js', bundle);
console.log('Written dist/index.js');

// Step 9: Quick parse test
const testBundle = '(function(){' + bundle.replace(/^export\s+default\s*\{[\s\S]*$/m, '') + '})';
try {
  new Function(testBundle);
  console.log('Parse test: OK');
} catch(e) {
  console.log('Parse test ERROR:', e.message.substring(0, 150));
}
