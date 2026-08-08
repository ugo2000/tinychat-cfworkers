import { readFileSync, writeFileSync } from 'fs';

const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
const wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// Fix </script> in both files
htmlSrc = htmlSrc.replace(/<\/script>/gi, '<\\/script>');
let wxClean = wxSrc.replace(/<\/script>/gi, '<\\/script>');
wxClean = wxClean.replace(/^export\s+/gm, '').replace(/^export\s+async\s+/gm, '');
console.log('Bare </script> in html:', (htmlSrc.match(/<\/script>/gi)||[]).length);

// Extract each template by finding its opening ` and matching closing `
// Track depth of template nesting (String.fromCharCode(96)+` is not a real open)
function extractTemplate(src, constName) {
  // Find the start: "const NAME = `" (after the = and space)
  const startMarker = 'const ' + constName + ' = `';
  const startIdx = src.indexOf(startMarker);
  if (startIdx < 0) {
    console.log('NOT FOUND:', constName);
    return '';
  }
  const templateStart = startIdx + startMarker.length; // after the opening `
  
  // Now find the matching closing backtick
  // We track template nesting depth (each ` increments, each ` decrements)
  // BUT: String.fromCharCode(96)+` sequences are NOT real opens
  let depth = 1;
  let i = templateStart;
  let inStr = false; // inside a JS string literal
  let strChar = '';
  
  while (i < src.length && depth > 0) {
    const ch = src[i];
    
    // Track string literals (don't count backticks inside strings)
    if (!inStr && (ch === '"' || ch === "'" || ch === '`')) {
      // But wait - backtick opens a template literal
      // Check if this is String.fromCharCode(96)+`
      const remaining = src.substring(i, i + 22);
      if (remaining.startsWith('String.fromCharCode(96)+`')) {
        // Skip the whole sequence - not a real backtick
        i += 22;
        continue;
      }
      inStr = true;
      strChar = ch;
      depth++;
    } else if (inStr && ch === strChar && (ch !== '`' || src[i-1] !== '$')) {
      // String ends (but ${ inside template literal is different)
      if (ch === strChar) inStr = false;
    } else if (!inStr && ch === '`') {
      // Real template backtick
      depth--;
      if (depth === 0) {
        return src.substring(templateStart, i);
      }
    }
    i++;
  }
  
  console.log('ERROR: unmatched for', constName);
  return '';
}

const tpl = {
  HTML: extractTemplate(htmlSrc, 'HTML'),
  ADMIN_HTML: extractTemplate(htmlSrc, 'ADMIN_HTML'),
  TEST_HTML: extractTemplate(htmlSrc, 'TEST_HTML'),
  ABOUT_HTML: extractTemplate(htmlSrc, 'ABOUT_HTML'),
  PRICING_HTML: extractTemplate(htmlSrc, 'PRICING_HTML'),
};

for (const [k, v] of Object.entries(tpl)) {
  console.log(`${k}: ${v.length} chars`);
  // Count backticks
  const bt = (v.match(/\`/g) || []).length;
  console.log(`  backticks: ${bt} (should be even)`);
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
