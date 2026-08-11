import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
const checks = {
  'APP_VERSION 0715': s.includes('20260810-0715'),
  'TINYCHAT_VER 0715': s.includes("'20260810-0715'"),
  'broadcast(msg) in chat': s.includes('await this.broadcast(msg);'),
  'DM outgoing echo': s.includes("direction: 'outgoing'") && s.includes('else if (a.username === from)'),
  'zh Chinese login': s.includes("loginTitle:'登录'"),
  'zh Chinese buy': s.includes('升级后无限畅聊'),
  'no optimistic addMessage in sendMsg': !s.includes("msg.type = 'random_msg'; msg.to = randomPeer;\n    addMessage"),
  'own-detect message branch': s.includes("msg.username === username ? 'outgoing' : 'incoming'"),
  'leftover import': !/^import .*from/s.test(s),
  'global13 absent': !s.includes('global13'),
  'global12 present': s.includes('global12'),
};
let all = true;
for (const [k, v] of Object.entries(checks)) { console.log((v ? 'PASS' : 'FAIL') + ' ' + k); if (!v) all = false; }
process.exit(all ? 0 : 1);
