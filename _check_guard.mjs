import { readFileSync } from 'fs';
const script = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/_home_script.js', 'utf8');

// Show version guard logic
const vg = script.indexOf('tinychat_version');
console.log('=== version guard area ===');
if (vg >= 0) {
  console.log(script.substring(Math.max(0, vg - 300), vg + 500));
} else {
  console.log('NOT FOUND');
}

// Show init IIFE fully
const ii = script.indexOf('(function init');
console.log('\n=== init IIFE ===');
console.log(script.substring(ii, ii + 800));

// Show applyI18n and t() - i18n could break everything if lang missing
const tfn = script.indexOf('function t(');
console.log('\n=== t() ===');
console.log(script.substring(tfn, tfn + 400));

const ai = script.indexOf('function applyI18n');
console.log('\n=== applyI18n ===');
console.log(script.substring(ai, ai + 600));
