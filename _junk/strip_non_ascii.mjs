import { readFileSync, writeFileSync } from 'fs';
// Remove ALL non-ASCII chars from index_src.js, re-bundle with esbuild, test
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
// Remove non-ASCII
let clean = s.replace(/[^\x00-\x7F]/g, '');
console.log('Original length:', s.length, 'Clean length:', clean.length, 'Removed:', s.length - clean.length);
// Check brace balance
let depth=0,inStr=false,inML=false,strChar='';
for(let i=0;i<clean.length;i++){
  const c=clean[i];
  if(inStr){if(c==='\\'&&i+1<clean.length)i++;else if(c===strChar)inStr=false;i++;continue;}
  if(inML){if(c==='\\'&&i+1<clean.length)i++;else if(c===`'){inML=false;}i++;continue;}
  if(c===''`''&&!inStr){inML=!inML;i++;continue;}
  if(c==='"'||c==="'"){inStr=true;strChar=c;i++;continue;}
  if(c==='/'&&i+1<clean.length){
    if(clean[i+1]==='/'){while(i<clean.length&&clean[i]!='\n')i++;continue;}
    if(clean[i+1]==='*'){i+=2;while(i<clean.length-1&&!(clean[i]==='*'&&clean[i+1]==='/'))i++;i++;continue;}
  }
  if(c==='{')depth++;
  else if(c==='}')depth--;
}
console.log('Brace balance:', depth);
if (depth !== 0) process.exit(1);
writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src_ascii.js', clean);
console.log('Written index_src_ascii.js');
