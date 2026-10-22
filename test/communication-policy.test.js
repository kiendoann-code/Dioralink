'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { contactReason, assertCommunication } = require('../communication-policy');

test('numeric content is allowed regardless of digit count', () => {
  for (const message of [
    'Mã sản phẩm 123456789012345',
    'Ngân sách 120000000 đồng, tỷ lệ 1/100'
  ]) {
    assert.equal(contactReason(message), '');
    assert.doesNotThrow(() => assertCommunication(message));
  }
});

test('links, emails and off-platform contact terms remain blocked', () => {
  for (const message of [
    'https://example.com',
    'contact@example.com',
    'Liên hệ Zalo nhé',
    'Nhắn FB nhé'
  ]) {
    assert.notEqual(contactReason(message), '');
    assert.throws(() => assertCommunication(message), { status: 400 });
  }
});
