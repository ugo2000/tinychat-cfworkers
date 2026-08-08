import { readFileSync, writeFileSync } from 'fs';

const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
let wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// =====================================================================
// STEP 1: Fix </script> -> <\/script> in HTML and wechat
// This prevents CF runtime / esbuild from seeing </script>
// In a JS template literal, <\/script> is literal text that renders correctly
// as </script> in the browser
// =====================================================================
htmlSrc = htmlSrc.replace(/<\/script>/gi, '<\\/script>');
wxSrc = wxSrc.replace(/<\/script>/gi, '<\\/script>');
console.log('After </script> fix:');
console.log('  htmlSrc bare </script>:', (htmlSrc.match(/<\/script>/gi)||[]).length);
console.log('  wxSrc bare </script>:', (wxSrc.match(/<\/script>/gi)||[]).length);

// =====================================================================
// STEP 2: Replace String.fromCharCode(96)+` with real backtick `
// These are workarounds for the </script> problem.
// After step 1, there are NO bare </script> in the source,
// so we can safely convert these back to real backticks.
// =====================================================================
htmlSrc = htmlSrc.replace(/String\.fromCharCode\(96\)\+\x60/g, '\x60');
console.log('\nAfter String.fromCharCode replacement:');
const charCodeCount = (htmlSrc.match(/String\.fromCharCode\(96\)/g)||[]).length;
console.log('  String.fromCharCode(96) remaining:', charCodeCount);

// =====================================================================
// STEP 3: Extract 5 templates using proper backtick counting
// =====================================================================
function extractTemplates(src) {
  const results = {};
  
  // Find each "const NAME = `" and count backticks to find the matching close
  const pattern = /(?:export\s+)?const\s+(HTML|ADMIN_HTML|TEST_HTML|ABOUT_HTML|PRICING_HTML)\s*=\s*`/gm;
  let match;
  
  while ((match = pattern.exec(src)) !== null) {
    const name = match[1];
    const templateStart = match.index + match[0].length;
    let depth = 1;
    let i = templateStart;
    
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '`') {
        depth--;
        if (depth === 0) {
          results[name] = src.substring(templateStart, i);
          break;
        }
      }
      i++;
    }
    
    if (depth > 0) {
      console.log('ERROR: unmatched backticks for', name);
    }
  }
  
  return results;
}

const tpl = extractTemplates(htmlSrc);
for (const [k, v] of Object.entries(tpl)) {
  const bt = (v.match(/\x60/g)||[]).length;
  console.log(`  ${k}: ${v.length} chars, internal backticks: ${bt}`);
}

// =====================================================================
// STEP 4: Escape backticks inside template content
// These would close the outer template literal in the bundle.
// Escaped as \` (template literal escape for backtick)
// =====================================================================
const tplEscaped = {};
for (const [name, content] of Object.entries(tpl)) {
  // Escape backticks and ${ in template content
  const escaped = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const bt = (escaped.match(/`/g)||[]).length;
  if (bt > 0) console.log(`  WARNING: ${name} still has ${bt} backticks after escape`);
  tplEscaped[name] = escaped;
}
console.log('\nAll template backticks escaped.');

// =====================================================================
// STEP 5: Clean wechat (remove export keywords)
// =====================================================================
let wxClean = wxSrc
  .replace(/^export\s+/gm, '')
  .replace(/^export\s+async\s+/gm, '');
console.log('WeChat has export:', /export/.test(wxClean));

// =====================================================================
// STEP 6: Build the final bundle
// =====================================================================
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
  `const HTML = \`${tplEscaped.HTML}\`;`,
  `const ADMIN_HTML = \`${tplEscaped.ADMIN_HTML}\`;`,
  `const TEST_HTML = \`${tplEscaped.TEST_HTML}\`;`,
  `const ABOUT_HTML = \`${tplEscaped.ABOUT_HTML}\`;`,
  `const PRICING_HTML = \`${tplEscaped.PRICING_HTML}\`;`,
].join('\n') + '\n';

bundle = bundle.replace(
  /^export\s+default\s*\{/m,
  htmlDecls + '\nexport default {'
);

// =====================================================================
// STEP 7: Verify
// =====================================================================
const scCount = (bundle.match(/<\/script>/gi)||[]).length;
console.log('\nFinal bundle checks:');
console.log('  Bare </script>:', scCount, '(should be 0)');
console.log('  Size:', bundle.length, 'bytes');
console.log('  Has handlePayApprove:', bundle.includes('handlePayApprove'));
console.log('  Has payPending:', bundle.includes('payPending'));
console.log('  Has uploadQR:', bundle.includes('uploadQR'));

// Count remaining backticks (should only be the outer template delimiters = 10)
const btTotal = (bundle.match(/\x60/g)||[]).length;
console.log('  Total backticks:', btTotal, '(expected: 10 = 5 pairs for 5 templates)');

// =====================================================================
// STEP 8: Write
// =====================================================================
writeFileSync('dist/index.js', bundle);
console.log('\nWritten dist/index.js');

// =====================================================================
// STEP 9: Quick parse test (just check first 2000 chars)
// =====================================================================
const testCode = bundle.replace(/^export\s+default\s*\{[\s\S]*$/m, '').substring(0, 3000);
try {
  new Function(testCode);
  console.log('Parse test: OK');
} catch(e) {
  console.log('Parse test ERROR:', e.message.substring(0, 200));
}
