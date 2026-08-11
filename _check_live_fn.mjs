import { execSync } from 'child_process';
const html = execSync('curl.exe -s https://chathub.asia/', { encoding: 'utf8' });

const ib = html.indexOf('input-bar');
console.log('input-bar at:', ib);
if (ib >= 0) console.log('input-bar:', JSON.stringify(html.substring(ib, ib + 300)));

const bs = html.indexOf('btnSend');
console.log('btnSend at:', bs);
if (bs >= 0) console.log('btnSend:', JSON.stringify(html.substring(bs - 50, bs + 100)));
else console.log('btnSend NOT FOUND');

const ss = html.indexOf('function sendMsg');
console.log('sendMsg at:', ss);
if (ss >= 0) console.log('sendMsg:', JSON.stringify(html.substring(ss, ss + 400)));

// Show all function definitions
const funcs = ['sendMsg', 'doSend', 'connectWS', 'handleWSMessage', 'addMessage', 'addPrivateMessage', 'doLogin', 'doLogout'];
for (const f of funcs) {
  const pos = html.indexOf('function ' + f);
  console.log(f + ':', pos >= 0 ? 'at ' + pos : 'MISSING');
}
