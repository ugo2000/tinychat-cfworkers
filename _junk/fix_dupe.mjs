import { readFileSync, writeFileSync } from 'fs';
const f = 'src/html.js';
let html = readFileSync(f, 'utf8');

// Problem 1: There's an orphaned } between document.addEventListener and function exportCSV
// at line ~1053. Find it: document.addEventListener line, then next line is }
html = html.replace(
  /document\.addEventListener\('click',function\(e\)\{if\(e\.target\.classList\.contains\('approveBtn'\)\)\{approvePay\(e\.target\.dataset\.user,e\.target\.dataset\.pkg\);\}\}\);\n\}/g,
  "document.addEventListener('click',function(e){if(e.target.classList.contains('approveBtn')){approvePay(e.target.dataset.user,e.target.dataset.pkg);}});\n"
);

// Problem 2: There's a duplicate loadPending + eventListener block inside the second 
// ADMIN_HTML instance (the one that's inside the auto-login IIFE).
// Find: loadPending starts inside the IIFE, remove it
// The pattern: async function loadPending followed by eventListener followed by }
// These 2 lines appear twice in the file.
const dup = `async function loadPending(){const area=document.getElementById('pendingArea');try{const r=await fetch('\\/admin\\/pay-pending\\?pwd='\\+encodeURIComponent\\(PWD\\)\\);const d=await r\\.json\\(\\);if\\(!d\\.pending\\)\\{area\\.innerHTML='<span style="font-size:13px;color:#888">加载失败<\\/span>';return;\\}if\\(d\\.pending\\.length===0\\)\\{area\\.innerHTML='<span style="font-size:13px;color:#888">暂无待确认付款<\\/span>';return;\\}const labels=\\{'once':'一次性（¥499）','sub':'月度（¥29\\.9）','sub_year':'年度（¥299）'\\};area\\.innerHTML=d\\.pending\\.map\\(p=>'<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee"><span><b>'\\+esc\\(p\\.username\\)'</b> · '\\+esc\\(labels\\[p\\.pkg\\]\\|\\|p\\.pkg\\)'<br><small style="color:#888">'\\+fmt\\(p\\.ts\\)'<\\/small><\\/span><button class="approveBtn" data-user="'\\+esc\\(p\\.username\\)'" data-pkg="'\\+esc\\(p\\.pkg\\)'">确认开通<\\/button><\\/div>'\\)\\.join\\(''\\);\\}catch\\(e\\)\\{area\\.innerHTML='<span style="font-size:13px;color:#c00">加载失败: '\\+esc\\(e\\.message\\)'<\\/span>';\\}\\}\ndocument\\.addEventListener\\('click',function\\(e\\)\\{if\\(e\\.target\\.classList\\.contains\\('approveBtn'\\)\\{approvePay\\(e\\.target\\.dataset\\.user,e\\.target\\.dataset\\.pkg\\);\\}\\}\\);`;

const dupRegex = new RegExp(
  `async function loadPending\\(\\)\\{const area=document\\.getElementById\\('pendingArea'\\);try\\{const r=await fetch\\('/admin/pay-pending\\?pwd='\\+encodeURIComponent\\(PWD\\)\\);const d=await r\\.json\\(\\);if\\(!d\\.pending\\)\\{area\\.innerHTML='<span style="font-size:13px;color:#888">加载失败<\\/span>';return;\\}if\\(d\\.pending\\.length===0\\)\\{area\\.innerHTML='<span style="font-size:13px;color:#888">暂无待确认付款<\\/span>';return;\\}const labels=\\{'once':'一次性（¥499）','sub':'月度（¥29\\.9）','sub_year':'年度（¥299）'\\};area\\.innerHTML=d\\.pending\\.map\\(p=>'<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee"><span><b>'\\+esc\\(p\\.username\\)'</b> · '\\+esc\\(labels\\[p\\.pkg\\]\\|\\|p\\.pkg\\)'<br><small style="color:#888">'\\+fmt\\(p\\.ts\\)'<\\/small><\\/span><button class="approveBtn" data-user="'\\+esc\\(p\\.username\\)'" data-pkg="'\\+esc\\(p\\.pkg\\)'">确认开通<\\/button><\\/div>'\\)\\.join\\(''\\);\\}catch\\(e\\)\\{area\\.innerHTML='<span style="font-size:13px;color:#c00">加载失败: '\\+esc\\(e\\.message\\)'<\\/span>';\\}\\}\ndocument\\.addEventListener\\('click',function\\(e\\)\\{if\\(e\\.target\\.classList\\.contains\\('approveBtn'\\)\\{approvePay\\(e\\.target\\.dataset\\.user,e\\.target\\.dataset\\.pkg\\);\\}\\}\\);`,
  'g'
);

const matches = html.match(dupRegex);
console.log('Duplicate block matches:', matches ? matches.length : 0);

// Simpler: find all occurrences of the eventListener line
const lines = html.split('\n');
const eventLines = lines.map((l, i) => l.includes("document.addEventListener('click',function(e){if(e.target.classList.contains('approveBtn')") ? i : -1).filter(i => i >= 0);
console.log('Event listener lines:', eventLines);

// Remove the SECOND occurrence
if (eventLines.length >= 2) {
  const secondStart = eventLines[1];
  // Find the loadPending line before it
  let loadPendingLine = secondStart - 1;
  while (loadPendingLine > 0 && !lines[loadPendingLine].includes('async function loadPending()')) loadPendingLine--;
  if (lines[loadPendingLine].includes('async function loadPending()')) {
    console.log(`Removing duplicate at lines ${loadPendingLine+1}-${secondStart+1}`);
    lines.splice(loadPendingLine, secondStart - loadPendingLine + 1);
    html = lines.join('\n');
  }
}

writeFileSync(f, html, 'utf8');
console.log('done');
