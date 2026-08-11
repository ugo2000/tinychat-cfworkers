import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

function extractFirstJson(bundle, constName) {
  const start = bundle.indexOf('const ' + constName + ' = "');
  if (start < 0) return null;
  let pos = start + ('const ' + constName + ' = "').length;
  let depth = 0;
  while (pos < bundle.length) {
    if (bundle[pos] === '\\') { pos += 2; continue; }
    if (bundle[pos] === '"') {
      const after = bundle.substring(pos, pos + 5);
      if (after.match(/^"[;,\n]/)) { return bundle.substring(start + ('const ' + constName + ' = ').length, pos + 1); }
    }
    pos++;
  }
  return null;
}

function checkPage(name, jsonSlice) {
  const html = JSON.parse(jsonSlice);
  const s = html.indexOf('<script>');
  const e = html.indexOf('</script>');
  const script = html.substring(s + 8, e);
  const escaped = (script.match(/\\x3c\/script>/g) || []).length;
  const rawBare = (script.match(/<\/script>/g) || []).length;
  console.log(name + ': script len=' + script.length, 'escaped=' + escaped, 'rawBare=' + rawBare);
  try {
    new Function(script);
    console.log('  new Function: OK');
  } catch(err) {
    console.log('  new Function ERROR:', err.message);
  }
}

const adminJson = extractFirstJson(bundle, 'ADMIN_HTML');
if (adminJson) checkPage('ADMIN', adminJson);

const htmlJson = extractFirstJson(bundle, 'HTML');
if (htmlJson) checkPage('HTML', htmlJson);
