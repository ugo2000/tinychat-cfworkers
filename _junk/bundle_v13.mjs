import { readFileSync, writeFileSync } from 'fs';

const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
let wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// Fix </script> -> <\/script> (prevents CF scanner)
htmlSrc = htmlSrc.replace(/<\/script>/gi, '<\\/script>');
wxSrc = wxSrc.replace(/<\/script>/gi, '<\\/script>');

// Replace String.fromCharCode(96)+` -> ` (undo workaround, get real backticks)
htmlSrc = htmlSrc.replace(/String\.fromCharCode\(96\)\+\x60/g, '\x60');
console.log('String.fromCharCode(96) remaining:', (htmlSrc.match(/String\.fromCharCode\(96\)/g)||[]).length);

// Extract each template by finding opening ` then counting backticks
// Skip String.fromCharCode(96)+` sequences (not real backtick delimiters)
function extractTemplateByCounting(src, name) {
  // Find "const NAME = `" pattern
  const marker = 'const ' + name + ' = ';
  const startMarker = marker + '`';
  const startIdx = src.indexOf(startMarker);
  if (startIdx < 0) { console.log('NOT FOUND:', name); return ''; }
  
  const contentStart = startIdx + startMarker.length; // after opening `
  let depth = 1; // we're inside the template
  let i = contentStart;
  
  while (i < src.length && depth > 0) {
    // Skip String.fromCharCode(96)+` sequences - not real delimiters
    if (src.substring(i, i + 22) === 'String.fromCharCode(96)+`') {
      i += 22;
      continue;
    }
    const ch = src[i];
    if (ch === '`') {
      depth--;
      if (depth === 0) {
        // Found matching closing `
        return src.substring(contentStart, i);
      }
    }
    i++;
  }
  console.log('ERROR: unmatched for', name);
  return '';
}

const tpl = {
  HTML: extractTemplateByCounting(htmlSrc, 'HTML'),
  ADMIN_HTML: extractTemplateByCounting(htmlSrc, 'ADMIN_HTML'),
  TEST_HTML: extractTemplateByCounting(htmlSrc, 'TEST_HTML'),
  ABOUT_HTML: extractTemplateByCounting(htmlSrc, 'ABOUT_HTML'),
  PRICING_HTML: extractTemplateByCounting(htmlSrc, 'PRICING_HTML'),
};
for (const [k, v] of Object.entries(tpl)) {
  console.log(`${k}: ${v.length} chars`);
}

// Escape backticks and ${ in extracted content for bundle injection
// \` and \${ are valid template literal escapes
const tplEscaped = {};
for (const [name, content] of Object.entries(tpl)) {
  tplEscaped[name] = content
    .replace(/\\/g, '\\\\')   // escape backslashes first
    .replace(/`/g, '\\`')     // then backticks
    .replace(/\$\{/g, '\\${'); // then expression starts
}

// Clean wechat exports
let wxClean = wxSrc
  .replace(/^export\s+/gm, '')
  .replace(/^export\s+async\s+/gm, '');
console.log('WeChat export remaining:', /export/.test(wxClean));

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

// Verify
const scCount = (bundle.match(/<\/script>/gi)||[]).length;
const btCount = (bundle.match(/`/g)||[]).length;
console.log('\nBare </script>:', scCount);
console.log('Remaining backticks:', btCount, '(expect 10 = 5 pairs)');
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
console.log(`\nexport default: L${edLine}, const ZH: L${zhLine}, </html>: L${htmlCloseLine}`);

writeFileSync('dist/index.js', bundle);
console.log('\nWritten dist/index.js');
