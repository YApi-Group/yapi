// cross-request MV3 —— Service Worker
//
// 职责：
//   1. 接收 relay.js 转来的请求，用 fetch 发起（扩展上下文 + host_permissions，不受 CORS 限制）
//   2. 浏览器禁设头（Cookie/User-Agent/Host/Referer…）经 declarativeNetRequest 会话规则注入，
//      替代 MV2 的 webRequestBlocking
//   3. 用 webRequest 观察模式捕获完整响应头（fetch 的 Headers 读不到 Set-Cookie）
//   4. 请求在途期间用扩展 API 心跳重置空闲计时器，防止 SW 被 30 秒空闲回收
'use strict';

const DEFAULT_TIMEOUT = 1000000; // 与旧版 background.js 的 xhr.timeout 默认值一致

// fetch 规范禁止脚本直接设置的请求头（对齐旧版 unsafeHeader 列表并补全），统一走 DNR 注入
const UNSAFE_HEADERS = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'content-transfer-encoding',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'user-agent',
  'via',
]);

function isUnsafeHeader(name) {
  const n = name.toLowerCase();
  return UNSAFE_HEADERS.has(n) || n.startsWith('proxy-') || n.startsWith('sec-');
}

function formUrlencode(data) {
  return Object.keys(data)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
    .join('&');
}

// ---- 请求规范化（对齐旧版 sendAjax 的语义）----
function normalizeRequest(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  let url = String(src.url || '');
  const method = String(src.method || 'GET').toUpperCase();

  const headers = {};
  for (const name of Object.keys(src.headers || {})) {
    const value = src.headers[name];
    if (value === undefined || value === null) continue;
    headers[name] = String(value);
  }

  // Content-Type 多种大小写写法兼容（旧版语义）
  const ctKey = Object.keys(headers).find(k => k.toLowerCase() === 'content-type');
  const contentType = ctKey ? headers[ctKey] : undefined;

  let body;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    if (ctKey) delete headers[ctKey];
  } else if (!contentType || contentType.startsWith('application/x-www-form-urlencoded')) {
    if (ctKey) delete headers[ctKey];
    headers['Content-Type'] = contentType || 'application/x-www-form-urlencoded';
    body = src.data && typeof src.data === 'object' ? formUrlencode(src.data) : src.data == null ? '' : String(src.data);
  } else if (src.data && typeof src.data === 'object') {
    body = JSON.stringify(src.data);
  } else if (src.data != null) {
    body = String(src.data);
  }

  if (src.query && typeof src.query === 'object' && Object.keys(src.query).length > 0) {
    url += (url.includes('?') ? '&' : '?') + formUrlencode(src.query);
  }

  const safeHeaders = {};
  const unsafeHeaders = [];
  for (const name of Object.keys(headers)) {
    if (isUnsafeHeader(name)) unsafeHeaders.push({ name: name, value: headers[name] });
    else safeHeaders[name] = headers[name];
  }

  const timeout = Number(src.timeout) > 0 ? Number(src.timeout) : DEFAULT_TIMEOUT;
  return { url, method, headers: safeHeaders, unsafeHeaders, body, timeout };
}

// ---- 同 URL 串行化 ----
// DNR 规则与响应头捕获都以「完整 URL」为关联键，同 URL 并发会串号；
// 串行化后每个 URL 同一时刻至多一个在途请求，不同 URL 仍然并发。
const urlQueues = new Map();

function enqueue(url, task) {
  const prev = urlQueues.get(url) || Promise.resolve();
  const run = prev.then(task, task); // 前一个请求失败不阻塞后续
  const chain = run.then(() => {}, () => {});
  urlQueues.set(url, chain);
  chain.then(() => {
    if (urlQueues.get(url) === chain) urlQueues.delete(url);
  });
  return run;
}

// ---- 禁设头注入：每个请求一条临时 DNR 会话规则 ----
// 会话规则存活到浏览器重启，SW 被回收并不清空 —— 启动时先清掉上一世残留的规则
const sessionRulesReady = chrome.declarativeNetRequest
  .getSessionRules()
  .then(rules =>
    rules.length > 0
      ? chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: rules.map(r => r.id) })
      : undefined
  )
  .catch(() => {});

let ruleSeq = 0; // 启动时已清空全部会话规则，进程内自增即可保证唯一

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function withUnsafeHeaders(url, unsafeHeaders, task) {
  if (unsafeHeaders.length === 0) return task();
  await sessionRulesReady;
  const ruleId = ++ruleSeq;
  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [
      {
        id: ruleId,
        action: {
          type: 'modifyHeaders',
          requestHeaders: unsafeHeaders.map(h => ({ header: h.name, operation: 'set', value: h.value })),
        },
        condition: {
          regexFilter: '^' + escapeRegExp(url) + '$',
          // -1 = 不属于任何标签页的请求，即本扩展 SW 自己发起的 fetch，避免误伤页面流量
          tabIds: [-1],
        },
      },
    ],
  });
  try {
    return await task();
  } finally {
    chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] }).catch(() => {});
  }
}

// ---- 完整响应头捕获（含 Set-Cookie）----
// 同 URL 已串行化，先按 URL 认领首跳，之后改用 requestId 跟踪以覆盖重定向后续跳。
const captureByUrl = new Map();
const captureById = new Map();

chrome.webRequest.onHeadersReceived.addListener(
  details => {
    if (details.tabId !== -1) return;
    let entry = captureById.get(details.requestId);
    if (!entry) {
      entry = captureByUrl.get(details.url);
      if (!entry || entry.requestId !== null) return;
      entry.requestId = details.requestId;
      captureById.set(details.requestId, entry);
    }
    entry.responseHeaders = details.responseHeaders || [];
  },
  { urls: ['http://*/*', 'https://*/*'] },
  ['responseHeaders', 'extraHeaders'] // 带 extraHeaders 才能看到 Set-Cookie
);

// ---- 响应头组装（对齐旧版形状：Set-Cookie 聚合为 cookie 数组，该键恒存在）----
function buildHeader(captured, fetchHeaders) {
  const header = { cookie: [] };
  if (captured && captured.length > 0) {
    for (const item of captured) {
      if (item.name.toLowerCase() === 'set-cookie') header.cookie.push(item.value);
      else header[item.name] = item.value;
    }
  } else if (fetchHeaders) {
    // webRequest 未捕获时的兜底（此时拿不到 Set-Cookie）
    for (const [name, value] of fetchHeaders.entries()) {
      header[name] = value;
    }
  }
  return header;
}

// ---- SW 保活：有请求在途时周期性调用扩展 API 重置 30s 空闲计时器（Chrome 116+）----
let inflightCount = 0;
let keepAliveTimer = null;

function beginKeepAlive() {
  if (++inflightCount === 1) {
    keepAliveTimer = setInterval(() => chrome.runtime.getPlatformInfo(), 20 * 1000);
  }
}

function endKeepAlive() {
  if (--inflightCount === 0) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

// ---- 站点访问权限检测 ----
// 用户在 chrome://extensions 里把「站点访问权限」收窄（withheld）后，SW 对未授权主机的
// fetch 会退化为受 CORS 约束的普通请求，通常表现为 Failed to fetch —— 主动给出可操作的提示
async function missingHostPermissionHint(url) {
  try {
    const origin = new URL(url).origin;
    const granted = await chrome.permissions.contains({ origins: [origin + '/*'] });
    return granted
      ? ''
      : '（扩展缺少对 ' + origin + ' 的站点访问权限：请在 chrome://extensions 打开 cross-request 的详情，' +
        '将「站点访问权限」改为「在所有网站上」后重试）';
  } catch (e) {
    return '';
  }
}

// ---- 请求执行 ----
async function doFetch(req) {
  const capture = { requestId: null, responseHeaders: null };
  captureByUrl.set(req.url, capture);
  try {
    return await withUnsafeHeaders(req.url, req.unsafeHeaders, async () => {
      let resp;
      try {
        resp = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body,
          // 与旧版跨域 XHR 一致：不自动携带浏览器 Cookie；用户显式填写的 Cookie 走 DNR 注入
          credentials: 'omit',
          redirect: 'follow',
          signal: AbortSignal.timeout(req.timeout),
        });
      } catch (err) {
        // 契约：异常时不设 status —— postmanLib 靠 isNaN(status) 判定异常，0/null 都会被误判为成功
        if (err && err.name === 'TimeoutError') {
          return { body: 'Error:Request timeout that the time is ' + req.timeout };
        }
        return { body: 'Error:' + ((err && err.message) || String(err)) + (await missingHostPermissionHint(req.url)) };
      }
      const body = await resp.text();
      // 让出一个宏任务，确保 onHeadersReceived 回调已处理完（事件派发与 fetch 完成的先后无保证）
      await new Promise(resolve => setTimeout(resolve, 0));
      return {
        status: resp.status,
        statusText: resp.statusText,
        header: buildHeader(capture.responseHeaders, resp.headers),
        body: body,
      };
    });
  } finally {
    if (captureByUrl.get(req.url) === capture) captureByUrl.delete(req.url);
    if (capture.requestId !== null) captureById.delete(capture.requestId);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'crossRequest') return;
  beginKeepAlive();
  const req = normalizeRequest(msg.req);
  enqueue(req.url, () => doFetch(req))
    .catch(err => ({ body: 'Error:' + ((err && err.message) || String(err)) }))
    .then(res => sendResponse({ res: res }))
    .finally(endKeepAlive);
  return true; // 保持消息通道，异步应答
});
