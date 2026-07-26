// cross-request MV3 —— 中转层（隔离世界 content script）
//
// 把主世界 page-api.js 经 window.postMessage 发来的请求转发给 Service Worker
// （chrome.runtime.sendMessage 天然会唤醒休眠的 SW），再把结果回传主世界。
(function () {
  'use strict';

  const MSG_REQ = '__crossRequestReq';
  const MSG_RES = '__crossRequestRes';

  window.addEventListener('message', function (event) {
    if (event.source !== window || !event.data) return;
    const msg = event.data;
    if (msg.type !== MSG_REQ || !msg.id) return;
    // 与 page-api.js 同一道闸门：无 YApi 标记的页面不代理任何请求
    if (!document.getElementById('cross-request-sign')) return;

    const respond = function (res) {
      window.postMessage({ type: MSG_RES, id: msg.id, res: res }, window.location.origin);
    };

    try {
      chrome.runtime.sendMessage({ type: 'crossRequest', req: msg.req }).then(
        function (reply) {
          respond(reply && reply.res ? reply.res : { body: 'Error: 扩展后台返回空响应' });
        },
        function (err) {
          respond({ body: 'Error: ' + ((err && err.message) || err) });
        }
      );
    } catch (err) {
      // 扩展被重载后，旧页面的 chrome.runtime 已失效（Extension context invalidated）
      respond({ body: 'Error: ' + ((err && err.message) || err) + '，请刷新页面后重试' });
    }
  });
}());
