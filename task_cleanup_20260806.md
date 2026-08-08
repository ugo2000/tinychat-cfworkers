# ugochat 临时脚本清理（2026-08-06）

## 目标
清理排查过程中遗留的未跟踪诊断脚本、页面快照、stray 文件，保持项目目录干净。

## 已删除（43 个文件）
- 诊断/校验脚本 `.mjs`：`check_admin*.mjs`(7)、`check_html.mjs`、`check_test.mjs`、`dbg_login.mjs`、`fix_admin_bom*.mjs`(2)、`fix_admin_nl.mjs`、`test_ws.mjs`、`ws_*.mjs`(系列：dm_dbg/dm_dbg2/dm_manual_test/dm_test/geo2/geo_check/geo_test/hiber_test/idle/input_test/members_test/now/quota_test/single/stability/unlim_test)
- 页面快照 `.html`：`page_check/page_fixed/page_fixed2/pg/pgbug/pgdm/pginput/pgm/pgm2/pgm3`
- stray 文件：`-w`（实为 `-w`，长度2）、`console.log('e'`（0字节）

## 保留
- `src/html.js`、`src/index.js`（源文件，含 quota/geo/休眠修复/连接圆点）
- `wrangler.toml`、`public/`（原始 Node 原型）
- `.git`、`.wrangler/`（工具目录）

## git 状态
- `M src/html.js`、`M src/index.js`（功能改动，未提交）
- `D test_ws.mjs`（已从工作区移除，git 仍记录为删除——未提交）
- 所有临时脚本均已不在工作区

## 备注
- 这些临时脚本仅用于本地排查（WS 稳定性、geo、私信、休眠、管理后台 BOM/换行修复、quota），服务端已验证稳定，删除不影响线上。
- 当前线上版本：`43d18823`（含 /test 诊断页、连接状态圆点、快速重连）。
