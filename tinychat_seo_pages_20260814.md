# TinyChat SEO 页面扩充 (2026-08-14)

## 目标
为 chathub.asia 扩充 SEO 友好内页，让搜索引擎更好收录。

## 结果
10个新页面已成功部署，全部 HTTP 200 验证通过：
- `/faq` - 常见问题
- `/features` - 功能介绍
- `/anonymous-chat` - 匿名聊天
- `/random-chat` - 随机聊天
- `/online-chat` - 在线聊天
- `/privacy` - 隐私政策
- `/terms` - 服务条款
- `/safety` - 安全指南
- `/sitemap.xml` - 站点地图
- `/robots.txt` - 爬虫规则

## 根因与教训

**严重事故**：`src/html_src.js` 在上次 `_gen_pages.js` 生成时被损坏。
- 原因：`_gen_pages.js` 用模板字面量写文件时，JavaScript 引擎把文件搞成非标准编码（部分区域字节被破坏）
- 表现：文件 141682 字节（正常应 67570），以 UTF-8 读时 `export` 变 `agen`，`const` 变乱码
- 修复：git checkout 恢复干净版本，重新生成（这次用纯字符串拼接不用模板字面量）

## 技术细节
- `src/html_src.js`：追加 10 个 `export const NAME = \`...\`` 语句（94964 字符原文件 → 94756 字符末尾追加）
- `src/index_src.js`：已有 10 个路由 + import（之前会话已改好，本次未动）
- `build_final.mjs`：重写 regex 提取逻辑，15 个模板全提取（HTML/ADMIN_HTML/TEST_HTML/ABOUT_HTML/PRICING_HTML/SITEMAP_XML/FAQ_HTML/FEATURES_HTML/ANONYMOUS_HTML/RANDOM_HTML/ONLINE_HTML/PRIVACY_HTML/TERMS_HTML/SAFETY_HTML/ROBOTS_TXT）
- Bundle: 149731 bytes, node --check PASS
- 部署: Version `100061fb-3988-439d-a817-21172709fc50`, tinychat.yujiangbiao2000.workers.dev
- 主页: 37201 字节，含 doLogin + TINYCHAT_VER='20260812-1810'，正常
- git commit: `846cc5e`（push 待网络恢复）

## 教训
- PowerShell/Node 写文件时不要在模板字面量里嵌套模板字面量，容易搞坏编码
- 源文件改坏时用 `git checkout HEAD -- src/html_src.js` 恢复
- 用纯字符串拼接写生成脚本比模板字面量更安全
