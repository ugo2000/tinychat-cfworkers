import { readFileSync, writeFileSync } from 'fs';

const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
let wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// Step 1: Fix </script> -> <\/script> everywhere
htmlSrc = htmlSrc.replace(/<\/script>/gi, '<\\/script>');
wxSrc = wxSrc.replace(/<\/script>/gi, '<\\/script>');
console.log('</script> in html:', (htmlSrc.match(/<\/script>/gi)||[]).length);

// Step 2: Replace String.fromCharCode(96)+` with real backtick
// These were workarounds - now we can convert them back
htmlSrc = htmlSrc.replace(/String\.fromCharCode\(96\)\+\x60/g, '\x60');
console.log('String.fromCharCode(96) remaining:', (htmlSrc.match(/String\.fromCharCode\(96\)/g)||[]).length);

// Step 3: Parse template boundaries using char-by-char scan
// Track: depth (template nesting), inExpr (inside ${...}), inString
function parseTemplates(src) {
  const results = {};
  let currentName = null;
  let templateStart = -1;
  let depth = 0;
  let inExpr = false;
  let i = 0;

  while (i < src.length) {
    const ch = src[i];
    const next2 = src.substring(i, i + 2);
    const next22 = src.substring(i, i + 22);

    // Check for "const NAME = `"
    if (!currentName && next2 === '`') {
      // Look back for "const NAME = "
      const before = src.substring(Math.max(0, i - 50), i);
      const m = before.match(/const\s+(HTML|ADMIN_HTML|TEST_HTML|ABOUT_HTML|PRICING_HTML)\s*=\s*$/);
      if (m) {
        currentName = m[1];
        templateStart = i;
        depth = 1;
        i++;
        continue;
      }
    }

    // Track template expression
    if (!inExpr && next2 === '${') {
      inExpr = true;
      i += 2;
      continue;
    }
    if (inExpr && ch === '}') {
      inExpr = false;
      i++;
      continue;
    }

    // Only count backticks outside expressions
    if (ch === '`' && !inExpr) {
      depth--;
      if (depth === 0 && currentName) {
        results[currentName] = src.substring(templateStart, i);
        currentName = null;
        templateStart = -1;
      }
    }

    i++;
  }

  return results;
}

const tpl = parseTemplates(htmlSrc);
for (const [k, v] of Object.entries(tpl)) {
  console.log(`${k}: ${v.length} chars`);
}

// Step 4: Escape backticks and ${ inside extracted content
const tplEscaped = {};
for (const [name, content] of Object.entries(tpl)) {
  let escaped = content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
  tplEscaped[name] = escaped;
}

// Step 5: Clean wechat
let wxClean = wxSrc.replace(/^export\s+/gm, '').replace(/^export\s+async\s+/gm, '');

// Step 6: Build bundle
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

// Step 7: Verify
const scCount = (bundle.match(/<\/script>/gi)||[]).length;
console.log('\nBare </script>:', scCount);
console.log('Size:', bundle.length);
console.log('Has handlePayApprove:', bundle.includes('handlePayApprove'));
console.log('Has payPending:', bundle.includes('payPending'));

writeFileSync('dist/index.js', bundle);
console.log('Written dist/index.js');

// Step 8: Verify key sections
const lines = bundle.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export default') || lines[i].includes('const ZH') || lines[i].includes('</html>')) {
    console.log(`L${i+1}: ${lines[i].trim().substring(0,60)}`);
  }
}
