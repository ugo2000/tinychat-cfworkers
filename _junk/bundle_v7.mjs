import { readFileSync, writeFileSync } from 'fs';

const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
const wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// Fix </script> in both files
htmlSrc = htmlSrc.replace(/<\/script>/gi, '<\\/script>');
let wxClean = wxSrc.replace(/<\/script>/gi, '<\\/script>');
wxClean = wxClean.replace(/^export\s+/gm, '').replace(/^export\s+async\s+/gm, '');
console.log('Bare </script>:', (htmlSrc.match(/<\/script>/gi)||[]).length);

// Precise extraction: count backticks to find matching pairs
// Each template literal: opening ` ... content ... closing `
// Nested template literals use String.fromCharCode(96)+` instead of raw `
function countBackticks(s) {
  return (s.match(/\`/g) || []).length;
}

// Extract each named export by finding matching backtick pairs
function extractByBacktickCount(src, name) {
  // Find the declaration line
  const declRe = new RegExp(`(?:export\\\\s+)?const\\\\s+${name}\\\\s*=\\\\s*\\\\``);
  const declMatch = src.match(declRe);
  if (!declMatch) { console.log(`NOT FOUND: ${name}`); return ''; }
  
  const startIdx = declMatch.index + declMatch[0].length; // after opening `
  let depth = 1;
  let i = startIdx;
  
  // Use character-by-character scan to count backticks
  // Track if we're inside a String.fromCharCode(96)+` sequence
  let inCharCodeSeq = false;
  
  while (i < src.length && depth > 0) {
    const ch = src[i];
    const next3 = src.substring(i, i+22);
    
    // Check for String.fromCharCode(96)+`
    if (next3.startsWith('String.fromCharCode(96)+`')) {
      // This is NOT a real backtick - it's char code 96 (backtick) + literal `
      // Don't count it as a template delimiter
      // But we need to skip past the char code sequence to avoid confusion
      i += 22; // skip "String.fromCharCode(96)+`"
      continue;
    }
    
    if (ch === '`') {
      depth--;
      if (depth === 0) {
        // Found matching closing backtick
        return src.substring(startIdx, i);
      }
    }
    i++;
  }
  
  console.log(`WARNING: Could not find closing backtick for ${name}`);
  return '';
}

const tpl = {
  HTML: extractByBacktickCount(htmlSrc, 'HTML'),
  ADMIN_HTML: extractByBacktickCount(htmlSrc, 'ADMIN_HTML'),
  TEST_HTML: extractByBacktickCount(htmlSrc, 'TEST_HTML'),
  ABOUT_HTML: extractByBacktickCount(htmlSrc, 'ABOUT_HTML'),
  PRICING_HTML: extractByBacktickCount(htmlSrc, 'PRICING_HTML'),
};

for (const [k, v] of Object.entries(tpl)) {
  console.log(`${k}: ${v.length} chars (backticks: ${countBackticks(v)})`);
}

// Verify: each should have even number of backticks (pairs)
for (const [k, v] of Object.entries(tpl)) {
  const n = countBackticks(v);
  if (n % 2 !== 0) {
    console.log(`ERROR: ${k} has odd backtick count: ${n}`);
  }
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

const finalSc = (bundle.match(/<\/script>/gi) || []).length;
console.log('Final bare </script>:', finalSc);
console.log('Bundle size:', bundle.length);

writeFileSync('dist/index.js', bundle);
console.log('Written dist/index.js');
