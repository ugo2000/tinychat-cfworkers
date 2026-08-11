import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// Check if HTML templates are stored as JSON strings or JS template literals
// Find where HTML value actually starts in the bundle
const htmlStart = bundle.indexOf('const HTML = ');
if (htmlStart >= 0) {
  console.log('HTML const at:', htmlStart);
  console.log(bundle.substring(htmlStart, htmlStart + 500));
}

// Count script tags in the first 1000 chars after const HTML =
const afterHtml = bundle.substring(htmlStart);
const scriptStarts = (afterHtml.match(/<script>/g) || []).length;
const scriptEnds = (afterHtml.match(/<\/script>/g) || []).length;
console.log('\nIn HTML template (first 1000 chars): <script>:', scriptStarts, '</script>:', scriptEnds);

// Also check the whole bundle for script tags
const allStarts = (bundle.match(/<script>/g) || []).length;
const allEnds = (bundle.match(/<\/script>/g) || []).length;
const allEscaped = (bundle.match(/<\\\/script>/g) || []).length;
const allHexEscaped = (bundle.match(/\\x3c\/script>/g) || []).length;
console.log('\nIn bundle (all): <script>:', allStarts, '</script>:', allEnds, '<\\/script>:', allEscaped, '\\x3c/script>:', allHexEscaped);

// Check for the wechat.js section
const wechatIdx = bundle.indexOf('buildCtx');
if (wechatIdx >= 0) {
  console.log('\nWechat buildCtx at:', wechatIdx);
  console.log(bundle.substring(wechatIdx - 50, wechatIdx + 200));
}
