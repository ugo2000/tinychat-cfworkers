// WeChat Pay v3 helper (pure WebCrypto, ESM, no Node deps)
// 所有密钥从 Cloudflare Secret 注入：
//   WECHAT_MCH_ID      商户号
//   WECHAT_APP_ID      绑定商户的 AppID（公众号/小程序/移动应用）
//   WECHAT_SERIAL      商户 API 证书序列号
//   WECHAT_PRIVATE_KEY 商户 API 私钥（PEM，含 -----BEGIN/END-----）
//   WECHAT_V3_KEY      APIv3 密钥（32 字节，解密回调用）
//   WECHAT_PLATFORM_CERT 微信支付平台证书公钥（PEM，校验回调签名用）
//   WECHAT_NOTIFY_URL  回调地址，如 https://chathub.asia/wechat/notify

function stripPem(pem, tag) {
  if (!pem) return null;
  const m = pem.replace(/\r/g, '').match(new RegExp('-----BEGIN ' + tag + '-----\\s*([\\s\\S]+?)-----END ' + tag + '-----'));
  if (!m) return null;
  return m[1].replace(/\s+/g, '');
}

async function importPrivateKey(pem) {
  const b64 = stripPem(pem, 'PRIVATE KEY') || stripPem(pem, 'RSA PRIVATE KEY');
  if (!b64) throw new Error('bad private key');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

async function importPublicCert(pem) {
  const b64 = stripPem(pem, 'PUBLIC KEY') || stripPem(pem, 'CERTIFICATE');
  if (!b64) throw new Error('bad platform cert');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('spki', der, { name: 'RSASSA-PKCS1-v5', hash: 'SHA-256' }, false, ['verify']);
}

function b64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function buildAuthHeader(ctx, method, urlPath, bodyStr) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const ts = Math.floor(Date.now() / 1000).toString();
  const message = method + '\n' + urlPath + '\n' + ts + '\n' + nonce + '\n' + (bodyStr || '') + '\n';
  return { nonce, ts, message };
}

export async function signWeChat(ctx, method, urlPath, bodyStr) {
  const key = await importPrivateKey(ctx.privateKeyPem);
  const { nonce, ts, message } = buildAuthHeader(ctx, method, urlPath, bodyStr);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(message));
  const sigB64 = b64(sig);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${ctx.mchid}",nonce_str="${nonce}",signature="${sigB64}",timestamp="${ts}",serial_no="${ctx.serial}"`;
}

export async function wechatUnifiedOrder(ctx, { description, outTradeNo, amountYuan, attach }) {
  const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/native';
  const urlPath = '/v3/pay/transactions/native';
  const body = {
    mchid: ctx.mchid,
    appid: ctx.appid,
    description: description,
    out_trade_no: outTradeNo,
    notify_url: ctx.notifyUrl,
    amount: { total: Math.round(amountYuan * 100), currency: 'CNY' }
  };
  if (attach) body.attach = attach;
  const bodyStr = JSON.stringify(body);
  const auth = await signWeChat(ctx, 'POST', urlPath, bodyStr);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: auth },
    body: bodyStr
  });
  const text = await res.text();
  if (!res.ok) throw new Error('unifiedorder failed: ' + res.status + ' ' + text);
  return JSON.parse(text); // { code_url, ... }
}

export function decryptResource(v3key, resource) {
  const key = Uint8Array.from(atob(v3key), c => c.charCodeAt(0));
  if (key.length !== 32) throw new Error('v3 key must be 32 bytes');
  const nonce = Uint8Array.from(atob(resource.nonce), c => c.charCodeAt(0));
  const ad = resource.associated_data ? new TextEncoder().encode(resource.associated_data) : new Uint8Array(0);
  const ct = Uint8Array.from(atob(resource.ciphertext), c => c.charCodeAt(0));
  const tag = ct.slice(ct.length - 16);
  const data = ct.slice(0, ct.length - 16);
  const alg = { name: 'AES-GCM', iv: nonce, additionalData: ad, tagLength: 128 };
  // WebCrypto AES-GCM needs tag appended to data
  const combined = new Uint8Array(data.length + 16);
  combined.set(data); combined.set(tag, data.length);
  return crypto.subtle.decrypt(alg, { usages: [] }, key, combined).then(buf => {
    const json = new TextDecoder().decode(buf);
    return JSON.parse(json);
  });
}

export async function verifyNotify(ctx, timestamp, nonce, bodyStr, sigB64) {
  if (!ctx.platformCertPem) return false; // 未配置平台证书则不校验（仅解密）
  try {
    const cert = await importPublicCert(ctx.platformCertPem);
    const message = timestamp + '\n' + nonce + '\n' + bodyStr + '\n';
    const sig = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cert, sig, new TextEncoder().encode(message));
  } catch (e) { return false; }
}

export function isConfigured(env) {
  return !!(env.WECHAT_MCH_ID && env.WECHAT_APP_ID && env.WECHAT_SERIAL && env.WECHAT_PRIVATE_KEY && env.WECHAT_V3_KEY && env.WECHAT_NOTIFY_URL);
}

export function buildCtx(env) {
  return {
    mchid: env.WECHAT_MCH_ID,
    appid: env.WECHAT_APP_ID,
    serial: env.WECHAT_SERIAL,
    privateKeyPem: env.WECHAT_PRIVATE_KEY,
    v3key: env.WECHAT_V3_KEY,
    platformCertPem: env.WECHAT_PLATFORM_CERT,
    notifyUrl: env.WECHAT_NOTIFY_URL
  };
}
