'use strict';
const http = require('node:http');

const PAGE = "<!doctype html>\n<html lang=\"vi\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>DioraLink — Tạm bảo trì</title><style>\n:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f2faf9;color:#173c4a;font:16px/1.65 system-ui,-apple-system,Segoe UI,sans-serif}main{width:min(92vw,570px);padding:46px 38px;border:1px solid #c8e7e4;border-radius:20px;background:#fff;box-shadow:0 20px 70px #1d777014;text-align:center}h1{margin:12px 0;font-size:clamp(24px,5vw,32px);line-height:1.25}p{margin:16px 0 0;color:#466674}.mark{font-size:25px;font-weight:800;color:#168d83;letter-spacing:-1px}.note{margin-top:24px;padding:13px;border-radius:10px;background:#edf9f7;color:#225d60;font-size:14px}small{display:block;margin-top:24px;color:#6d8b93}\n</style></head><body><main><div class=\"mark\">DioraLink</div><h1>Nền tảng đang tạm bảo trì</h1><p>Chúng tôi đang khôi phục kết nối dữ liệu. Đăng nhập, đơn hàng, commission và Ví Diora tạm thời không khả dụng.</p><div class=\"note\">Để bảo vệ dữ liệu, hệ thống không tiếp nhận đơn hàng hoặc giao dịch mới trong thời gian này.</div><small>Connecting Creative Worlds</small></main></body></html>";

function maintenanceHandler(req, res) {
  const pathname = String(req.url || '/').split('?')[0];
  const api = pathname === '/api' || pathname.startsWith('/api/');
  res.statusCode = 503;
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Retry-After', '300');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', api ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8');
  if (req.method === 'HEAD') return res.end();
  res.end(api ? JSON.stringify({ status: 'maintenance', data_available: false, transactions_enabled: false,
    message: 'DioraLink đang bảo trì kết nối dữ liệu. Không tiếp nhận giao dịch mới.' }) : PAGE);
}

function startMaintenanceServer(port) {
  const server = http.createServer(maintenanceHandler);
  server.listen(port, '0.0.0.0', () => {
    console.error('DioraLink read-only maintenance mode: database unavailable, financial operations disabled.');
  });
  return server;
}

module.exports = { maintenanceHandler, startMaintenanceServer };
