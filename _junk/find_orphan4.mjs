import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lineMap = [0];
for (let i = 0; i < s.length; i++) if (s[i] === '\n') lineMap.push(i+1);
function lineOf(p) { let lo=0,hi=lineMap.length-1; while(lo<hi){const m=(lo+hi)>>1;if(lineMap[m]<p)lo=m+1;else hi=m;} return lo+1; }
let depth=0,inStr=false,inML=false,strChar='';
for(let i=0;i<s.length;i++){
  const c=s[i];
  if(inStr){if(c==='\\'&&i+1<s.length){i++;}else if(c===strChar){inStr=false;}continue;}
  if(inML){if(c==='\\'&&i+1<s.length){i++;}else if(c==='`'){inML=false;}continue;}
  if(c==='`'&&!inStr){inML=!inML;i++;continue;}
  if(c==='"'||c==="'"){inStr=true;strChar=c;i++;continue;}
  if(c==='/'&&i+1<s.length){
    if(s[i+1]==='/'){while(i<s.length&&s[i]!='\n')i++;continue;}
    if(s[i+1]==='*'){i+=2;while(i<s.length-1&&!(s[i]==='*'&&s[i+1]==='/'))i++;i++;continue;}
  }
  if(c==='{')depth++;
  else if(c==='}'){depth--;if(depth<0)console.log('ORPHAN L'+lineOf(i)+' pos='+i+' ctx:'+JSON.stringify(s.substring(Math.max(0,i-50),i+30)));}
}
console.log('Final:',depth);
