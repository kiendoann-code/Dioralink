'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { maintenanceHandler } = require('../maintenance-server');

function request(method, path) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(maintenanceHandler);
    server.listen(0, '127.0.0.1', () => {
      const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method }, res => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => body += chunk);
        res.on('end', () => server.close(() => resolve({ status: res.statusCode, headers: res.headers, body })));
      });
      req.on('error', error => server.close(() => reject(error)));
      req.end();
    });
    server.on('error', reject);
  });
}

test('website displays explicit read-only maintenance page without serving checkout', async () => {
  const { status, headers, body } = await request('GET', '/marketplace');
  assert.equal(status, 503);
  assert.match(headers['content-type'], /text\/html/);
  assert.match(body, /tạm bảo trì/);
  assert.match(body, /không tiếp nhận đơn hàng hoặc giao dịch mới/);
  assert.equal(headers['cache-control'], 'no-store, max-age=0');
  assert.equal(headers['retry-after'], '300');
});

test('health API reports maintenance and financial operations disabled', async () => {
  const { status, body, headers } = await request('GET', '/api/health');
  assert.equal(status, 503);
  assert.match(headers['content-type'], /application\/json/);
  const payload = JSON.parse(body);
  assert.equal(payload.status, 'maintenance');
  assert.equal(payload.transactions_enabled, false);
  assert.equal(payload.data_available, false);
});

test('all write methods return 503 without accepting data', async () => {
  for (const [method, path] of [ ['POST', '/api/wallet/topups'], ['POST', '/api/market/orders'],
    ['PATCH', '/api/commission/requests/123'], ['DELETE', '/api/market/cart/abc'] ]) {
    const { status, body } = await request(method, path);
    assert.equal(status, 503, method + ' ' + path);
    assert.equal(JSON.parse(body).transactions_enabled, false);
  }
});

test('HEAD has no body and no querystring bypass', async () => {
  const { status, body } = await request('HEAD', '/api/health?x=/');
  assert.equal(status, 503);
  assert.equal(body, '');
});
