import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// Find the closing </script> of the admin HTML in the bundle
// After ADMIN_HTML = "...", the script tag end appears as <\/script> in JSON
// but let's find raw occurrences in the context
const rawScriptEnd = bundle.indexOf('</script>', bundle.indexOf('const ADMIN_HTML'));
if (rawScriptEnd >= 0) {
  console.log('Raw </script> in bundle at:', rawScriptEnd);
  console.log('Context:', JSON.stringify(bundle.substring(rawScriptEnd - 50, rawScriptEnd + 80)));
}

// Also check HTML page
const rawScriptEnd2 = bundle.indexOf('</script>', bundle.indexOf('const HTML'));
if (rawScriptEnd2 >= 0) {
  console.log('\nHTML page raw </script> at:', rawScriptEnd2);
  console.log('Context:', JSON.stringify(bundle.substring(rawScriptEnd2 - 50, rawScriptEnd2 + 80)));
}

// The ACTUAL admin HTML from bundle (decoded from JSON)
const adminStart = bundle.indexOf('const ADMIN_HTML = "');
const jsonStart = adminStart + 'const ADMIN_HTML = "'.length;
let jsonEnd = jsonStart;
while (jsonEnd < bundle.length) {
  const ch = bundle[jsonEnd];
  if (ch === '\\') { jsonEnd += 2; continue; }
  if (ch === '"') {
    const after = bundle.substring(jsonEnd, jsonEnd + 10);
    if (after.match(/^"(?:\s*;)/)) { jsonEnd++; break; }
  }
  jsonEnd++;
}
const adminJson = bundle.substring(jsonStart, jsonEnd);
const adminHtml = JSON.parse(adminJson);

// Check for bare </script> in the decoded admin HTML (inside script)
const s = adminHtml.indexOf('<script>');
const e = adminHtml.indexOf('</script>');
const script = adminHtml.substring(s + 8, e);
console.log('\nDecoded admin HTML script length:', script.length);
console.log('Script contains bare </scr:', script.includes('</scr'));
// Check what the bundle has around the closing </script>
const adminHtmlJson = JSON.stringify(adminHtml);
const scriptEndInJson = adminHtmlJson.indexOf('<\\/script>');
console.log('In JSON of admin HTML, escaped <\\/script>:', scriptEndInJson);
if (scriptEndInJson >= 0) {
  console.log('JSON context:', JSON.stringify(adminHtmlJson.substring(scriptEndInJson - 30, scriptEndInJson + 50)));
}

// Check the actual HTML closing tag in the bundle
const bundleAdminSection = bundle.substring(jsonStart, jsonEnd + 200);
const closeScriptIdx = bundleAdminSection.lastIndexOf('</script>');
if (closeScriptIdx >= 0 && closeScriptIdx < 500) {
  console.log('\nEarly </script> in bundle admin section:', closeScriptIdx);
  console.log('Context:', JSON.stringify(bundleAdminSection.substring(closeScriptIdx - 20, closeScriptIdx + 50)));
}
