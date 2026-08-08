import { readFileSync, writeFileSync } from 'fs';

const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
let wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// Step 1: Fix </script> -> <\/script>
htmlSrc = htmlSrc.replace(/<\/script>/gi, '<\\/script>');
wxSrc = wxSrc.replace(/<\/script>/gi, '<\\/script>');

// Step 2: Replace String.fromCharCode(96)+` with real backtick
htmlSrc = htmlSrc.replace(/String\.fromCharCode\(96\)\+\x60/g, '\x60');

// Step 3: Extract templates with proper state machine
// State machine tracks: outerDepth (template backtick nesting), inExpr, exprDepth
function extractTemplates(src) {
  const results = {};
  const names = ['HTML', 'ADMIN_HTML', 'TEST_HTML', 'ABOUT_HTML', 'PRICING_HTML'];
  let nameIdx = 0;
  let templateStart = -1;
  let outerDepth = 0;   // tracks depth of template literals
  let inExpr = false;   // inside ${...}
  let exprDepth = 0;    // nesting inside ${...}

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const ch2 = src[i] + (src[i+1] || '');
    const ch3 = src[i] + (src[i+1] || '') + (src[i+2] || '');

    // Look for "const NAME = `"
    if (outerDepth === 0 && !inExpr && nameIdx < names.length) {
      const name = names[nameIdx];
      const marker = 'const ' + name + ' = ';
      if (src.substring(i, i + marker.length) === marker && src[i + marker.length] === '`') {
        templateStart = i + marker.length + 1; // after opening `
        outerDepth = 1;
        i += marker.length; // skip past "const HTML = `"
        continue;
      }
    }

    // Inside outer template (outerDepth >= 1, inExpr is for tracking inside ${...})
    if (outerDepth >= 1) {
      if (inExpr) {
        // We're inside ${...} in an outer template
        if (ch3 === '${') {
          exprDepth++;
        } else if (ch === '}') {
          exprDepth--;
          if (exprDepth === 0) inExpr = false;
        }
      } else {
        // We're in the outer template, not inside ${...}
        if (ch3 === '${') {
          // Start of expression
          inExpr = true;
          exprDepth = 1;
        } else if (ch === '`') {
          // Backtick in outer template - could be nested template literal or close
          // Count how many consecutive backticks
          let btCount = 0;
          let j = i;
          while (j < src.length && src[j] === '`') { btCount++; j++; }
          // In a template literal: `` is one literal backtick, ``` is empty string then template
          // Our templates have no nested templates (no raw ${`...`}) so:
          // - odd number of consecutive backticks -> net close opens new nested
          // - even number -> net effect = 0 (closes and reopens)
          // Simple approach: toggle depth by btCount % 2
          outerDepth += (btCount % 2);
          i += btCount - 1;
          if (outerDepth === 0) {
            // Template closed
            results[names[nameIdx]] = src.substring(templateStart, i - btCount);
            nameIdx++;
            templateStart = -1;
          }
        }
      }
    }
  }
  return results;
}

const tpl = extractTemplates(htmlSrc);
let totalSize = 0;
for (const [k, v] of Object.entries(tpl)) {
  totalSize += v.length;
  console.log(`${k}: ${v.length} chars`);
}
console.log(`Total: ${totalSize}`);

// Step 4: Escape backticks and ${ in extracted content
const tplEscaped = {};
for (const [name, content] of Object.entries(tpl)) {
  let e = content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
  tplEscaped[name] = e;
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
console.log('Has uploadQR:', bundle.includes('uploadQR'));

// Step 8: Key section check
const lines = bundle.split('\n');
let exportDefaultLine = -1;
let zhLine = -1;
let htmlCloseLine = -1;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l === 'export default {') exportDefaultLine = i + 1;
  if (l === 'const ZH=`;') zhLine = i + 1;
  if (l === '</html>`;') htmlCloseLine = i + 1;
}
console.log(`\nexport default at L${exportDefaultLine}`);
console.log(`const ZH= at L${zhLine}`);
console.log(`</html>\`; at L${htmlCloseLine}`);
if (exportDefaultLine < zhLine) {
  console.log('ERROR: export default before ZH= -- templates in wrong order!');
}

writeFileSync('dist/index.js', bundle);
console.log('\nWritten dist/index.js');
