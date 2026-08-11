import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

const htmlSrc = readFileSync(join(__dirname, 'src/html_src.js'), 'utf8');

// Find the embedded script content directly from the raw source
// The main HTML template starts with `export const HTML = `<!DOCTYPE`
// We need to find the <script>...</script> inside that template string

// Find position of </script> inside the template string
// We know the template starts around char 20-30 (after 'export const HTML = `')
const templateStart = htmlSrc.indexOf('`<!DOCTYPE');
if (templateStart < 0) { console.log('Cannot find template start'); process.exit(1); }

// Search for </script> within the template (first one is the embedded script end)
const firstScriptEnd = htmlSrc.indexOf('</script>', templateStart);
console.log('First </script> in source at:', firstScriptEnd, '(offset from template start:', firstScriptEnd - templateStart + ')');

if (firstScriptEnd >= 0) {
  // Find the preceding <script>
  const slice = htmlSrc.substring(Math.max(0, firstScriptEnd - 2000), firstScriptEnd);
  const lastScriptTag = slice.lastIndexOf('<script>');
  console.log('Preceding <script> at:', lastScriptTag, 'in slice, absolute:', firstScriptEnd - (slice.length - lastScriptTag));
  const scriptContent = slice.substring(lastScriptTag + 8);
  console.log('Script content preview (last 100 chars):', JSON.stringify(scriptContent.substring(scriptContent.length - 100)));
  
  // Check for any </scr inside the script content
  const bad = scriptContent.indexOf('</scr');
  console.log('</scr inside script:', bad >= 0 ? 'FOUND at ' + bad : 'CLEAN');
  if (bad >= 0) {
    console.log('Context:', JSON.stringify(scriptContent.substring(Math.max(0, bad - 50), bad + 60)));
  }
}

// Also count all </script> in the raw source
let count = 0, pos = templateStart;
while ((pos = htmlSrc.indexOf('</script>', pos)) >= 0) { count++; pos += 9; }
console.log('\nTotal </script> in source from template start:', count);
