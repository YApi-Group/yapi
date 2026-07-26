// cross-request MV3 —— 页面 API 层（MAIN world content script）
//
// 在存在 <meta id="cross-request-sign"> 标记的页面（即 YApi 页面）上暴露
// window.crossRequest(options)，通过 window.postMessage 与隔离世界的 relay.js
// 通信。本文件运行在页面主世界，不接触任何扩展 API。
//
// 兼容契约（与旧版 MV2 插件一致，client 侧 common/postmanLib.js 依赖）：
//   - options: { url, method, headers, data, query, timeout, success, error, ... }
//   - success(res.body, res.header, data) / error(res.statusText, res.header, data)
//   - data = { req, res: { id, status, statusText, header, body }, runTime }
//   - 仅 status === 200 走 success，其余（含 2xx 其他码）走 error
//   - 异常（超时/网络错误/扩展无响应）时 res.status 必须保持 undefined，
//     postmanLib 靠 isNaN(status) 判定异常，0 / null 都会被误判为成功
(function () {
  'use strict';

  if (!document.getElementById('cross-request-sign')) return;
  if (typeof window.crossRequest === 'function') return;

  var MSG_REQ = '__crossRequestReq';
  var MSG_RES = '__crossRequestRes';
  var DEFAULT_TIMEOUT = 1000000; // 与旧版一致
  var seq = 0;
  var pending = {};

  window.addEventListener('message', function (event) {
    if (event.source !== window || !event.data) return;
    var msg = event.data;
    if (msg.type !== MSG_RES || !msg.id) return;
    finish(msg.id, msg.res || {});
  });

  function finish(id, res) {
    var entry = pending[id];
    if (!entry) return;
    delete pending[id];
    clearTimeout(entry.timer);
    var data = {
      req: entry.req,
      res: {
        id: id,
        status: res.status,
        statusText: res.statusText,
        header: res.header,
        body: res.body,
      },
      runTime: Date.now() - entry.startTime, // afterScript 会消费 data.runTime
    };
    if (res.status === 200) {
      if (typeof entry.success === 'function') entry.success(res.body, res.header, data);
    } else {
      if (typeof entry.error === 'function') entry.error(res.statusText, res.header, data);
    }
  }

  window.crossRequest = function (options) {
    if (!options) return;
    if (typeof options === 'string') options = { url: options };
    // JSON 往返：剥掉 success/error 等函数字段，只留可序列化数据（等价旧版 encode 行为）
    var req = JSON.parse(JSON.stringify(options));
    var id = 'y-request-' + ++seq;
    pending[id] = {
      req: req,
      success: options.success,
      error: options.error,
      startTime: Date.now(),
      // 兜底：扩展被重载/禁用导致后台永不应答时，不让调用方永远挂起
      timer: setTimeout(function () {
        finish(id, { body: 'Error: cross-request 扩展无响应，请检查扩展状态后刷新页面重试' });
      }, (Number(options.timeout) > 0 ? Number(options.timeout) : DEFAULT_TIMEOUT) + 10000),
    };
    window.postMessage({ type: MSG_REQ, id: id, req: req }, window.location.origin);
  };
})();
