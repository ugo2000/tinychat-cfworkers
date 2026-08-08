# ugochat/tinychat 部署修复完成（2026-08-08 12:4x）

## 目标
修复 Cloudflare Worker 打包/部署失败（此前多轮 bundle_v14.mjs + esbuild + CF API 均失败），让新版 ugochat（含 5 页面 + 微信支付 + 配额/购买）上线。

## 根因（3 个独立问题）

1. **`src/html_src.js` 内嵌反引号未转义**（核心问题）
   - ABOUT_HTML/PRICING_HTML 页面内嵌 `<script>`，内含 `const ZH=String.fromCharCode(96)+`...`;` 和 `const EN=...`（8 个内嵌模板字面量反引号）
   - 这些反引号在源文件里是**原始未转义**的，导致外层模板字符串提前闭合 → 文件本身是非法 JS（`node --check` 应报错但之前用 import 测试才暴露）
   - 修复：转义 8 个内嵌反引号（规则：除 `</html>` 前的真实闭合反引号和 `= ` 后的开头反引号外，其余全部 `\`` 转义），恢复自 `src/html.js` 备份
   - 修复后 `import` 成功，5 模板值：HTML 30567 / ADMIN_HTML 12423 / TEST_HTML 2592 / ABOUT_HTML 7238 / PRICING_HTML 6097 字符

2. **`src/index_src.js` 多处 GBK 编码损坏残留**
   - 5 处损坏注释行（中文被替换成 `?` 后与代码合并）：L26 `// ?DODO ?storage ?    if (path === '/api/pay-config') {`、L31 pay-qr、L670 handlePayConfirm、L685 handlePayPending、L707 handlePayQr → 恢复为真正的代码行
   - 7 处损坏字符串引号（`'? }` 未闭合）：L323/L356 QUOTA_EXHAUSTED text、L620/L621 label、L640 error、L661 note、L667 note → 改为英文文案
   - 1 个文件末尾孤儿 `}`（L874）→ 删除
   - 修复后 `node --check` PASS

3. **esbuild/wrangler 的 JSX/HTML 解析器无法处理模板字符串内 HTML**（历史问题）
   - 绕过方案：**不用 esbuild 打包**。用 `build_final.mjs` 手工拼接：
     - HTML 模板用 `JSON.stringify` 嵌入（双引号字符串，无任何反引号/`${}`/模板语法问题，绝对安全）
     - wechat_src.js 去 `export` 关键字 + 生成 5 个别名（wxConfigured/wxCtx/wxOrder/wxDecrypt/wxVerify）
     - index_src.js 去 import 行
   - 部署用 `npx wrangler deploy --no-bundle`（跳过 esbuild 解析）

## 部署结果
- Version ID: `b35994cf-1a7c-475a-b7a4-18090977a068`，Total Upload 97.80 KiB / gzip 22.07 KiB
- `wrangler.toml`: main = "dist/index.js"，DO 绑定 CHAT/ChatRoom，migration new_sqlite_classes

## 验证（e2e_prod.mjs，14/14 PASS）
- 5 页面全部 200：/、/about、/pricing、/admin、/test
- 注册/登录/用户列表/消息列表 API 正常
- 购买 `/api/buy` once → mock 路径 quota=-1 正常；`/api/pay-config` 返回 alipay 二维码配置
- quota API 返回 100 条免费额度
- WS：双客户端连接 → init(onlineUsers) → 群消息广播（带 geo=Shanghai, CN）→ 私信（direction=incoming）全部正常

## 关键文件
- `src/html_src.js` / `src/html.js`：修复后的 HTML 模板源（两者一致）
- `src/index_src.js`：修复后的 Worker 主源码（import 指向 ./html.js、./wechat.js）
- `src/wechat_src.js`：微信支付 v3 helper（7 个 export function）
- `build_final.mjs`：构建脚本（import html_src 取值 → JSON.stringify 嵌入 → 拼 wechat + index → dist/index.js → node --check 自检）
- `dist/index.js`：100111 字节部署产物（已 git 提交）
- `e2e_prod.mjs`：生产回归测试（可复用）
- `_junk/`：全部历史调试脚本（bundle_v*.mjs、check_*.mjs、debug_*.mjs、fix_*.mjs 等 ~150 个）

## 未来修改 HTML 模板的注意事项
- 页面内嵌 `<script>` 里的 backtick 必须写 `\``（转义），否则外层模板提前闭合
- `</script>` 出现在模板值里没问题（JSON.stringify 嵌入后安全）；但若改回模板字面量写法，需写成 `</scr${""}ipt>` 避免 CF 扫描器误判
- 中文注释请用英文或确保 UTF-8 无 BOM 保存；绝不用 PowerShell Set-Content 写 .js

## 遗留
- git 本地已提交（4e69756），GitHub 远端仓库 tinychat-cfworkers 尚未创建/push
- DO 实例：global12（新版 bundle 用 idFromName('global12')）；若旧实例缓存问题再现，改实例名重部署即可
- 微信支付：WECHAT_* secrets 未配置（pay-config 显示 wechatApi:false），alipay 个人二维码已配置
