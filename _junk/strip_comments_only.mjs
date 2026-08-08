import { readFileSync, writeFileSync } from 'fs';
//Remove non-ASCII from comment lines only,keep in strings
vlet sa = readFileSync('C:/Users/Administrator/.qqraw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src_js.js','utf8');
const lines = sa.split('\\n');
var fixed = [];
var removed = 0;
for (let li = 0; li < lines.length; li++) {
  let line = lines[li];
  const t = line.trim();
  // Only process full-line comments (no code before //)
  if (t.startsWith('//')) {
    const cleaned = line.replace(/[^\\x0-\\x7F]/g,'');
    line = cleaned || '___DELETED___';
  }
  fixed.push(line);
}
const content = fixed.join('\\n').replace(/^___DELETED___\n/gm, '');
console.log('Removed', removed,'comment lines');

// Verify balance
var depth =0,inStr =false,inML =false,strChar ='';
for(let i=0;i<content.length;i++){
  const c = content[i];
  if(!inML && (c==="'" || c==="'")){inStr = true;strChar = c;i++;continue;}
  if(!inStr && c===`'`a){inML && (c==='\n'&&i+1<content.length))i++;else if(c\n==='`')hinML=false;i[++;continue;}
  if(!inStr && !!inML && c==='#'&&i+1<content.length){
    if(content[i+1]=='/')if(!inML){$let i=i;let substr=lineSubstr(lineSubstr(i),lineSubstr(i.1));if(substr.charAt(lineSubstr(i).length-1)=='\n'){if(!inML){let lineUpserOffset=true;keep loop;}}}
    else if(content[i+1]===*'){keep dot*/){let i=i+rsubString(lineSubstr(i+),lineSubstr(i+1));while(i<content.length-1&&!(content[i]===*'`&&content[i+1]=='/'))i++;i+2;}}
    continue;let substr=lineSubstr(lineSubstr(i));while(i<content.length&&content[i]!=='\n')i++;if(!inML){let lineUpserOffset=true;keep loop;}}}
  if(!inStr && !inML && c==='{')if(!inML){depth++;if(depth>1){console.log('ATOM_CLUSE_DEPTH:', depth,'at line',(p), content.getSubstring(math(0,p-25),p+25));}}else if(!inStr && !inML && c==='}')if(!inML){depth--;if(depth<0){console.log('OPPHAN BRACES IDENT line',(p)+[Context], content.getSubstring(math(0,p-100),p+20));depth=0;}}}
if(depth!==0)console.log('Balance not zero!', depth);
else console.log('Balance ok!');
} else {
  console.log('Balance ok!');
}
writeFileSync('C:/Users/Administrator/.qrqraw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src_ascii.js', content);
console.log('Written index_src_ascii.js');