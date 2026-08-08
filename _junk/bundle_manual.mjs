import { readFileSync, writeFileSync } from 'fs';

// Manually bundle: inline html.js and wechat.js into index.js
// Then use wrangler deploy --no-bundle

const idx = readFileSync('src/index.js', 'utf8');
let html = readFileSync('src/html.js', 'utf8');
const wx = readFileSync('src/wechat.js', 'utf8');

// Fix </script> tags in html.js (inline, runtime only)
html = html.replace(/<\/script>/g, '</scr' + 'ipt>');

// Remove imports since we're inlining
let bundle = idx
  .replace(/import\s+HTML,\s*\{[^}]*\}\s+from\s+'\.\/html\.js';/, '')
  .replace(/import\s+\{[^}]*\}\s+from\s+'\.\/wechat\.js';/, '');

// Inline HTML constant
bundle = bundle.replace(
  /import\s+HTML,\s*\{[^}]*\}\s+from\s+'\.\/html\.js';/,
  `const HTML = ${html};`
);

// Actually let's just replace the import with the constant
bundle = `const HTML = ${html};\n` + bundle.replace(
  /import\s+HTML,\s*\{[^}]*\}\s+from\s+'\.\/html\.js';/,
  ''
).replace(
  /import\s+\{[^}]*\}\s+from\s+'\.\/wechat\.js';/,
  ''
);

// Also inline wechat exports at the top
bundle = `// Wechat helpers inlined\n${wx}\n` + bundle;

// Fix the import statement replacements
// We already removed them above, so let's be more surgical

writeFileSync('dist/bundle.js', bundle);
console.log('Bundle size:', bundle.length);
console.log('Has </script>:', bundle.includes('</script>'));
console.log('Has HTML constant:', bundle.includes('const HTML = '));
