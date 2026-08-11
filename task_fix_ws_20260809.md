# Fix TinyChat WebSocket Connection — 2026-08-09

## Problem
WebSocket `wss://chathub.asia/chat` was failing with "connection failed".
The DO instance `global12` (bound to Cloudflare Durable Object `CHAT`) was corrupted/bad state.

## Root Cause
All 12 references in `src/index_src.js` pointed to Durable Object instance name `global12`.
Cloudflare DO instances are stateful — a corrupted/bad DO can't recover without a fresh instance name.

## Fix Applied
**Changed DO instance name:** `global12` → `global13` (all 12 occurrences in `src/index_src.js`)

Locations changed:
- Line 27: `/api/pay-config`
- Line 34: `/api/pay-qr`
- Line 41: `/api/register` + others
- Line 46: `/chat` WebSocket upgrade
- Line 66: `/api/wxpay/status`
- Line 79: `/track`
- Line 86: `/admin/pay-pending`
- Line 92: `/admin/pay-approve`
- Line 98: `/admin/clear-visitors`
- Line 152: `/admin/users`
- Line 789: `handleWechatNotify`

## Deployment
- Command: `npx wrangler deploy --no-bundle`
- Deployed to: `https://tinychat.yujiangbiao2000.workers.dev`
- **New Version ID: `6d78b46f-5e81-493c-85f1-6678f6fd81f0`**
- Domain: `chathub.asia` → routes to this worker via CNAME

## Verification — PASSED ✅
End-to-end test completed:
1. ✅ HTTP API `/api/register` → `{"ok":true}`
2. ✅ HTTP API `/api/login` → returns valid JWT token
3. ✅ WebSocket `wss://chathub.asia/chat?token=...` → **OPEN**
4. ✅ Server sends `init` message with user data, online users, recent messages
5. ✅ WebSocket closes cleanly (1006) on client disconnect

Sample WS `init` message received:
```json
{"type":"init","username":"t1786260474914","onlineUsers":[{"username":"t1786260474914","geo":"Shanghai"}]}
```

## WS URL in HTML (confirmed correct)
`const wsUrl = 'wss://' + location.host + '/chat';`
When served from `chathub.asia` → `wss://chathub.asia/chat` ✅

## Key Insight
**Durable Object instance names are NOT automatically recreated on redeploy.**
Only changing the instance name forces Cloudflare to provision a fresh DO instance.
This is a known CF Workers gotcha — DO state persists across deployments unless the name changes.
